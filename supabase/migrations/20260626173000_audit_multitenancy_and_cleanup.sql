-- ============================================================
-- AUDITORIA DE MULTI-TENANCY E SCRIPT DE LIMPEZA
-- ============================================================
-- Este script:
-- 1. Verifica a estrutura de multi-tenancy
-- 2. Identifica o empresa_id correto para guiigo9@gmail.com
-- 3. Remove todos os dados dessa empresa (cascade delete)
-- ============================================================

-- ============================================================
-- PASSO 1: AUDITORIA - Verificar estrutura
-- ============================================================

-- Verificar se as tabelas têm empresa_id
SELECT 
  'ordens_servico' as tabela,
  COUNT(*) as total_registros,
  COUNT(empresa_id) as com_empresa_id,
  COUNT(*) - COUNT(empresa_id) as sem_empresa_id
FROM public.ordens_servico
UNION ALL
SELECT 
  'clientes' as tabela,
  COUNT(*) as total_registros,
  COUNT(empresa_id) as com_empresa_id,
  COUNT(*) - COUNT(empresa_id) as sem_empresa_id
FROM public.clientes
UNION ALL
SELECT 
  'tecnicos' as tabela,
  COUNT(*) as total_registros,
  COUNT(empresa_id) as com_empresa_id,
  COUNT(*) - COUNT(empresa_id) as sem_empresa_id
FROM public.tecnicos;

-- ============================================================
-- PASSO 2: IDENTIFICAR EMPRESA DO USUÁRIO
-- ============================================================

-- Buscar empresa_id pelo email do usuário
SELECT 
  p.id as perfil_id,
  p.nome_completo,
  p.role,
  p.empresa_id,
  e.nome_fantasia as empresa_nome,
  u.email
FROM public.perfis p
JOIN public.empresas e ON e.id = p.empresa_id
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'guiigo9@gmail.com';

-- ============================================================
-- PASSO 3: SCRIPT DE LIMPEZA (usar após identificar empresa_id)
-- ============================================================

-- IMPORTANTE: Execute este bloco APENAS após confirmar o empresa_id correto
-- Substitua 'SEU_EMPRESA_ID_AQUI' pelo ID retornado na consulta acima

/*
DO $$
DECLARE
  v_empresa_id UUID := 'SEU_EMPRESA_ID_AQUI'; -- Substitua aqui
  v_count_os INTEGER;
  v_count_clientes INTEGER;
  v_count_tecnicos INTEGER;
BEGIN
  -- Contar registros antes de deletar
  SELECT COUNT(*) INTO v_count_os FROM public.ordens_servico WHERE empresa_id = v_empresa_id;
  SELECT COUNT(*) INTO v_count_clientes FROM public.clientes WHERE empresa_id = v_empresa_id;
  SELECT COUNT(*) INTO v_count_tecnicos FROM public.tecnicos WHERE empresa_id = v_empresa_id;

  RAISE NOTICE 'Empresa ID: %', v_empresa_id;
  RAISE NOTICE 'Registros encontrados: % OS, % clientes, % técnicos', 
    v_count_os, v_count_clientes, v_count_tecnicos;

  -- Deletar em ordem correta (respeitando foreign keys)
  -- 1. Deletar OSs (tem FK para clientes e tecnicos)
  DELETE FROM public.ordens_servico 
  WHERE empresa_id = v_empresa_id;
  
  -- 2. Deletar clientes
  DELETE FROM public.clientes 
  WHERE empresa_id = v_empresa_id;
  
  -- 3. Deletar técnicos
  DELETE FROM public.tecnicos 
  WHERE empresa_id = v_empresa_id;

  RAISE NOTICE 'Limpeza concluída! Registros removidos: % OS, % clientes, % técnicos', 
    v_count_os, v_count_clientes, v_count_tecnicos;
END $$;
*/

-- ============================================================
-- PASSO 4: VERIFICAÇÃO DE RLS
-- ============================================================

-- Listar todas as políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clientes', 'tecnicos', 'ordens_servico', 'empresas', 'perfis')
ORDER BY tablename, cmd;

-- ============================================================
-- PASSO 5: VERIFICAR SE RLS ESTÁ FUNCIONANDO
-- ============================================================

-- Esta query deve retornar APENAS os dados da empresa do usuário logado
-- Se retornar dados de outras empresas, o RLS não está funcionando
SELECT 
  'Teste RLS - OS por empresa' as teste,
  empresa_id,
  COUNT(*) as quantidade
FROM public.ordens_servico
GROUP BY empresa_id
ORDER BY quantidade DESC;

-- ============================================================
-- DIAGNÓSTICO
-- ============================================================

-- Se o PASSO 1 mostrar registros SEM empresa_id, o multi-tenancy está quebrado
-- Se o PASSO 2 não retornar resultados, o usuário não tem perfil
-- Se o PASSO 4 não mostrar políticas, o RLS não está configurado
-- Se o PASSO 5 retornar múltiplas empresas, o RLS não está filtrando

-- ============================================================
-- AÇÕES CORRETIVAS (se necessário)
-- ============================================================

-- Se houver registros sem empresa_id, atribuir a empresa correta:
/*
UPDATE public.ordens_servico 
SET empresa_id = 'ID_DA_EMPRESA_CORRETA'
WHERE empresa_id IS NULL;

UPDATE public.clientes 
SET empresa_id = 'ID_DA_EMPRESA_CORRETA'
WHERE empresa_id IS NULL;

UPDATE public.tecnicos 
SET empresa_id = 'ID_DA_EMPRESA_CORRETA'
WHERE empresa_id IS NULL;
*/

-- Se o RLS não estiver funcionando, recriar políticas:
/*
ALTER TABLE public.ordens_servico DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant select" ON public.ordens_servico;
DROP POLICY IF EXISTS "tenant insert" ON public.ordens_servico;
DROP POLICY IF EXISTS "tenant update" ON public.ordens_servico;
DROP POLICY IF EXISTS "tenant delete" ON public.ordens_servico;

CREATE POLICY "tenant select" ON public.ordens_servico FOR SELECT TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant insert" ON public.ordens_servico FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant update" ON public.ordens_servico FOR UPDATE TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant delete" ON public.ordens_servico FOR DELETE TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
*/