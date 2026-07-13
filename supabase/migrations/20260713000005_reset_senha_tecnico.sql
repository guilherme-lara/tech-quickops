-- 1. Cria a RPC resetar_senha_tecnico
CREATE OR REPLACE FUNCTION public.resetar_senha_tecnico(p_tecnico_id UUID, p_nova_senha TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_empresa_id UUID;
    v_target_empresa_id UUID;
    v_has_access BOOLEAN := FALSE;
BEGIN
    -- Verifica o gestor atual
    SELECT empresa_id INTO v_empresa_id
    FROM public.perfis
    WHERE id = auth.uid() AND role IN ('gestor'::public.app_role, 'admin'::public.app_role, 'superadmin'::public.app_role);

    -- Verifica o admin (pode não ter empresa_id)
    IF v_empresa_id IS NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.perfis 
            WHERE id = auth.uid() 
            AND role = 'superadmin'::public.app_role
        ) INTO v_has_access;
    ELSE
        v_has_access := TRUE;
    END IF;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado: Apenas gestores podem resetar senhas.';
    END IF;

    -- Descobre o empresa_id do técnico
    SELECT empresa_id INTO v_target_empresa_id
    FROM public.perfis
    WHERE id = p_tecnico_id;

    IF v_target_empresa_id IS NULL THEN
        RAISE EXCEPTION 'Técnico não encontrado na tabela de perfis.';
    END IF;

    -- Valida empresa
    IF v_empresa_id IS NOT NULL AND v_target_empresa_id != v_empresa_id THEN
        RAISE EXCEPTION 'Acesso negado: Técnico pertence a outra empresa.';
    END IF;

    -- Atualiza a senha na tabela auth.users
    UPDATE auth.users
    SET encrypted_password = crypt(p_nova_senha, gen_salt('bf'))
    WHERE id = p_tecnico_id;

    RETURN TRUE;
END;
$$;
