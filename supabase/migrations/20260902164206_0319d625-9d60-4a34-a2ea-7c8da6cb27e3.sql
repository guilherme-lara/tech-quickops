ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS recebido_cliente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recebido_em timestamptz,
  ADD COLUMN IF NOT EXISTS lancamentos_adicionais jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS data_hora_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS data_hora_fim timestamptz;

ALTER TABLE public.tecnicos
  ADD COLUMN IF NOT EXISTS valor_fixo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_chamados integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_excedente numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_limite numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_hora_extra numeric NOT NULL DEFAULT 0;

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

  SELECT nome, email_notificacoes INTO v_empresa_nome, v_empresa_email FROM public.empresas WHERE id = NEW.empresa_id;

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

      -- 1) Cliente, quando houver e-mail cadastrado
      IF v_cliente_email IS NOT NULL AND v_cliente_email <> '' THEN
        INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
        VALUES (NEW.empresa_id, NEW.id, v_cliente_email, v_assunto,
                'A OS ' || v_nome_os || ' mudou para ' || NEW.status::text || '.', v_tipo_email, v_dados);
        v_enviou := true;
      END IF;

      -- 2) Gestão da empresa (template próprio, saudação para a gestão)
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

      -- 3) Técnico responsável, quando a OS é concluída
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