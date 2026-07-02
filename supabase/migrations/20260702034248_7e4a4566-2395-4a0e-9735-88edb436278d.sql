
CREATE TABLE IF NOT EXISTS public.analistas_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_analistas_cliente_cliente ON public.analistas_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_analistas_cliente_empresa ON public.analistas_cliente(empresa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analistas_cliente TO authenticated;
GRANT ALL ON public.analistas_cliente TO service_role;

ALTER TABLE public.analistas_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analistas_select_by_empresa"
  ON public.analistas_cliente FOR SELECT
  TO authenticated
  USING (empresa_id = public.get_current_empresa_id());

CREATE POLICY "analistas_insert_by_empresa"
  ON public.analistas_cliente FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = public.get_current_empresa_id());

CREATE POLICY "analistas_update_by_empresa"
  ON public.analistas_cliente FOR UPDATE
  TO authenticated
  USING (empresa_id = public.get_current_empresa_id())
  WITH CHECK (empresa_id = public.get_current_empresa_id());

CREATE POLICY "analistas_delete_by_empresa"
  ON public.analistas_cliente FOR DELETE
  TO authenticated
  USING (empresa_id = public.get_current_empresa_id());

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS analista_id UUID REFERENCES public.analistas_cliente(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ordens_servico_analista ON public.ordens_servico(analista_id);
