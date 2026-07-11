-- Adicionar novos status caso não existam
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'agendamento';
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'concluido_tecnico';
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'pendencia';

-- O Supabase (PostgreSQL) executa adições de enum fora de transação em versões mais antigas,
-- Mas no Supabase atual funciona bem. No entanto, é seguro.
