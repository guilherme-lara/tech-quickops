CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_empresa_id UUID;
  v_nome TEXT;
  v_empresa TEXT;
  v_role TEXT;
  v_provided_empresa_id UUID;
  v_cnpj TEXT;
  v_telefone TEXT;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email);
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  v_empresa := COALESCE(NEW.raw_user_meta_data->>'nome_empresa', 'Minha Empresa');
  v_cnpj := NEW.raw_user_meta_data->>'cnpj';
  v_telefone := NEW.raw_user_meta_data->>'telefone_empresa';
  
  IF v_role = 'tecnico' THEN
    -- Técnico criado por um gestor (não cria empresa nova)
    v_provided_empresa_id := (NEW.raw_user_meta_data->>'empresa_id')::UUID;
    
    INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
    VALUES (NEW.id, v_provided_empresa_id, v_nome, 'tecnico');
    
    RETURN NEW;
  END IF;

  -- Para admin/gestor, cria a empresa (codigo_empresa será gerado pela trigger tr_set_codigo_empresa)
  INSERT INTO public.empresas (nome_fantasia, cnpj, telefone_empresa)
  VALUES (v_empresa, v_cnpj, v_telefone)
  RETURNING id INTO new_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
  VALUES (NEW.id, new_empresa_id, v_nome, 'admin');

  RETURN NEW;
END;
$$;

-- Torna o código da empresa ÚNICO no banco, se ainda não for
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_codigo_empresa_key') THEN
        ALTER TABLE public.empresas ADD CONSTRAINT empresas_codigo_empresa_key UNIQUE (codigo_empresa);
    END IF;
END $$;

-- Assegura que o trigger força a sequence, sem depender de "lower(regexp_replace)"
CREATE OR REPLACE FUNCTION public.set_codigo_empresa()
RETURNS TRIGGER AS $$
BEGIN
    -- Forçar sempre a usar a sequence, a menos que seja passado um código explícito
    IF NEW.codigo_empresa IS NULL OR NEW.codigo_empresa = '' OR NEW.codigo_empresa ~ '[a-zA-Z]' THEN
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
