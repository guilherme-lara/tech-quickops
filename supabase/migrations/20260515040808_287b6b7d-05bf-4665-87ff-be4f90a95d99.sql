
CREATE OR REPLACE FUNCTION public.gen_os_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'OS-' || nextval('public.os_numero_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;
