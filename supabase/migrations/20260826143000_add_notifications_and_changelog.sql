-- 1) Create notificacoes table
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  tipo TEXT DEFAULT 'info',
  link_acao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for notificacoes
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas próprias notificações" 
ON public.notificacoes FOR SELECT 
USING (auth.uid() = perfil_id);

CREATE POLICY "Usuários podem atualizar suas notificações (ex: marcar lida)" 
ON public.notificacoes FOR UPDATE 
USING (auth.uid() = perfil_id);

CREATE POLICY "Usuários podem deletar suas notificações" 
ON public.notificacoes FOR DELETE 
USING (auth.uid() = perfil_id);

-- System or admin can insert (bypassing RLS or via trigger with security definer)
-- We'll allow triggers (which run as security definer) to insert.


-- 2) Create changelog table
CREATE TABLE IF NOT EXISTS public.changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  versao TEXT,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for changelog
ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados podem ver o changelog"
ON public.changelog FOR SELECT
TO authenticated
USING (true);

-- Only admins/superadmins can insert/update changelog
CREATE POLICY "Admins podem gerenciar changelog"
ON public.changelog FOR ALL
USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));


-- 3) Trigger: Nova versão de Changelog -> Notifica todos
CREATE OR REPLACE FUNCTION public.fn_notify_changelog()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a notification for every active user
  INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
  SELECT id, 'Nova Atualização: ' || NEW.titulo, NEW.descricao, 'changelog', '#changelog'
  FROM public.perfis
  WHERE ativo = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_changelog ON public.changelog;
CREATE TRIGGER trigger_notify_changelog
AFTER INSERT ON public.changelog
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_changelog();


-- 4) Trigger: Alteração em Ordem de Serviço (Status ou Atribuição) -> Notifica Técnico
CREATE OR REPLACE FUNCTION public.fn_notify_os_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nome_os TEXT;
BEGIN
  v_nome_os := COALESCE(NEW.numero, 'OS');

  -- Case 1: Atribuída a um novo técnico
  IF NEW.tecnico_id IS NOT NULL AND (OLD.tecnico_id IS NULL OR OLD.tecnico_id != NEW.tecnico_id) THEN
    -- Check if tecnico_id maps to a valid auth user (through tecnicos table)
    -- tecnicos.user_id = perfis.id
    INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
    SELECT t.user_id, 'Nova OS Atribuída', 'A OS ' || v_nome_os || ' foi atribuída a você.', 'info', '/tecnico/os/' || NEW.id
    FROM public.tecnicos t
    WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
  END IF;

  -- Case 2: Mudança de status
  IF OLD.status != NEW.status THEN
    -- Notify the technical responsible if they exist
    IF NEW.tecnico_id IS NOT NULL THEN
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT t.user_id, 'Status Atualizado', 'A OS ' || v_nome_os || ' mudou para: ' || NEW.status, 'info', '/tecnico/os/' || NEW.id
      FROM public.tecnicos t
      WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_os_changes ON public.ordens_servico;
CREATE TRIGGER trigger_notify_os_changes
AFTER UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_os_changes();
