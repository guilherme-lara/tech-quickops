-- Script para diagnosticar o erro exato que está acontecendo na trigger handle_new_user
-- Rode este script no SQL Editor do Supabase para ver o erro detalhado

DO $$
DECLARE
  new_empresa_id uuid;
  v_nome text := 'Teste Diagnostico';
  v_empresa text := 'Empresa Diagnostico';
  v_role text := 'admin';
  v_cnpj text := '12345678901234';
  v_telefone text := '11999999999';
  v_dominio text := 'teste.com';
  v_email text := 'diagnostico@teste.com';
  v_new_id uuid := gen_random_uuid();
  v_err_msg text;
  v_err_detail text;
BEGIN
  BEGIN
    -- 1. Tentativa de inserir na tabela empresas
    INSERT INTO public.empresas (
      nome_fantasia, cnpj, telefone_empresa, dominio, data_vencimento
    ) VALUES (
      v_empresa, v_cnpj, v_telefone, v_dominio, now() + interval '14 days'
    )
    RETURNING id INTO new_empresa_id;
    
    -- 2. Tentativa de inserir na tabela perfis
    INSERT INTO public.perfis (id, empresa_id, nome_completo, role, email, ativo)
    VALUES (v_new_id, new_empresa_id, v_nome, 'admin', v_email, true);
    
    -- Se chegou aqui, o processo ocorreu sem erros. Vamos desfazer para não sujar o banco.
    RAISE NOTICE 'SUCESSO! O insert ocorreu perfeitamente. Nenhuma constraint foi violada.';
    ROLLBACK;
    
  EXCEPTION WHEN OTHERS THEN
    -- Captura o erro real do PostgreSQL!
    GET STACKED DIAGNOSTICS 
      v_err_msg = MESSAGE_TEXT,
      v_err_detail = PG_EXCEPTION_DETAIL;
      
    RAISE EXCEPTION 'ERRO ENCONTRADO: % | DETALHES: %', v_err_msg, v_err_detail;
  END;
END;
$$;
