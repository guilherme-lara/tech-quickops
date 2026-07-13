-- Adiciona a coluna data_vencimento à tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS data_vencimento TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days');

-- Cria a function para validar e renovar a chave
CREATE OR REPLACE FUNCTION public.validar_chave_licenca(p_chave TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
  v_chave_valida BOOLEAN;
BEGIN
  -- Obter a empresa logada
  v_empresa_id := public.get_current_empresa_id();
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Não foi possível identificar a empresa.';
  END IF;

  -- Verifica se a chave fornecida bate com a chave salva no banco
  SELECT EXISTS (
    SELECT 1 FROM public.empresas 
    WHERE id = v_empresa_id 
    AND chave_ativacao = p_chave
    AND chave_ativacao IS NOT NULL
  ) INTO v_chave_valida;

  IF v_chave_valida THEN
    -- Atualiza a data de vencimento para 30 dias a partir de agora
    -- Altera o status para ativo
    -- Invalida a chave (limpa) para que não seja usada novamente
    UPDATE public.empresas
    SET 
      data_vencimento = now() + interval '30 days',
      status_licenca = 'ativo',
      chave_ativacao = NULL
    WHERE id = v_empresa_id;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;
