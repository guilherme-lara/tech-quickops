ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS valor_adiantado NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS descricao_adiantamento TEXT;