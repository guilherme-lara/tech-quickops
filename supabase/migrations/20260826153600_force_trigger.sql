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
  
  -- Se o nome ainda for nulo (caso o perfil não tenha nome), usa 'Sistema'
  v_autor_nome := COALESCE(v_autor_nome, 'Sistema');

    -- Se o status mudou especificamente, notifica todo mundo sobre o status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      -- Técnico
      IF NEW.tecnico_id IS NOT NULL THEN
        INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
        SELECT t.user_id, 
               'Status Atualizado: OS ' || v_nome_os, 
               'OS ' || v_nome_os || ' - Alteração de Status de ' || COALESCE(OLD.status::TEXT, 'Sem status') || ' para ' || NEW.status::TEXT || ' por ' || v_autor_nome, 
               'info', '/tecnico/os/' || NEW.id
        FROM public.tecnicos t
        WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
      END IF;

      -- Gestores, Analistas, Admins (da mesma empresa) e Superadmins (globais)
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT id, 
             'Status Atualizado: OS ' || v_nome_os, 
             'OS ' || v_nome_os || ' - Alteração de Status de ' || COALESCE(OLD.status::TEXT, 'Sem status') || ' para ' || NEW.status::TEXT || ' por ' || v_autor_nome, 
             'info', '/os'
      FROM public.perfis 
      WHERE (
              (role IN ('gestor', 'analista', 'admin') AND empresa_id = NEW.empresa_id)
              OR (role = 'superadmin')
            )
        AND COALESCE(ativo, true) = true;
    END IF;

  RETURN NEW;
END;
$$;

-- GARANTIA ABSOLUTA DE VINCULAÇÃO DA TRIGGER NA TABELA
DROP TRIGGER IF EXISTS trigger_notify_os_changes ON public.ordens_servico;
CREATE TRIGGER trigger_notify_os_changes
AFTER UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_os_changes();
