-- Adicionar dia_faturamento e modelo_rat_url em clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS dia_faturamento INTEGER;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS modelo_rat_url TEXT;

-- Adicionar endereco_servico em ordens_servico
ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS endereco_servico TEXT;

-- Atualizar view de dashboard de clientes se houver, ou não é necessário pois o frontend usa useQuery.
