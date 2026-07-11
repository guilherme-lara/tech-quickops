-- 1. Adicionar coluna codigo_empresa na tabela empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS codigo_empresa TEXT;

-- 2. Gerar código único para as empresas já existentes baseado no nome_fantasia (slug) e ID
UPDATE public.empresas
SET codigo_empresa = lower(regexp_replace(nome_fantasia, '[^a-zA-Z0-9]', '', 'g')) || substr(id::text, 1, 4)
WHERE codigo_empresa IS NULL;

-- 3. Tornar o código da empresa único e não nulo
ALTER TABLE public.empresas ALTER COLUMN codigo_empresa SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_codigo_empresa_key') THEN
        ALTER TABLE public.empresas ADD CONSTRAINT empresas_codigo_empresa_key UNIQUE (codigo_empresa);
    END IF;
END $$;

-- 4. Alterar a restrição de unicidade do username na tabela tecnicos para ser por empresa
DO $$ 
DECLARE
  con_name TEXT;
BEGIN
  -- Encontrar o nome da constraint unique para 'username' na tabela 'tecnicos', se existir
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.tecnicos'::regclass AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.tecnicos'::regclass AND attname = 'username');
    
  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tecnicos DROP CONSTRAINT ' || con_name;
  END IF;

  -- Adicionar constraint unique para (empresa_id, username)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tecnicos_empresa_username_key') THEN
      ALTER TABLE public.tecnicos ADD CONSTRAINT tecnicos_empresa_username_key UNIQUE (empresa_id, username);
  END IF;
END $$;

-- 5. Atualizar a RPC get_email_by_username
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT, p_codigo_empresa TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT au.email INTO v_email
  FROM public.tecnicos t
  JOIN auth.users au ON (t.user_id = au.id OR t.id = au.id)
  JOIN public.empresas e ON t.empresa_id = e.id
  WHERE lower(t.username) = lower(p_username)
    AND lower(e.codigo_empresa) = lower(p_codigo_empresa)
  LIMIT 1;
  
  RETURN v_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text, text) TO anon, authenticated;

-- 6. Atualizar a RPC criar_tecnico
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
  v_codigo TEXT;
BEGIN
  -- 1. Obter empresa ativa
  v_empresa_id := public.get_current_empresa_id();
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Não foi possível identificar a empresa do gestor ativo.';
  END IF;

  -- 2. Obter código da empresa
  SELECT codigo_empresa INTO v_codigo
  FROM public.empresas
  WHERE id = v_empresa_id;

  IF v_codigo IS NULL THEN
    v_codigo := 'default';
  END IF;

  -- 3. Montar e-mail completo com o código da empresa para garantir unicidade no Auth
  v_email := p_username || '@' || v_codigo || '.techquickops.com';
  
  -- 4. Validação de conflitos APENAS NA MESMA EMPRESA
  IF EXISTS (SELECT 1 FROM public.tecnicos WHERE username = p_username AND empresa_id = v_empresa_id) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso nesta empresa.', p_username;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'O e-mail "%" já está registrado no sistema.', v_email;
  END IF;

  v_user_id := gen_random_uuid();

  -- 5. Grava em auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
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
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('nome_completo', p_nome),
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
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email',
    now(),
    now(),
    now()
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
