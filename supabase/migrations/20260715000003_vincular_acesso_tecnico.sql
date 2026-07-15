-- Cria a função para gerar acesso para um técnico já existente (Cadastro Rápido)
-- Isso evita o uso de supabase.auth.signUp no frontend, que desloga o gestor ativo.

CREATE OR REPLACE FUNCTION public.vincular_acesso_tecnico(
  p_tecnico_id UUID,
  p_username TEXT,
  p_senha TEXT
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
  v_nome TEXT;
BEGIN
  -- Verifica se o usuário que está chamando é o gestor logado
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

  -- Verifica se o técnico existe e pertence à empresa
  SELECT nome INTO v_nome
  FROM public.tecnicos
  WHERE id = p_tecnico_id AND empresa_id = v_empresa_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Técnico não encontrado.';
  END IF;

  v_email := lower(p_username) || '@' || v_dominio;
  
  -- Verifica se o username já está em uso na empresa
  IF EXISTS (SELECT 1 FROM public.tecnicos WHERE lower(username) = lower(p_username) AND empresa_id = v_empresa_id AND id != p_tecnico_id) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso na sua empresa.', p_username;
  END IF;

  -- Verifica se o email já existe na tabela auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'Este usuário já possui uma conta de acesso.';
  END IF;

  v_user_id := gen_random_uuid();

  -- Insere o usuário no Supabase Auth com todos os campos obrigatórios vazios em vez de nulos
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
    jsonb_build_object('nome_completo', v_nome, 'role', 'tecnico', 'empresa_id', v_empresa_id),
    now(), now()
  );

  -- Insere as identidades do Supabase Auth
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text, jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email', now(), now(), now()
  );

  -- Atualiza o técnico com o user_id criado e o username
  UPDATE public.tecnicos
  SET user_id = v_user_id, username = p_username
  WHERE id = p_tecnico_id;

  RETURN v_user_id;
END;
$$;
