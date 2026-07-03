-- Add cidade and base_km on clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS base_km NUMERIC;

-- Add km_viagem on ordens_servico
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS km_viagem NUMERIC NOT NULL DEFAULT 0;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
