-- Fix the criar_tecnico RPC to handle uniqueness conflicts gracefully

CREATE OR REPLACE FUNCTION public.criar_tecnico(
  p_nome TEXT,
  p_username TEXT,
  p_senha TEXT,
  p_tipo_comissao public.tipo_comissao_enum,
  p_comissao NUMERIC,
  p_telefone TEXT DEFAULT NULL,
  p_chave_pix TEXT DEFAULT NULL,
  p_dados_adicionais JSONB DEFAULT NULL,
  p_dominio TEXT DEFAULT '@techquickops.com'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_empresa_id UUID;
BEGIN
  -- 1. Obter o ID da empresa do usuário atual (gestor/admin que está criando o técnico)
  v_empresa_id := public.get_current_empresa_id();
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Não foi possível identificar a empresa do gestor ativo.';
  END IF;

  -- 2. Montar o email do técnico baseado no username e domínio
  v_email := p_username || p_dominio;
  
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

  -- 6. Inserir no Supabase Auth (auth.users)
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

  -- 7. Inserir na tabela public.tecnicos
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

  -- Retorna o ID criado para o front-end
  RETURN v_user_id;
END;
$$;
