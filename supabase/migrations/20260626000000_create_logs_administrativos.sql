-- Tabela de logs administrativos para rastreamento de ações
CREATE TABLE IF NOT EXISTS public.logs_administrativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  usuario_nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_logs_empresa_id ON public.logs_administrativos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs_administrativos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_tipo ON public.logs_administrativos(tipo);

-- RLS (Row Level Security)
ALTER TABLE public.logs_administrativos ENABLE ROW LEVEL SECURITY;

-- Política: Gestores podem ver logs da própria empresa
CREATE POLICY "Gestores podem ver logs da propria empresa"
  ON public.logs_administrativos
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.perfis WHERE id = auth.uid() AND role = 'gestor'
    )
  );

-- Política: Sistema pode inserir logs
CREATE POLICY "Sistema pode inserir logs"
  ON public.logs_administrativos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM public.perfis WHERE id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE public.logs_administrativos IS 'Logs administrativos do sistema';
COMMENT ON COLUMN public.logs_administrativos.tipo IS 'Tipo de evento: os_criada, os_status_alterado, os_tecnico_alterado';
COMMENT ON COLUMN public.logs_administrativos.descricao IS 'Descrição human-readable do evento';