-- Adiciona a coluna de array para múltiplos equipamentos
ALTER TABLE public.ordens_servico 
ADD COLUMN equipamentos_cliente_ids uuid[] DEFAULT '{}';

-- Migra os dados existentes (se equipamento_cliente_id não for nulo, adiciona no array)
UPDATE public.ordens_servico
SET equipamentos_cliente_ids = ARRAY[equipamento_cliente_id]
WHERE equipamento_cliente_id IS NOT NULL;

-- Remove a constraint antiga se existir
ALTER TABLE public.ordens_servico 
DROP CONSTRAINT IF EXISTS ordens_servico_equipamento_cliente_id_fkey;
