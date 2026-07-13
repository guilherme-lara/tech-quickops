-- Adiciona permissões para superadmin ver e inserir logs livremente
DROP POLICY IF EXISTS "superadmin_select_logs" ON public.logs_administrativos;
CREATE POLICY "superadmin_select_logs" ON public.logs_administrativos 
FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'superadmin'::public.app_role));

DROP POLICY IF EXISTS "superadmin_insert_logs" ON public.logs_administrativos;
CREATE POLICY "superadmin_insert_logs" ON public.logs_administrativos 
FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'superadmin'::public.app_role));
