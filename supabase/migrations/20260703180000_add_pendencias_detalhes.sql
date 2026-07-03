-- Add pendencias_detalhes on ordens_servico
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS pendencias_detalhes TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
