CREATE OR REPLACE FUNCTION public.fn_notify_os_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nome_os TEXT;
  v_autor_nome TEXT := 'Sistema';
BEGIN
  v_nome_os := COALESCE(NEW.numero, 'OS');

  -- Tenta descobrir o nome de quem fez a alteração
  IF auth.uid() IS NOT NULL THEN
    SELECT nome_completo INTO v_autor_nome FROM public.perfis WHERE id = auth.uid();
  END IF;
  
  v_autor_nome := COALESCE(v_autor_nome, 'Sistema');

  IF TG_OP = 'INSERT' THEN
    -- 1. Nova OS Criada
    -- Notifica o Técnico (se já nascer atribuída)
    IF NEW.tecnico_id IS NOT NULL THEN
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT t.user_id, 
             'Nova OS Atribuída: ' || v_nome_os, 
             'Uma nova OS (' || v_nome_os || ') foi criada e atribuída a você por ' || v_autor_nome || '.', 
             'info', '/tecnico/os/' || NEW.id
      FROM public.tecnicos t
      WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
    END IF;

    -- Notifica Gestores e Analistas
    INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
    SELECT id, 
           'Nova OS Criada: ' || v_nome_os, 
           'A OS ' || v_nome_os || ' foi criada por ' || v_autor_nome || '.', 
           'info', '/os?id=' || NEW.id
    FROM public.perfis 
    WHERE role IN ('gestor', 'analista', 'admin', 'superadmin')
      AND empresa_id = NEW.empresa_id
      AND COALESCE(ativo, true) = true;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 2. OS Atualizada

    -- Notifica Técnico se for atribuído a um novo técnico
    IF NEW.tecnico_id IS NOT NULL AND (OLD.tecnico_id IS NULL OR OLD.tecnico_id != NEW.tecnico_id) THEN
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT t.user_id, 
             'Nova OS Atribuída: ' || v_nome_os, 
             'A OS ' || v_nome_os || ' foi atribuída a você por ' || v_autor_nome || '.', 
             'info', '/tecnico/os/' || NEW.id
      FROM public.tecnicos t
      WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
    END IF;

    -- Verifica se houve mudança de STATUS
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      
      -- Notifica Técnico (Gestor aprovou/recusou/alterou status)
      IF NEW.tecnico_id IS NOT NULL THEN
        INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
        SELECT t.user_id, 
               'Status Atualizado: OS ' || v_nome_os, 
               'OS ' || v_nome_os || ' - Alteração de Status de ' || COALESCE(OLD.status::TEXT, 'Sem status') || ' para ' || NEW.status::TEXT || ' por ' || v_autor_nome, 
               'info', '/tecnico/os/' || NEW.id
        FROM public.tecnicos t
        WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
      END IF;

      -- Notifica Gestores, Analistas, Admins e Superadmins (Técnico iniciou/concluiu/alterou status)
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT id, 
             'Status Atualizado: OS ' || v_nome_os, 
             'OS ' || v_nome_os || ' - Alteração de Status de ' || COALESCE(OLD.status::TEXT, 'Sem status') || ' para ' || NEW.status::TEXT || ' por ' || v_autor_nome, 
             'info', '/os?id=' || NEW.id
      FROM public.perfis 
      WHERE role IN ('gestor', 'analista', 'admin', 'superadmin')
        AND empresa_id = NEW.empresa_id
        AND COALESCE(ativo, true) = true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- GARANTIA ABSOLUTA DE VINCULAÇÃO DA TRIGGER PARA INSERT E UPDATE
DROP TRIGGER IF EXISTS trigger_notify_os_changes ON public.ordens_servico;
CREATE TRIGGER trigger_notify_os_changes
AFTER INSERT OR UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_os_changes();
