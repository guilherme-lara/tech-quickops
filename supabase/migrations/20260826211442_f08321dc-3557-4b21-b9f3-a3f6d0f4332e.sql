-- 1. E-mail de notificações do técnico (e-mail real, diferente do e-mail interno de login)
ALTER TABLE public.tecnicos ADD COLUMN IF NOT EXISTS email_notificacoes TEXT;

-- 2. Estrutura extra da fila de e-mails
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'generico';
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS dados JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS erro_mensagem TEXT;
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS enviado_at TIMESTAMPTZ;

GRANT SELECT ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;

DROP POLICY IF EXISTS "Admins podem ver fila de emails" ON public.email_queue;
DROP POLICY IF EXISTS "Usuarios veem fila da propria empresa" ON public.email_queue;
CREATE POLICY "Usuarios veem fila da propria empresa" ON public.email_queue
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_current_empresa_id());

-- 3. Trigger de OS: notificações in-app + enfileiramento de e-mails
CREATE OR REPLACE FUNCTION public.fn_notify_os_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome_os TEXT;
  v_autor_nome TEXT := 'Sistema';
  v_cliente_email TEXT;
  v_cliente_nome TEXT;
  v_tec_email TEXT;
  v_tec_nome TEXT;
  v_titulo TEXT;
  v_endereco TEXT;
  v_tipo_email TEXT;
