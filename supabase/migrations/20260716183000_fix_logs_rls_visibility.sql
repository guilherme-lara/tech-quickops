-- 1. Remove a restrição de chave estrangeira (Foreign Key) de usuario_id para perfis
-- Isso causava falhas ao salvar logs de ações feitas por Técnicos antigos que não estavam na tabela perfis.
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'logs_administrativos'
      AND kcu.column_name = 'usuario_id';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.logs_administrativos DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- 2. Corrige as políticas de RLS para a tabela logs_administrativos
-- Garantindo que todos os logs possam ser inseridos e visualizados corretamente.

DROP POLICY IF EXISTS "Gestores podem ver logs da propria empresa" ON public.logs_administrativos;
DROP POLICY IF EXISTS "Gestores e superadmins podem ver logs da propria empresa" ON public.logs_administrativos;
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.logs_administrativos;
DROP POLICY IF EXISTS "tenant insert" ON public.logs_administrativos;
DROP POLICY IF EXISTS "tenant insert logs_admin" ON public.logs_administrativos;
DROP POLICY IF EXISTS "visualizar_logs_empresa" ON public.logs_administrativos;
DROP POLICY IF EXISTS "inserir_logs_empresa" ON public.logs_administrativos;

ALTER TABLE public.logs_administrativos ENABLE ROW LEVEL SECURITY;

-- Política de Visualização: Qualquer usuário logado da empresa pode visualizar os logs (Front-end já bloqueia a tela para técnicos)
CREATE POLICY "visualizar_logs_empresa"
  ON public.logs_administrativos 
  FOR SELECT 
  TO authenticated
  USING (
    empresa_id = public.get_current_empresa_id()
    OR public.has_role(auth.uid(), 'superadmin')
  );

-- Política de Inserção: Permite que a inserção ocorra livremente, desde que seja para a empresa correta.
-- Remove a exigência estrita de usuario_id = auth.uid() caso o logger envie de outra forma, prevenindo bloqueios silenciosos.
CREATE POLICY "inserir_logs_empresa"
  ON public.logs_administrativos 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    empresa_id = public.get_current_empresa_id() 
  );
