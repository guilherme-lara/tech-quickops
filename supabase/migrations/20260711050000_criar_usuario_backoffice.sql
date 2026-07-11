-- Cria a function RPC para criar usuários administrativos (Backoffice)
-- Ignora a inserção na tabela 'tecnicos', pois é um acesso apenas gerencial

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
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_empresa_id UUID;
BEGIN
  -- 1. Obter o ID da empresa do usuário atual (admin/gestor que está criando)
  v_empresa_id := public.get_current_empresa_id();
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Não foi possível identificar a empresa do gestor ativo.';
  END IF;

  -- 2. Montar o email do backoffice baseado no username e domínio
  v_email := p_username || p_dominio;
  
  -- 3. Verificação de Conflitos: Username em public.perfis
  IF EXISTS (SELECT 1 FROM public.perfis WHERE username = p_username) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso.', p_username;
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

  -- 7. Inserir APENAS na tabela public.perfis (e evitar o trigger de perfil, se houver, ou fazer upsert)
  -- Nota: Normalmente há um trigger em auth.users que cria o perfil. Se houver, a gente atualiza.
  -- Vamos tentar atualizar primeiro.
  UPDATE public.perfis 
  SET 
    role = p_role, 
    username = p_username, 
    empresa_id = v_empresa_id,
    nome_completo = p_nome
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.perfis (
      id,
      empresa_id,
      nome_completo,
      role,
      username
    ) VALUES (
      v_user_id,
      v_empresa_id,
      p_nome,
      p_role,
      p_username
    );
  END IF;

  -- Retorna o ID criado
  RETURN v_user_id;
END;
$$;
