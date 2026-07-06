  -- 1. Atualizar a função handle_new_user para respeitar role e empresa_id do metadata
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    new_empresa_id UUID;
    v_nome TEXT;
    v_empresa TEXT;
    v_role TEXT;
    v_provided_empresa_id UUID;
  BEGIN
    v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email);
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
    
    IF v_role = 'tecnico' THEN
      -- Técnico criado por um gestor (não cria empresa nova)
      v_provided_empresa_id := (NEW.raw_user_meta_data->>'empresa_id')::UUID;
      
      INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
      VALUES (NEW.id, v_provided_empresa_id, v_nome, 'tecnico');
    ELSE
      -- Gestor assinando o sistema (cria nova empresa)
      v_empresa := COALESCE(NEW.raw_user_meta_data->>'nome_empresa', 'Minha Empresa');
      
      INSERT INTO public.empresas (nome_fantasia)
      VALUES (v_empresa)
      RETURNING id INTO new_empresa_id;
    
      INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
      VALUES (NEW.id, new_empresa_id, v_nome, 'admin');
    END IF;

    RETURN NEW;
  END;
  $$;

  -- 2. Atualizar a função criar_tecnico para injetar role e empresa_id no metadata
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

    -- 5. Grava em auth.users, injetando role e empresa_id para o trigger handle_new_user
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
      '',
      '',
      '',
      '',
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

  -- 3. Sincronizar perfis de técnicos existentes que caíram no bug do trigger
  DO $$
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN (
      SELECT t.id, t.empresa_id
      FROM public.tecnicos t
      JOIN public.perfis p ON p.id = t.id
      WHERE p.role = 'admin' OR p.empresa_id != t.empresa_id
    )
    LOOP
      -- Atualiza o perfil para a empresa correta e role tecnico
      UPDATE public.perfis
      SET role = 'tecnico',
          empresa_id = r.empresa_id
      WHERE id = r.id;
    END LOOP;
    
    -- 4. Limpar empresas "fantasmas" que o trigger criou acidentalmente
    -- Deleta empresas que não têm perfis, nem técnicos, nem ordens de serviço, nem clientes vinculados.
    DELETE FROM public.empresas e
    WHERE NOT EXISTS (SELECT 1 FROM public.perfis p WHERE p.empresa_id = e.id)
      AND NOT EXISTS (SELECT 1 FROM public.tecnicos t WHERE t.empresa_id = e.id)
      AND NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.empresa_id = e.id)
      AND NOT EXISTS (SELECT 1 FROM public.ordens_servico os WHERE os.empresa_id = e.id);

    -- 5. Corrigir usuários na auth.users que foram inseridos sem as colunas de token exigidas (causa do erro "Database error querying schema")
    UPDATE auth.users
    SET 
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change_token_current = COALESCE(email_change_token_current, '');
  END $$;
