-- Add email to perfis
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS email text;

-- Update criar_usuario_backoffice to accept p_email
CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(p_nome text, p_username text, p_senha text, p_role app_role, p_telefone text, p_dominio text, p_empresa_id uuid, p_email text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_user_id uuid;
  v_email text;
  v_domain text;
  v_codigo text;
  v_actor uuid := auth.uid();
  v_actor_empresa uuid;
  v_actor_role public.app_role;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT role, empresa_id INTO v_actor_role, v_actor_empresa
    FROM public.perfis WHERE id = v_actor;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('gestor','admin','superadmin') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('gestor','analista','admin') THEN
    RAISE EXCEPTION 'Nível de acesso não permitido.' USING ERRCODE = '42501';
  END IF;

  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id obrigatório' USING ERRCODE = '22023';
  END IF;

  IF v_actor_role <> 'superadmin' AND p_empresa_id IS DISTINCT FROM v_actor_empresa THEN
    RAISE EXCEPTION 'Acesso negado: empresa inválida.' USING ERRCODE = '42501';
  END IF;

  SELECT codigo_empresa INTO v_codigo FROM public.empresas WHERE id = p_empresa_id;
  v_domain := COALESCE(NULLIF(trim(p_dominio), ''), v_codigo || '.techquickops.com');
  
  -- Se o email real foi fornecido, usa ele no auth.users também (se preferir).
  -- Mas para manter a retrocompatibilidade e evitar colisão, usamos o email gerado para auth e salvamos o real no perfil.
  v_email  := lower(trim(p_username)) || '@' || v_domain;

  IF EXISTS (
    SELECT 1 FROM public.perfis
    WHERE empresa_id = p_empresa_id AND lower(username) = lower(trim(p_username))
  ) THEN
    RAISE EXCEPTION 'Usuário já cadastrado (pode estar inativo/excluído)' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'E-mail interno % já em uso', v_email USING ERRCODE = '23505';
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

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email', now(), now(), now()
  );

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role, username, telefone, ativo, email)
  VALUES (v_user_id, p_empresa_id, p_nome, p_role, lower(trim(p_username)), p_telefone, true, p_email)
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        nome_completo = EXCLUDED.nome_completo,
        role = EXCLUDED.role,
        username = EXCLUDED.username,
        telefone = EXCLUDED.telefone,
        email = EXCLUDED.email,
        ativo = true;

  RETURN v_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text, uuid, text) TO authenticated;
