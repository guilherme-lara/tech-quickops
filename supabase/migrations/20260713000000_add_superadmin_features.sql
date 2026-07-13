-- Adiciona novas colunas à tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS status_licenca VARCHAR(20) DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS chave_ativacao VARCHAR(255);

-- Atualiza políticas de segurança (RLS) para conceder acesso total aos Super Admins
-- Se o usuário tiver a role 'superadmin', ele pode ver e editar TODAS as empresas.

-- Política para SELECT
DROP POLICY IF EXISTS "superadmin_select_all" ON public.empresas;
CREATE POLICY "superadmin_select_all" ON public.empresas 
FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'superadmin'::public.app_role));

-- Política para INSERT
DROP POLICY IF EXISTS "superadmin_insert_all" ON public.empresas;
CREATE POLICY "superadmin_insert_all" ON public.empresas 
FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'superadmin'::public.app_role));

-- Política para UPDATE
DROP POLICY IF EXISTS "superadmin_update_all" ON public.empresas;
CREATE POLICY "superadmin_update_all" ON public.empresas 
FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'superadmin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'superadmin'::public.app_role));

-- Política para DELETE
DROP POLICY IF EXISTS "superadmin_delete_all" ON public.empresas;
CREATE POLICY "superadmin_delete_all" ON public.empresas 
FOR DELETE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'superadmin'::public.app_role));

-- Define o usuário 'guiigo9@gmail.com' como superadmin
UPDATE public.perfis
SET role = 'superadmin'::public.app_role
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'guiigo9@gmail.com'
) OR username = 'guiigo9@gmail.com';
