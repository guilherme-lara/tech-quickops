-- Add valor_km on clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS valor_km NUMERIC NOT NULL DEFAULT 0;

-- Add despesas JSONB on ordens_servico
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS despesas JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';