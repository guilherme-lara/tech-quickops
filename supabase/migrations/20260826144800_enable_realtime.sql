-- Habilitar realtime para notificacoes
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
EXCEPTION WHEN OTHERS THEN
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.changelog;
EXCEPTION WHEN OTHERS THEN
END $$;
