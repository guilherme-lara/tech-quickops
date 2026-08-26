CREATE OR REPLACE FUNCTION public.fn_notify_os_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nome_os TEXT;
BEGIN
  v_nome_os := COALESCE(NEW.numero, 'OS');

  -- Notifica Técnico se for atribuído a um novo
  IF NEW.tecnico_id IS NOT NULL AND (OLD.tecnico_id IS NULL OR OLD.tecnico_id != NEW.tecnico_id) THEN
    INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
    SELECT t.user_id, 'Nova OS Atribuída', 'A OS ' || v_nome_os || ' foi atribuída a você.', 'info', '/tecnico/os/' || NEW.id
    FROM public.tecnicos t
    WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
  END IF;

  -- Verifica QUALQUER alteração que não seja apenas o updated_at
  IF to_jsonb(OLD) - 'updated_at' IS DISTINCT FROM to_jsonb(NEW) - 'updated_at' THEN
    
    -- Se o status mudou especificamente, notifica todo mundo sobre o status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      -- Técnico
      IF NEW.tecnico_id IS NOT NULL THEN
        INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
        SELECT t.user_id, 'Status Atualizado', 'A OS ' || v_nome_os || ' mudou para: ' || NEW.status, 'info', '/tecnico/os/' || NEW.id
        FROM public.tecnicos t
        WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
      END IF;

      -- Gestores e Analistas
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT id, 'Status OS: ' || NEW.status, 'OS ' || v_nome_os || ' mudou para ' || NEW.status, 'info', '/os'
      FROM public.perfis WHERE role IN ('gestor', 'analista') AND COALESCE(ativo, true) = true AND empresa_id = NEW.empresa_id;
    
    -- Se a alteração não foi no status (foi outro campo)
    ELSE
      -- Apenas Gestores e Analistas
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT id, 'OS Atualizada', 'A OS ' || v_nome_os || ' sofreu alterações.', 'info', '/os'
      FROM public.perfis WHERE role IN ('gestor', 'analista') AND COALESCE(ativo, true) = true AND empresa_id = NEW.empresa_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
