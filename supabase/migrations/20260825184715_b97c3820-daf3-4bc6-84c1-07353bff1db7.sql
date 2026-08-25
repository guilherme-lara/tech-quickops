CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_empresa_id UUID;
  v_nome TEXT;
  v_empresa TEXT;
  v_role TEXT;
  v_provided_empresa_id UUID;
  v_cnpj TEXT;
  v_telefone TEXT;
  v_actor UUID := auth.uid();
  v_actor_role public.app_role;
  v_actor_empresa UUID;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email);
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  v_empresa := COALESCE(NEW.raw_user_meta_data->>'nome_empresa', 'Minha Empresa');
  v_cnpj := NEW.raw_user_meta_data->>'cnpj';
  v_telefone := NEW.raw_user_meta_data->>'telefone_empresa';
  v_provided_empresa_id := NULLIF(NEW.raw_user_meta_data->>'empresa_id','')::UUID;

  IF v_actor IS NOT NULL THEN
    SELECT role, empresa_id INTO v_actor_role, v_actor_empresa
      FROM public.perfis WHERE id = v_actor;
  END IF;

  -- Fluxos internos autenticados (RPCs de criação de técnico / backoffice).
  -- Gestor/admin/superadmin podem criar qualquer papel interno.
  -- Analista só pode originar contas de técnico.
  IF v_provided_empresa_id IS NOT NULL
     AND v_actor_role IS NOT NULL
     AND (
          (v_actor_role IN ('gestor','admin','superadmin') AND v_role IN ('gestor','admin','analista','tecnico'))
          OR (v_actor_role = 'analista' AND v_role = 'tecnico')
         )
     AND (v_actor_role = 'superadmin' OR v_actor_empresa = v_provided_empresa_id)
  THEN
    INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
    VALUES (NEW.id, v_provided_empresa_id, v_nome, v_role::app_role)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Segurança: se há um ator autenticado mas ele não tem permissão para
  -- vincular a empresa informada, bloqueia em vez de criar empresa fantasma.
  IF v_actor IS NOT NULL AND v_provided_empresa_id IS NOT NULL THEN
    RAISE EXCEPTION 'Acesso negado: não é permitido criar usuários para esta empresa.' USING ERRCODE = '42501';
  END IF;

  -- Auto-cadastro público: sempre cria uma NOVA empresa e o usuário é admin dela.
  INSERT INTO public.empresas (nome_fantasia, cnpj, telefone_empresa, data_vencimento)
  VALUES (v_empresa, v_cnpj, v_telefone, now() + interval '14 days')
  RETURNING id INTO new_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
  VALUES (NEW.id, new_empresa_id, v_nome, 'admin')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;