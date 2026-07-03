-- Add valor_por_km on clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS valor_por_km NUMERIC;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
