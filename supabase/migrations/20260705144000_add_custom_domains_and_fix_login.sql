-- 0. Adicionar colunas faltantes na tabela tecnicos (username e email)
ALTER TABLE public.tecnicos 
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 1. Adicionar domínio na tabela de empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS dominio TEXT DEFAULT 'techquickops.com';

-- Garantir que todas as empresas existentes tenham o domínio padrão (para evitar nulos)
UPDATE public.empresas SET dominio = 'techquickops.com' WHERE dominio IS NULL;

-- 2. Atualizar a RPC get_email_by_username
-- Primeiro excluímos a versão anterior se existir para evitar sobrecarga ambígua
DROP FUNCTION IF EXISTS public.get_email_by_username(text);

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Busca o e-mail diretamente na tabela tecnicos
  SELECT email INTO v_email
  FROM public.tecnicos
  WHERE username = p_username
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;

-- 3. Atualizar a RPC criar_tecnico para usar o domínio da empresa
-- Primeiro excluímos as possíveis versões antigas
DROP FUNCTION IF EXISTS public.criar_tecnico(text, text, text, public.tipo_comissao_enum, numeric, text, text, jsonb);
DROP FUNCTION IF EXISTS public.criar_tecnico(text, text, text, public.tipo_comissao_enum, numeric, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.criar_tecnico(text, text, text, text, numeric, text, text, jsonb);
DROP FUNCTION IF EXISTS public.criar_tecnico(text, text, text, text, numeric, text, text, jsonb, text);

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
  -- 1. Obter o ID da empresa do usuário atual (gestor/admin que está criando o técnico)
  v_empresa_id := public.get_current_empresa_id();
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Não foi possível identificar a empresa do gestor ativo.';
  END IF;

  -- Obter o domínio da empresa
  SELECT dominio INTO v_dominio
  FROM public.empresas
  WHERE id = v_empresa_id;

  IF v_dominio IS NULL THEN
    v_dominio := 'techquickops.com';
  END IF;

  -- 2. Montar o email do técnico baseado no username e domínio
  v_email := p_username || '@' || v_dominio;
  
  -- 3. Verificação de Conflitos: Username em public.tecnicos
  IF EXISTS (SELECT 1 FROM public.tecnicos WHERE username = p_username) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso por outro técnico.', p_username;
  END IF;

  -- 4. Verificação de Conflitos: Email em auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'O e-mail "%" já está registrado no sistema.', v_email;
  END IF;

  -- 5. Gerar novo UUID para o usuário
  v_user_id := gen_random_uuid();

  -- 6. Inserir em auth.users
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

  -- 7. Inserir em public.tecnicos
  INSERT INTO public.tecnicos (
    id,
    empresa_id,
    nome,
    username,
    email,
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
    v_email,
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
