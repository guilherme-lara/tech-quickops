
CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(
  p_nome text,
  p_username text,
  p_senha text,
  p_role app_role,
  p_telefone text DEFAULT NULL,
  p_dominio text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_empresa_id UUID;
  v_user_id UUID;
  v_email TEXT;
  v_dominio TEXT;
  v_codigo TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin')
     AND NOT public.has_role(auth.uid(), 'gestor')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  v_empresa_id := public.get_current_empresa_id();
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não vinculado a uma empresa.';
  END IF;

  SELECT lower(dominio), codigo_empresa
    INTO v_dominio, v_codigo
    FROM public.empresas
   WHERE id = v_empresa_id;

  -- Prioridade: parâmetro explícito > domínio da empresa > codigo.techquickops.com
  IF p_dominio IS NOT NULL AND length(trim(p_dominio)) > 0 THEN
    v_dominio := lower(trim(p_dominio));
    IF left(v_dominio, 1) = '@' THEN
      v_dominio := substring(v_dominio from 2);
    END IF;
  ELSIF v_dominio IS NULL OR v_dominio = '' THEN
    v_dominio := COALESCE(v_codigo, 'empresa') || '.techquickops.com';
  END IF;

  v_email := lower(p_username) || '@' || v_dominio;

  -- Duplicidade escopada por EMPRESA (não global)
  IF EXISTS (
    SELECT 1 FROM public.perfis
     WHERE lower(username) = lower(p_username)
       AND empresa_id = v_empresa_id
  ) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso nesta empresa.', p_username;
  END IF;

  -- Também bloqueia se já existir técnico com o mesmo username na empresa
  IF EXISTS (
    SELECT 1 FROM public.tecnicos
     WHERE lower(username) = lower(p_username)
       AND empresa_id = v_empresa_id
  ) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso por um técnico desta empresa.', p_username;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'O e-mail interno "%" já está registrado. Tente outro usuário.', v_email;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    email_change, phone, phone_change, phone_change_token, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(p_senha, gen_salt('bf')), now(),
    '', '', '', '',
    '', NULL, '', '', '',
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('nome_completo', p_nome, 'role', p_role, 'empresa_id', v_empresa_id),
    now(), now()
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email', now(), now(), now()
  );

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role, username, telefone)
  VALUES (v_user_id, v_empresa_id, p_nome, p_role, p_username, p_telefone);

  RETURN v_user_id;
END;
$function$;
