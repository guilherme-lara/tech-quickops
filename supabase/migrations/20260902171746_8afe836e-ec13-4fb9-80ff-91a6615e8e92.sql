CREATE OR REPLACE FUNCTION public.fn_notify_os_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_tipo_gestao TEXT;
  v_tipo_tecnico TEXT;
  v_assunto TEXT;
  v_dados JSONB;
  v_dados_gestao JSONB;
  v_empresa_email TEXT;
  v_empresa_nome TEXT;
  v_dest TEXT;
  v_enviou BOOLEAN;
BEGIN
  v_nome_os := COALESCE(NEW.numero, 'OS');
  v_titulo := COALESCE(to_jsonb(NEW)->>'titulo', to_jsonb(NEW)->>'descricao_problema', 'Ordem de Serviço');
  v_endereco := COALESCE(to_jsonb(NEW)->>'endereco_servico', '');

  IF auth.uid() IS NOT NULL THEN
    SELECT nome_completo INTO v_autor_nome FROM public.perfis WHERE id = auth.uid();
  END IF;
  v_autor_nome := COALESCE(v_autor_nome, 'Sistema');

  SELECT nome_fantasia, email_notificacoes INTO v_empresa_nome, v_empresa_email FROM public.empresas WHERE id = NEW.empresa_id;

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

    IF v_cliente_email IS NOT NULL AND v_cliente_email <> '' THEN
      INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
      VALUES (
        NEW.empresa_id, NEW.id, v_cliente_email,
        'OS ' || v_nome_os || ' aberta — QuickOps',
        'Sua ordem de serviço ' || v_nome_os || ' foi aberta.',
        'os_criada',
        jsonb_build_object(
          'numero', v_nome_os, 'titulo', v_titulo, 'cliente_nome', v_cliente_nome,
          'status', NEW.status::text, 'endereco', v_endereco
        )
      );
    END IF;

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
            'numero', v_nome_os, 'titulo', v_titulo, 'tecnico_nome', v_tec_nome,
            'cliente_nome', v_cliente_nome, 'status', NEW.status::text, 'endereco', v_endereco
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

      SELECT email_notificacoes, nome INTO v_tec_email, v_tec_nome FROM public.tecnicos WHERE id = NEW.tecnico_id;
      IF v_tec_email IS NOT NULL AND v_tec_email <> '' THEN
        INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
        VALUES (
          NEW.empresa_id, NEW.id, v_tec_email,
          'Nova OS atribuída: ' || v_nome_os,
          'A OS ' || v_nome_os || ' foi atribuída a você.',
          'os_atribuida',
          jsonb_build_object(
            'numero', v_nome_os, 'titulo', v_titulo, 'tecnico_nome', v_tec_nome,
            'cliente_nome', v_cliente_nome, 'status', NEW.status::text, 'endereco', v_endereco
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

      v_tipo_email := CASE WHEN NEW.status::text = 'concluido' THEN 'os_concluida' ELSE 'status_alterado' END;
      v_tipo_gestao := CASE WHEN NEW.status::text = 'concluido' THEN 'os_concluida_gestao' ELSE 'status_alterado_gestao' END;
      v_tipo_tecnico := 'os_concluida_tecnico';
      v_assunto := CASE WHEN NEW.status::text = 'concluido'
                        THEN 'OS ' || v_nome_os || ' concluída — QuickOps'
                        ELSE 'Atualização da OS ' || v_nome_os || ' — QuickOps' END;
      v_dados := jsonb_build_object(
        'numero', v_nome_os, 'titulo', v_titulo, 'cliente_nome', v_cliente_nome,
        'status_anterior', OLD.status::text, 'status_novo', NEW.status::text,
        'status', NEW.status::text, 'endereco', v_endereco
      );
      v_dados_gestao := v_dados || jsonb_build_object(
        'empresa_nome', COALESCE(v_empresa_nome, 'QuickOps'),
        'tecnico_nome', NULL,
        'autor_nome', v_autor_nome
      );

      v_enviou := false;

      IF v_cliente_email IS NOT NULL AND v_cliente_email <> '' THEN
        INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
        VALUES (NEW.empresa_id, NEW.id, v_cliente_email, v_assunto,
                'A OS ' || v_nome_os || ' mudou para ' || NEW.status::text || '.', v_tipo_email, v_dados);
        v_enviou := true;
      END IF;

      IF v_empresa_email IS NOT NULL AND v_empresa_email <> '' THEN
        INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
        VALUES (NEW.empresa_id, NEW.id, v_empresa_email, v_assunto,
                'A OS ' || v_nome_os || ' mudou para ' || NEW.status::text || '.', v_tipo_gestao, v_dados_gestao);
        v_enviou := true;
      ELSIF NOT v_enviou THEN
        FOR v_dest IN
          SELECT DISTINCT u.email
          FROM public.perfis p
          JOIN auth.users u ON u.id = p.id
          WHERE p.empresa_id = NEW.empresa_id
            AND COALESCE(p.ativo, true) = true
            AND p.role IN ('gestor', 'admin', 'superadmin')
            AND u.email IS NOT NULL AND u.email <> ''
            AND u.email NOT LIKE '%techquickops.com'
        LOOP
          INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
          VALUES (NEW.empresa_id, NEW.id, v_dest, v_assunto,
                  'A OS ' || v_nome_os || ' mudou para ' || NEW.status::text || '.', v_tipo_gestao, v_dados_gestao);
        END LOOP;
      END IF;

      IF NEW.status::text = 'concluido' AND NEW.tecnico_id IS NOT NULL THEN
        SELECT email_notificacoes, nome INTO v_tec_email, v_tec_nome FROM public.tecnicos WHERE id = NEW.tecnico_id;
        IF v_tec_email IS NOT NULL AND v_tec_email <> '' THEN
          INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
          VALUES (NEW.empresa_id, NEW.id, v_tec_email, v_assunto,
                  'A OS ' || v_nome_os || ' foi concluída.', v_tipo_tecnico,
                  v_dados || jsonb_build_object('tecnico_nome', v_tec_nome));
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Hardening: funções de gatilho / internas não devem ser chamáveis via API
REVOKE ALL ON FUNCTION public.fn_audit_log_changes() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_disparar_email_resend() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_notify_changelog() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_notify_os_changes() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_notify_os_criada_gestao() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_os_inventario_movimenta() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_registrar_os_historico() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.gen_os_numero() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_codigo_empresa() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Funções usadas apenas por usuários autenticados (RPCs do app)
REVOKE ALL ON FUNCTION public.criar_tecnico(text, text, text, tipo_comissao_enum, numeric, text, text, jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.remover_acesso_backoffice(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.resetar_senha_tecnico(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.vincular_acesso_tecnico(uuid, text, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.gerar_chave_licenca_segura(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.validar_chave_licenca(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_current_empresa_id() FROM anon;

-- get_email_by_username continua acessível a anon (login por usuário)
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_empresa_id() TO authenticated;