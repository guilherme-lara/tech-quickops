-- Migrar registros existentes para a nova nomenclatura
UPDATE public.ordens_servico
SET status = 'agendamento'
WHERE status IN ('aprovado', 'reagendado');

UPDATE public.ordens_servico
SET status = 'pendencia'
WHERE status = 'pendente';
