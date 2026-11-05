CREATE OR REPLACE FUNCTION public.fn_notify_os_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nome_os TEXT;
  v_cliente_email TEXT;
  v_cliente_nome TEXT;
  v_assunto TEXT;
  v_corpo TEXT;
BEGIN
  v_nome_os := COALESCE(NEW.numero, 'OS');

  IF NEW.tecnico_id IS NOT NULL AND (OLD.tecnico_id IS NULL OR OLD.tecnico_id != NEW.tecnico_id) THEN
    INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
    SELECT t.user_id, 'Nova OS Atribuída', 'A OS ' || v_nome_os || ' foi atribuída a você.', 'info', '/tecnico/os/' || NEW.id
    FROM public.tecnicos t
    WHERE t.id = NEW.tecnico_id
      AND t.user_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = t.user_id);

    INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
    SELECT id, 'OS Atribuída', 'OS ' || v_nome_os || ' atribuída ao técnico.', 'info', '/os'
    FROM public.perfis
    WHERE role IN ('gestor', 'analista') AND ativo = true AND empresa_id = NEW.empresa_id;

    v_assunto := 'Nova OS Atribuída: ' || v_nome_os;
    v_corpo := 'A Ordem de Serviço ' || v_nome_os || ' foi atribuída a um técnico e está pronta para atendimento.';

    INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo)
    SELECT NEW.empresa_id, NEW.id, email, v_assunto, v_corpo
    FROM public.perfis
    WHERE role IN ('gestor', 'analista') AND ativo = true AND empresa_id = NEW.empresa_id AND email IS NOT NULL AND email != '';

    INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo)
    SELECT NEW.empresa_id, NEW.id, p.email, v_assunto, 'Você recebeu uma nova Ordem de Serviço: ' || v_nome_os
    FROM public.tecnicos t
    JOIN public.perfis p ON p.id = t.user_id
    WHERE t.id = NEW.tecnico_id AND p.email IS NOT NULL AND p.email != '';
  END IF;

  IF to_jsonb(OLD) - 'updated_at' IS DISTINCT FROM to_jsonb(NEW) - 'updated_at' THEN
    IF NEW.tecnico_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT t.user_id, 'Status Atualizado', 'A OS ' || v_nome_os || ' mudou para: ' || NEW.status, 'info', '/tecnico/os/' || NEW.id
      FROM public.tecnicos t
      WHERE t.id = NEW.tecnico_id
        AND t.user_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = t.user_id);

      v_assunto := 'OS ' || v_nome_os || ' - Status Atualizado';
      v_corpo := 'O status da Ordem de Serviço ' || v_nome_os || ' mudou para: ' || NEW.status;

      INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo)
      SELECT NEW.empresa_id, NEW.id, p.email, v_assunto, v_corpo
      FROM public.tecnicos t
      JOIN public.perfis p ON p.id = t.user_id
      WHERE t.id = NEW.tecnico_id AND p.email IS NOT NULL AND p.email != '';
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT id, 'Status OS: ' || NEW.status, 'OS ' || v_nome_os || ' mudou para ' || NEW.status, 'info', '/os'
      FROM public.perfis
      WHERE role IN ('gestor', 'analista') AND ativo = true AND empresa_id = NEW.empresa_id;

      v_assunto := 'Atualização de Status: OS ' || v_nome_os;
      v_corpo := 'A Ordem de Serviço ' || v_nome_os || ' teve seu status atualizado para: ' || NEW.status;
    ELSE
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT id, 'OS Atualizada', 'A OS ' || v_nome_os || ' sofreu alterações.', 'info', '/os'
      FROM public.perfis
      WHERE role IN ('gestor', 'analista') AND ativo = true AND empresa_id = NEW.empresa_id;

      v_assunto := 'OS ' || v_nome_os || ' Atualizada';
      v_corpo := 'A Ordem de Serviço ' || v_nome_os || ' sofreu alterações em seus dados.';
    END IF;

    INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo)
    SELECT NEW.empresa_id, NEW.id, email, v_assunto, v_corpo
    FROM public.perfis
    WHERE role IN ('gestor', 'analista') AND ativo = true AND empresa_id = NEW.empresa_id AND email IS NOT NULL AND email != '';

    IF NEW.status = 'concluido' THEN
      IF NEW.cliente_id IS NOT NULL THEN
        SELECT email, nome INTO v_cliente_email, v_cliente_nome
        FROM public.clientes
        WHERE id = NEW.cliente_id;

        IF v_cliente_email IS NOT NULL AND v_cliente_email != '' THEN
          INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo)
          VALUES (
            NEW.empresa_id,
            NEW.id,
            v_cliente_email,
            'OS ' || v_nome_os || ' Concluída com Sucesso',
            'Olá ' || v_cliente_nome || ', informamos que a sua Ordem de Serviço ' || v_nome_os || ' foi concluída.'
          );
        END IF;
      END IF;

      INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo)
      VALUES (
        NEW.empresa_id,
        NEW.id,
        'suporte@tech-quickops.com',
        'OS ' || v_nome_os || ' FINALIZADA',
        'A ordem de serviço ' || v_nome_os || ' acaba de ser finalizada pelo técnico.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
