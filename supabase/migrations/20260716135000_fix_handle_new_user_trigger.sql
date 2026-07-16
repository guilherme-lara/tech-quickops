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
  v_provided_empresa_id := (NEW.raw_user_meta_data->>'empresa_id')::UUID;
  
  -- Se o empresa_id foi passado via metadados (criação via painel backoffice/gestor),
  -- não cria uma nova empresa. Apenas vincula o perfil à empresa existente.
  IF v_provided_empresa_id IS NOT NULL THEN
    INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
    VALUES (NEW.id, v_provided_empresa_id, v_nome, v_role::app_role);
    
    RETURN NEW;
  END IF;

  -- Caso contrário (ex: auto-cadastro inicial da empresa), cria uma nova empresa
  INSERT INTO public.empresas (nome_fantasia, cnpj, telefone_empresa)
  VALUES (v_empresa, v_cnpj, v_telefone)
  RETURNING id INTO new_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
  VALUES (NEW.id, new_empresa_id, v_nome, 'admin');

  RETURN NEW;
END;
$$;
