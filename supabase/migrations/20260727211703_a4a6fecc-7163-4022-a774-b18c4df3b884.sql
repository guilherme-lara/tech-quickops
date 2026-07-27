
DROP FUNCTION IF EXISTS public.criar_usuario_backoffice(text,text,text,app_role,text,text,uuid);

CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(
  p_nome text,
  p_username text,
  p_senha text,
  p_role app_role,
  p_telefone text,
  p_dominio text,
  p_empresa_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_domain text;
  v_codigo text;
  v_existing_id uuid;
  v_was_created boolean;
  v_started timestamptz := clock_timestamp();
  v_actor uuid := auth.uid();
  v_actor_nome text;
BEGIN
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id obrigatório' USING ERRCODE = '22023';
  END IF;

  SELECT codigo_empresa INTO v_codigo FROM public.empresas WHERE id = p_empresa_id;
  v_domain := COALESCE(NULLIF(trim(p_dominio), ''), v_codigo || '.techquickops.com');
  v_email  := lower(trim(p_username)) || '@' || v_domain;

  IF EXISTS (
    SELECT 1 FROM public.perfis
    WHERE empresa_id = p_empresa_id AND lower(username) = lower(trim(p_username))
  ) THEN
    RAISE EXCEPTION 'Usuário já cadastrado nesta empresa' USING ERRCODE = '23505';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, crypt(p_senha, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome_completo', p_nome, 'role', p_role, 'empresa_id', p_empresa_id),
    now(), now(), '', '', '', ''
  ) RETURNING id INTO v_user_id;

  SELECT id INTO v_existing_id FROM public.perfis WHERE id = v_user_id;
  v_was_created := v_existing_id IS NULL;

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role, username, telefone)
  VALUES (v_user_id, p_empresa_id, p_nome, p_role, lower(trim(p_username)), p_telefone)
  ON CONFLICT (id) DO UPDATE SET
    empresa_id    = EXCLUDED.empresa_id,
    nome_completo = EXCLUDED.nome_completo,
    role          = EXCLUDED.role,
    username      = EXCLUDED.username,
    telefone      = EXCLUDED.telefone;

  SELECT nome_completo INTO v_actor_nome FROM public.perfis WHERE id = v_actor;

  INSERT INTO public.logs_administrativos (empresa_id, tipo, descricao, usuario_id, usuario_nome)
  VALUES (
    p_empresa_id,
    CASE WHEN v_was_created THEN 'perfil_criado' ELSE 'perfil_atualizado_upsert' END,
    format(
      '[criar_usuario_backoffice] %s perfil %s (user_id=%s, role=%s, username=%s, email=%s, dominio=%s, actor=%s, duracao_ms=%s)',
      CASE WHEN v_was_created THEN 'INSERT' ELSE 'UPSERT UPDATE' END,
      p_nome, v_user_id, p_role, lower(trim(p_username)), v_email, v_domain,
      COALESCE(v_actor_nome, v_actor::text, 'system'),
      round(extract(epoch FROM clock_timestamp() - v_started) * 1000)::int
    ),
    v_actor,
    v_actor_nome
  );

  RAISE NOTICE '[criar_usuario_backoffice] % perfil user_id=% empresa=% role=% username=%',
    CASE WHEN v_was_created THEN 'CREATED' ELSE 'UPSERT-UPDATED' END,
    v_user_id, p_empresa_id, p_role, p_username;

  RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.logs_administrativos (empresa_id, tipo, descricao, usuario_id, usuario_nome)
    VALUES (
      p_empresa_id,
      'perfil_erro',
      format('[criar_usuario_backoffice] FAIL sqlstate=%s message=%s username=%s role=%s',
             SQLSTATE, SQLERRM, p_username, p_role),
      v_actor, v_actor_nome
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RAISE;
END;
$$;