BEGIN
  v_nome_os := COALESCE(NEW.numero, 'OS');
  v_titulo := COALESCE(to_jsonb(NEW)->>'titulo', to_jsonb(NEW)->>'descricao_problema', 'Ordem de Serviço');
  v_endereco := COALESCE(to_jsonb(NEW)->>'endereco_servico', '');

  IF auth.uid() IS NOT NULL THEN
    SELECT nome_completo INTO v_autor_nome FROM public.perfis WHERE id = auth.uid();
  END IF;
  v_autor_nome := COALESCE(v_autor_nome, 'Sistema');

  IF NEW.cliente_id IS NOT NULL THEN
    SELECT email, nome INTO v_cliente_email, v_cliente_nome FROM public.clientes WHERE id = NEW.cliente_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.tecnico_id IS NOT NULL THEN
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT t.user_id,
             'Nova OS Atribuída: ' || v_nome_os,
             'Uma nova OS (' || v_nome_os || ') foi criada e atribuída a você por ' || v_autor_nome || '.',
             'info', '/tecnico/os/' || NEW.id
      FROM public.tecnicos t
      WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
    END IF;

    INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
    SELECT id,
           'Nova OS Criada: ' || v_nome_os,
           'A OS ' || v_nome_os || ' foi criada por ' || v_autor_nome || '.',
           'info', '/os?id=' || NEW.id
    FROM public.perfis
    WHERE role IN ('gestor', 'analista', 'admin', 'superadmin')
      AND empresa_id = NEW.empresa_id
      AND COALESCE(ativo, true) = true;

    -- EMAIL: cliente avisado da abertura da OS
    IF v_cliente_email IS NOT NULL AND v_cliente_email <> '' THEN
      INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
      VALUES (
        NEW.empresa_id, NEW.id, v_cliente_email,
        'OS ' || v_nome_os || ' aberta — QuickOps',
        'Sua ordem de serviço ' || v_nome_os || ' foi aberta.',
        'os_criada',
        jsonb_build_object(
          'numero', v_nome_os,
          'titulo', v_titulo,
          'cliente_nome', v_cliente_nome,
          'status', NEW.status::text,
          'endereco', v_endereco
        )
      );
    END IF;

    -- EMAIL: técnico avisado se a OS já nasce atribuída
    IF NEW.tecnico_id IS NOT NULL THEN
      SELECT email_notificacoes, nome INTO v_tec_email, v_tec_nome FROM public.tecnicos WHERE id = NEW.tecnico_id;
      IF v_tec_email IS NOT NULL AND v_tec_email <> '' THEN
        INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
        VALUES (
          NEW.empresa_id, NEW.id, v_tec_email,
          'Nova OS atribuída: ' || v_nome_os,
          'A OS ' || v_nome_os || ' foi atribuída a você.',
          'os_atribuida',
          jsonb_build_object(
            'numero', v_nome_os,
            'titulo', v_titulo,
            'tecnico_nome', v_tec_nome,
            'cliente_nome', v_cliente_nome,
            'status', NEW.status::text,
            'endereco', v_endereco
          )
        );
      END IF;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.tecnico_id IS NOT NULL AND (OLD.tecnico_id IS NULL OR OLD.tecnico_id != NEW.tecnico_id) THEN
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT t.user_id,
             'Nova OS Atribuída: ' || v_nome_os,
             'A OS ' || v_nome_os || ' foi atribuída a você por ' || v_autor_nome || '.',
             'info', '/tecnico/os/' || NEW.id
      FROM public.tecnicos t
      WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;

      -- EMAIL: técnico avisado da (re)atribuição
      SELECT email_notificacoes, nome INTO v_tec_email, v_tec_nome FROM public.tecnicos WHERE id = NEW.tecnico_id;
      IF v_tec_email IS NOT NULL AND v_tec_email <> '' THEN
        INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
        VALUES (
          NEW.empresa_id, NEW.id, v_tec_email,
          'Nova OS atribuída: ' || v_nome_os,
          'A OS ' || v_nome_os || ' foi atribuída a você.',
          'os_atribuida',
          jsonb_build_object(
            'numero', v_nome_os,
            'titulo', v_titulo,
            'tecnico_nome', v_tec_nome,
            'cliente_nome', v_cliente_nome,
            'status', NEW.status::text,
            'endereco', v_endereco
          )
        );
      END IF;
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.tecnico_id IS NOT NULL THEN
        INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
        SELECT t.user_id,
               'Status Atualizado: OS ' || v_nome_os,
               'OS ' || v_nome_os || ' - Alteração de Status de ' || COALESCE(OLD.status::TEXT, 'Sem status') || ' para ' || NEW.status::TEXT || ' por ' || v_autor_nome,
               'info', '/tecnico/os/' || NEW.id
        FROM public.tecnicos t
        WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
      END IF;

      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT id,
             'Status Atualizado: OS ' || v_nome_os,
             'OS ' || v_nome_os || ' - Alteração de Status de ' || COALESCE(OLD.status::TEXT, 'Sem status') || ' para ' || NEW.status::TEXT || ' por ' || v_autor_nome,
             'info', '/os?id=' || NEW.id
      FROM public.perfis
      WHERE role IN ('gestor', 'analista', 'admin', 'superadmin')
        AND empresa_id = NEW.empresa_id
        AND COALESCE(ativo, true) = true;

      -- EMAIL: cliente avisado da mudança de status (conclusão tem template próprio)
      IF v_cliente_email IS NOT NULL AND v_cliente_email <> '' THEN
        v_tipo_email := CASE WHEN NEW.status::text = 'concluido' THEN 'os_concluida' ELSE 'status_alterado' END;
        INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
        VALUES (
          NEW.empresa_id, NEW.id, v_cliente_email,
          CASE WHEN NEW.status::text = 'concluido'
               THEN 'OS ' || v_nome_os || ' concluída — QuickOps'
               ELSE 'Atualização da OS ' || v_nome_os || ' — QuickOps'
          END,
          'A OS ' || v_nome_os || ' mudou para ' || NEW.status::text || '.',
          v_tipo_email,
          jsonb_build_object(
            'numero', v_nome_os,
            'titulo', v_titulo,
            'cliente_nome', v_cliente_nome,
            'status_anterior', OLD.status::text,
            'status_novo', NEW.status::text,
            'endereco', v_endereco
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. criar_tecnico passa a aceitar e-mail de notificações
DROP FUNCTION IF EXISTS public.criar_tecnico(TEXT, TEXT, TEXT, public.tipo_comissao_enum, NUMERIC, TEXT, TEXT, JSONB);

CREATE FUNCTION public.criar_tecnico(
  p_nome TEXT,
  p_username TEXT,
  p_senha TEXT,
  p_tipo_comissao public.tipo_comissao_enum,
  p_comissao NUMERIC,
  p_telefone TEXT DEFAULT NULL,
  p_chave_pix TEXT DEFAULT NULL,
  p_dados_adicionais JSONB DEFAULT NULL,
  p_email_notificacoes TEXT DEFAULT NULL
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
    id, empresa_id, nome, username, telefone, chave_pix, tipo_comissao, comissao, ativo, dados_adicionais, user_id, email_notificacoes
  ) VALUES (
    v_user_id, v_empresa_id, p_nome, p_username, p_telefone, p_chave_pix, p_tipo_comissao, p_comissao, true, p_dados_adicionais, v_user_id, NULLIF(trim(p_email_notificacoes), '')
  );

  RETURN v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_tecnico(TEXT, TEXT, TEXT, public.tipo_comissao_enum, NUMERIC, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_tecnico(TEXT, TEXT, TEXT, public.tipo_comissao_enum, NUMERIC, TEXT, TEXT, JSONB, TEXT) TO authenticated, service_role;