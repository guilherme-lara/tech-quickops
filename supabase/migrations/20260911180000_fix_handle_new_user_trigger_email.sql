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
  v_next_codigo text;
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

  PERFORM pg_advisory_xact_lock(hashtext('public.empresas_codigo_seq'));
  PERFORM setval(
    'public.empresas_codigo_seq',
    GREATEST(
      COALESCE((SELECT max(codigo_empresa::bigint) FROM public.empresas WHERE codigo_empresa ~ '^[0-9]+$'), 0),
      COALESCE((SELECT last_value FROM public.empresas_codigo_seq), 0)
    ),
    true
  );
  v_next_codigo := lpad(nextval('public.empresas_codigo_seq')::text, 5, '0');

  INSERT INTO public.empresas (
    nome_fantasia, cnpj, telefone_empresa, dominio, codigo_empresa, data_vencimento
  ) VALUES (
    v_empresa, v_cnpj, v_telefone, COALESCE(v_dominio, 'techquickops.com'), v_next_codigo,
    now() + interval '14 days'
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
