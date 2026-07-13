-- Função segura para gerar chaves de ativação criptografadas
CREATE OR REPLACE FUNCTION public.gerar_chave_licenca_segura(p_empresa_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nova_chave TEXT;
    v_codigo_empresa TEXT;
    v_has_access BOOLEAN;
BEGIN
    -- Verifica se quem chamou é um superadmin
    SELECT EXISTS (
        SELECT 1 FROM public.perfis 
        WHERE id = auth.uid() 
        AND role = 'superadmin'::public.app_role
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado: Apenas Superadmins podem gerar chaves de ativação.';
    END IF;

    -- Busca o código numérico da empresa
    SELECT codigo_empresa INTO v_codigo_empresa
    FROM public.empresas
    WHERE id = p_empresa_id;

    -- Se por acaso a empresa não tiver código ainda, usa TECH
    IF v_codigo_empresa IS NULL OR v_codigo_empresa = '' THEN
        v_codigo_empresa := 'TECH';
    END IF;

    -- Gera uma chave criptográfica pseudo-aleatória no formato CODIGO-XXXX-XXXX-XXXX
    v_nova_chave := v_codigo_empresa || '-' || 
                    upper(substring(gen_random_uuid()::text from 1 for 4)) || '-' || 
                    upper(substring(gen_random_uuid()::text from 1 for 4)) || '-' || 
                    upper(substring(gen_random_uuid()::text from 1 for 4));
    
    -- Salva na tabela da empresa
    UPDATE public.empresas
    SET chave_ativacao = v_nova_chave
    WHERE id = p_empresa_id;

    RETURN v_nova_chave;
END;
$$;
