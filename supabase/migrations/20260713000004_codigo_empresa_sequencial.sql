-- Cria a sequência para os códigos numéricos das empresas
CREATE SEQUENCE IF NOT EXISTS public.empresas_codigo_seq START 1;

-- Atualiza todas as empresas existentes de forma determinística
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT id FROM public.empresas ORDER BY created_at ASC) LOOP
        UPDATE public.empresas
        SET codigo_empresa = LPAD(nextval('public.empresas_codigo_seq')::text, 5, '0')
        WHERE id = r.id;
    END LOOP;
END;
$$;

-- Torna o código da empresa ÚNICO no banco
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_codigo_empresa_key;
ALTER TABLE public.empresas ADD CONSTRAINT empresas_codigo_empresa_key UNIQUE (codigo_empresa);

-- Cria o gatilho para preencher o código da empresa em novos cadastros automaticamente
CREATE OR REPLACE FUNCTION public.set_codigo_empresa()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_empresa IS NULL OR NEW.codigo_empresa = '' THEN
        NEW.codigo_empresa := LPAD(nextval('public.empresas_codigo_seq')::text, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_codigo_empresa ON public.empresas;
CREATE TRIGGER tr_set_codigo_empresa
BEFORE INSERT ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.set_codigo_empresa();
