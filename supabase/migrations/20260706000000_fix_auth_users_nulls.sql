-- 1. Atualizar a função criar_tecnico para injetar todas as colunas necessárias na tabela auth.users
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
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_empresa_id UUID;
  v_dominio TEXT;
BEGIN
  -- 1. Obter empresa ativa
  v_empresa_id := public.get_current_empresa_id();
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Não foi possível identificar a empresa do gestor ativo.';
  END IF;

  -- 2. Obter domínio
  SELECT dominio INTO v_dominio
  FROM public.empresas
  WHERE id = v_empresa_id;

  IF v_dominio IS NULL THEN
    v_dominio := 'techquickops.com';
  END IF;

  -- 3. Montar e-mail completo
  v_email := p_username || '@' || v_dominio;
  
  -- 4. Validação de conflitos
  IF EXISTS (SELECT 1 FROM public.tecnicos WHERE username = p_username) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso por outro técnico.', p_username;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'O e-mail "%" já está registrado no sistema.', v_email;
  END IF;

  v_user_id := gen_random_uuid();

  -- 5. Grava em auth.users, injetando TODAS as colunas que o GoTrue requer
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    phone_change_token,
    reauthentication_token,
    is_sso_user,
    is_super_admin,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_senha, gen_salt('bf')),
    now(),
    '', -- confirmation_token
    '', -- recovery_token
    '', -- email_change_token_new
    '', -- email_change_token_current
    '', -- phone_change_token
    '', -- reauthentication_token
    false, -- is_sso_user
    false, -- is_super_admin
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
      'nome_completo', p_nome,
      'role', 'tecnico',
      'empresa_id', v_empresa_id
    ),
    now(),
    now()
  );

  -- 5.1 Grava na tabela auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    email
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email',
    now(),
    now(),
    now(),
    v_email
  );

  -- 6. Grava na tabela public.tecnicos
  INSERT INTO public.tecnicos (
    id,
    empresa_id,
    nome,
    username,
    telefone,
    chave_pix,
    tipo_comissao,
    comissao,
    ativo,
    dados_adicionais
  ) VALUES (
    v_user_id,
    v_empresa_id,
    p_nome,
    p_username,
    p_telefone,
    p_chave_pix,
    p_tipo_comissao,
    p_comissao,
    true,
    p_dados_adicionais
  );

  RETURN v_user_id;
END;
$$;

-- 2. CORRIGIR USUÁRIOS EXISTENTES
-- Limpa NULLs em campos exigidos pelo Supabase GoTrue para evitar erro "Database error querying schema"
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  is_sso_user = COALESCE(is_sso_user, false),
  is_super_admin = COALESCE(is_super_admin, false);

UPDATE auth.identities
SET email = COALESCE(email, identity_data->>'email')
WHERE email IS NULL;
