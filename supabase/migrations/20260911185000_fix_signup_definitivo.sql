-- Adiciona a coluna email na tabela perfis, caso ainda não exista
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS email text;

-- Restaura a versão simples e segura da trigger handle_new_user, 
-- evitando problemas de lock de sequence e mantendo o suporte ao dominio e email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  new_empresa_id uuid;
  v_nome text;
  v_empresa text;
  v_role text;
  v_provided_empresa_id uuid;
  v_cnpj text;
  v_telefone text;
  v_dominio text;
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_actor_empresa uuid;
BEGIN
  v_nome := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome_completo'), ''), NEW.email);
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'admin');
  v_empresa := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome_empresa'), ''), 'Minha Empresa');
  v_cnpj := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g'), '');
  v_telefone := NULLIF(trim(NEW.raw_user_meta_data->>'telefone_empresa'), '');
  v_dominio := NULLIF(lower(trim(NEW.raw_user_meta_data->>'dominio')), '');
  v_provided_empresa_id := NULLIF(NEW.raw_user_meta_data->>'empresa_id', '')::uuid;

  IF v_actor IS NOT NULL THEN
    SELECT role, empresa_id
      INTO v_actor_role, v_actor_empresa
      FROM public.perfis
     WHERE id = v_actor;
  END IF;

  -- Se for um fluxo interno (gestor criando outro usuário na mesma empresa)
  IF v_provided_empresa_id IS NOT NULL
     AND v_actor_role IS NOT NULL
     AND (
       (v_actor_role IN ('gestor', 'admin', 'superadmin') AND v_role IN ('gestor', 'admin', 'analista', 'tecnico'))
       OR (v_actor_role = 'analista' AND v_role = 'tecnico')
     )
     AND (v_actor_role = 'superadmin' OR v_actor_empresa = v_provided_empresa_id)
  THEN
    INSERT INTO public.perfis (id, empresa_id, nome_completo, role, email)
    VALUES (NEW.id, v_provided_empresa_id, v_nome, v_role::public.app_role, NEW.email)
    ON CONFLICT (id) DO UPDATE
      SET nome_completo = EXCLUDED.nome_completo,
          email = COALESCE(EXCLUDED.email, public.perfis.email);
    RETURN NEW;
  END IF;

  IF v_actor IS NOT NULL AND v_provided_empresa_id IS NOT NULL THEN
    RAISE EXCEPTION 'Acesso negado: não é permitido criar usuários para esta empresa.' USING ERRCODE = '42501';
  END IF;

  -- Fluxo principal: nova empresa se cadastrando
  -- Deixamos o trigger `tr_set_codigo_empresa` preencher o codigo_empresa automaticamente,
  -- em vez de forçar um setval manual que pode falhar em alguns ambientes.
  INSERT INTO public.empresas (
    nome_fantasia, cnpj, telefone_empresa, dominio, data_vencimento
  ) VALUES (
    v_empresa, v_cnpj, v_telefone, COALESCE(v_dominio, 'techquickops.com'), now() + interval '14 days'
  )
  RETURNING id INTO new_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role, email, ativo)
  VALUES (NEW.id, new_empresa_id, v_nome, 'admin', NEW.email, true)
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        nome_completo = EXCLUDED.nome_completo,
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        ativo = true;

  RETURN NEW;
END;
$function$;
