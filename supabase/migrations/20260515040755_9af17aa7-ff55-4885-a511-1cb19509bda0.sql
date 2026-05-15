
ALTER TYPE public.os_status ADD VALUE IF NOT EXISTS 'aprovado' BEFORE 'em_andamento';

-- Sequence + trigger to auto-generate numero like OS-0001
CREATE SEQUENCE IF NOT EXISTS public.os_numero_seq START 1042;

CREATE OR REPLACE FUNCTION public.gen_os_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'OS-' || nextval('public.os_numero_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gen_os_numero ON public.ordens_servico;
CREATE TRIGGER trg_gen_os_numero
BEFORE INSERT ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.gen_os_numero();

ALTER TABLE public.ordens_servico ALTER COLUMN numero DROP NOT NULL;
