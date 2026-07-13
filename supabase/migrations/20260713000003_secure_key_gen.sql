-- Função segura para gerar chaves de ativação criptografadas
CREATE OR REPLACE FUNCTION public.gerar_chave_licenca_segura(p_empresa_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nova_chave TEXT;
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

    -- Gera uma chave criptográfica pseudo-aleatória no formato TECH-XXXX-XXXX-XXXX
    v_nova_chave := 'TECH-' || 
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
