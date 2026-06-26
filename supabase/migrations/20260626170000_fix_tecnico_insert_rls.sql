-- Fix: Permitir INSERT em tecnicos para usuários autenticados da mesma empresa
-- Isso restaura a criação automática de técnicos durante a importação de planilhas

-- Primeiro, verificar se a tabela tecnicos existe e tem RLS habilitado
DO $$
BEGIN
  -- Habilitar RLS se não estiver habilitado
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'tecnicos' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Remover políticas antigas se existirem (para recriar)
DROP POLICY IF EXISTS "authenticated insert tecnico" ON public.tecnicos;
DROP POLICY IF EXISTS "view own tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "update own tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "delete own tecnicos" ON public.tecnicos;

-- Política: Gestores podem inserir técnicos na sua empresa
CREATE POLICY "authenticated insert tecnico"
  ON public.tecnicos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.perfis WHERE id = auth.uid()
    )
  );

-- Política: Gestores podem ver técnicos da sua empresa
CREATE POLICY "view own tecnicos"
  ON public.tecnicos
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.perfis WHERE id = auth.uid()
    )
  );

-- Política: Gestores podem atualizar técnicos da sua empresa
CREATE POLICY "update own tecnicos"
  ON public.tecnicos
  FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.perfis WHERE id = auth.uid()
    )
  );

-- Política: Gestores podem deletar técnicos da sua empresa
CREATE POLICY "delete own tecnicos"
  ON public.tecnicos
  FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.perfis WHERE id = auth.uid()
    )
  );

-- Comentário
COMMENT ON TABLE public.tecnicos IS 'Técnicos da equipe de campo';