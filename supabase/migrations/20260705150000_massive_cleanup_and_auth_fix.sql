-- 1. FAXINA: Destruir TODAS as funções de criar técnico para não sobrar nenhum fantasma ambíguo
DO $$ 
DECLARE
    r record;
BEGIN
    FOR r IN SELECT oid::regprocedure AS proc_name 
             FROM pg_proc 
             WHERE proname = 'criar_tecnico'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.proc_name || ' CASCADE;';
    END LOOP;
    
    FOR r IN SELECT oid::regprocedure AS proc_name 
             FROM pg_proc 
             WHERE proname = 'get_email_by_username'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.proc_name || ' CASCADE;';
    END LOOP;
END $$;

-- 2. FAXINA DE TABELA: Remover a coluna 'email' de tecnicos (a fonte de verdade é auth.users)
ALTER TABLE public.tecnicos DROP COLUMN IF EXISTS email;

-- 3. RECRIAR FUNÇÃO: get_email_by_username
-- Faz JOIN seguro com auth.users para buscar o email verdadeiro
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
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
  WHERE lower(t.username) = lower(p_username)
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;

-- 4. RECRIAR FUNÇÃO: criar_tecnico
-- Cria o e-mail combinando username e dominio da empresa. Insere email só em auth.users.
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

  -- 5. Grava em auth.users (onde o email DEVE morar)
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

  -- 5.1 Grava na tabela auth.identities (OBRIGATÓRIO para o GoTrue aceitar login com senha)
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

  -- 6. Grava na tabela public.tecnicos (SEM A COLUNA EMAIL!)
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
