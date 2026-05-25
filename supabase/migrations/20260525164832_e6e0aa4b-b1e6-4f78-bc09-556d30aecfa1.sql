
-- 1) Colunas faltando em tecnicos
ALTER TABLE public.tecnicos
  ADD COLUMN IF NOT EXISTS comissao NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chave_pix TEXT;

-- 2) Tabela rat_arquivos
CREATE TABLE IF NOT EXISTS public.rat_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rat_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant select rat_arquivos" ON public.rat_arquivos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id = rat_arquivos.ordem_servico_id
      AND os.empresa_id = public.get_current_empresa_id()
  ));

CREATE POLICY "tenant insert rat_arquivos" ON public.rat_arquivos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id = rat_arquivos.ordem_servico_id
      AND os.empresa_id = public.get_current_empresa_id()
  ));

CREATE POLICY "tenant delete rat_arquivos" ON public.rat_arquivos
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id = rat_arquivos.ordem_servico_id
      AND os.empresa_id = public.get_current_empresa_id()
  ));

-- 3) Bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('rats', 'rats', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rats public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'rats');

CREATE POLICY "rats authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rats');

CREATE POLICY "rats authenticated delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'rats');
