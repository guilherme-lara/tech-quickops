-- Rename dia_faturamento to dia_pagamento
ALTER TABLE public.clientes RENAME COLUMN dia_faturamento TO dia_pagamento;

-- Add dia_envio_planilha
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS dia_envio_planilha INTEGER;
