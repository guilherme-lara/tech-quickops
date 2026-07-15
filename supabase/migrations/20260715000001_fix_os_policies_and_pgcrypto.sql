-- 1. Restaurar acesso à extensão pgcrypto para funções que usam gen_salt e crypt
-- O script de auditoria de segurança (v2, v3, v4) definiu search_path = public nessas funções,
-- o que impedia o PostgreSQL de encontrar as funções do pgcrypto (normalmente na schema extensions).

ALTER FUNCTION public.criar_tecnico(TEXT, TEXT, TEXT, public.tipo_comissao_enum, NUMERIC, TEXT, TEXT, JSONB) 
SET search_path = public, extensions;

-- Opcionalmente tratar as outras funções se elas existirem (usando blocos DO para não quebrar caso a func não exista)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resetar_senha_tecnico') THEN
    ALTER FUNCTION public.resetar_senha_tecnico(UUID, TEXT) SET search_path = public, extensions;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'criar_usuario_backoffice') THEN
    ALTER FUNCTION public.criar_usuario_backoffice(TEXT, TEXT, TEXT, public.app_role, TEXT) SET search_path = public, extensions;
  END IF;
END $$;

-- 2. Corrigir políticas RLS de ordens_servico que foram removidas acidentalmente nos scripts de auditoria
-- A v3/v4 só deixaram o SELECT, impedindo criação e atualização de OS.

DROP POLICY IF EXISTS "tenant insert os" ON public.ordens_servico;
DROP POLICY IF EXISTS "tenant update os" ON public.ordens_servico;
DROP POLICY IF EXISTS "tenant delete os" ON public.ordens_servico;
DROP POLICY IF EXISTS "gestor/analista insert os" ON public.ordens_servico;
DROP POLICY IF EXISTS "gestor/analista update os" ON public.ordens_servico;
DROP POLICY IF EXISTS "gestor/analista delete os" ON public.ordens_servico;

CREATE POLICY "tenant insert os" ON public.ordens_servico FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = public.get_current_empresa_id() AND 
  (
    public.has_role(auth.uid(), 'gestor') OR 
    public.has_role(auth.uid(), 'analista') OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'superadmin')
  )
);

CREATE POLICY "tenant update os" ON public.ordens_servico FOR UPDATE TO authenticated
USING (
  empresa_id = public.get_current_empresa_id() AND 
  (
    public.has_role(auth.uid(), 'gestor') OR 
    public.has_role(auth.uid(), 'analista') OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'superadmin') OR 
    (public.has_role(auth.uid(), 'tecnico') AND tecnico_id = auth.uid())
  )
);

CREATE POLICY "tenant delete os" ON public.ordens_servico FOR DELETE TO authenticated
USING (
  empresa_id = public.get_current_empresa_id() AND 
  (
    public.has_role(auth.uid(), 'gestor') OR 
    public.has_role(auth.uid(), 'analista') OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'superadmin')
  )
);
