-- Adiciona a coluna ultimo_mes_pago para rastrear o faturamento mensal pago do cliente
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ultimo_mes_pago TEXT;
