-- Esta migração resolve o erro 500 "Database error querying schema" no login
-- que acontece porque a inserção manual na tabela auth.users deixou colunas
-- como NULL, o que causa falha (panic) no parser do GoTrue (Supabase Auth).

DO $$
DECLARE
  col TEXT;
BEGIN
  -- 1. Atualizar todas as colunas de texto críticas do GoTrue que não podem ser NULL
  -- O GoTrue (serviço de autenticação) espera que essas colunas sejam strings vazias ('') 
  -- e não NULL. Se encontrar NULL, retorna o erro 500 "Database error querying schema".
  FOR col IN 
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users' 
      AND column_name IN (
        'phone_change', 'phone_change_token', 'email_change', 
        'email_change_token_new', 'email_change_token_current', 
        'confirmation_token', 'recovery_token', 'encrypted_password',
        'reauthentication_token'
      )
  LOOP
    EXECUTE format('UPDATE auth.users SET %I = %L WHERE %I IS NULL', col, '', col);
  END LOOP;
END $$;


-- 2. Atualizar a função criar_tecnico para garantir que insere os valores corretos
CREATE OR REPLACE FUNCTION public.criar_tecnico(
  p_nome TEXT,
  p_username TEXT,
  p_senha TEXT,
  p_tipo_comissao public.tipo_comissao_enum,
  p_comissao NUMERIC,
  p_telefone TEXT DEFAULT NULL,
  p_chave_pix TEXT DEFAULT NULL,
  p_dados_adicionais JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_empresa_id UUID;
  v_dominio TEXT;
  v_user_id UUID;
  v_email TEXT;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM public.perfis
  WHERE id = auth.uid();

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não vinculado a uma empresa.';
  END IF;

  SELECT lower(dominio) INTO v_dominio
  FROM public.empresas
  WHERE id = v_empresa_id;

  IF v_dominio IS NULL THEN
    RAISE EXCEPTION 'Empresa sem domínio configurado.';
  END IF;

  v_email := lower(p_username) || '@' || v_dominio;
  
  IF EXISTS (SELECT 1 FROM public.tecnicos WHERE lower(username) = lower(p_username) AND empresa_id = v_empresa_id) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso na sua empresa.', p_username;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'O e-mail "%" já está registrado no sistema.', v_email;
  END IF;

  v_user_id := gen_random_uuid();

  -- IMPORTANTE: Inserir com strings vazias em vez de omitir para não cair como NULL
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
    jsonb_build_object('nome_completo', p_nome, 'role', 'tecnico', 'empresa_id', v_empresa_id),
    now(), now()
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text, jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email', now(), now(), now()
  );

  INSERT INTO public.tecnicos (
    id, empresa_id, nome, username, telefone, chave_pix, tipo_comissao, comissao, ativo, dados_adicionais, user_id
  ) VALUES (
    v_user_id, v_empresa_id, p_nome, p_username, p_telefone, p_chave_pix, p_tipo_comissao, p_comissao, true, p_dados_adicionais, v_user_id
  );

  RETURN v_user_id;
END;
$$;


-- 3. Atualizar a função criar_usuario_backoffice para fazer a mesma coisa
CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(
  p_nome TEXT,
  p_username TEXT,
  p_senha TEXT,
  p_role public.app_role,
  p_dominio TEXT DEFAULT '@techquickops.com'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_empresa_id UUID;
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- Verifica permissão (apenas superadmin ou gestor)
  IF NOT public.has_role(auth.uid(), 'superadmin') AND NOT public.has_role(auth.uid(), 'gestor') THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  v_empresa_id := public.get_current_empresa_id();

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não vinculado a uma empresa.';
  END IF;

  v_email := lower(p_username || p_dominio);
  
  IF EXISTS (SELECT 1 FROM public.perfis WHERE lower(username) = lower(p_username)) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso.', p_username;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'O e-mail "%" já está registrado no sistema.', v_email;
  END IF;

  v_user_id := gen_random_uuid();

  -- IMPORTANTE: Mesma correção do NULL para strings
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    email_change, phone, phone_change, phone_change_token, reauthentication_token,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(p_senha, gen_salt('bf')), now(), 
    '', '', '', '', 
    '', NULL, '', '', '', -- phone pode ser nulo nas versões mais recentes em inserts diretos dependendo da constraints, mas enviamos como o goTrue espera se for string... deixaremos phone_change vazio
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('nome_completo', p_nome, 'role', p_role, 'empresa_id', v_empresa_id),
    now(), now()
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text, jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email', now(), now(), now()
  );

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role, username)
  VALUES (v_user_id, v_empresa_id, p_nome, p_role, p_username);

  RETURN v_user_id;
END;
$$;
