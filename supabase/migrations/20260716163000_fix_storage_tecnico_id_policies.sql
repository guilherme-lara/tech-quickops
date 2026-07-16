-- Corrige as políticas de storage para comparar corretamente o tecnico_id com o id da tabela tecnicos
DROP POLICY IF EXISTS "Tenant download rats and fotos" ON storage.objects;
CREATE POLICY "Tenant download rats and fotos" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('rats', 'fotos') AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os 
      WHERE os.id::text = (string_to_array(name, '/'))[1] 
      AND os.empresa_id = public.get_current_empresa_id()
      AND (
         public.has_role(auth.uid(), 'gestor'::app_role) 
         OR public.has_role(auth.uid(), 'analista'::app_role)
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'superadmin'::app_role)
         OR (
           public.has_role(auth.uid(), 'tecnico'::app_role) 
           AND os.tecnico_id IN (
             SELECT t.id FROM public.tecnicos t WHERE t.user_id = auth.uid() OR t.id = auth.uid()
           )
         )
      )
    )
  )
);

DROP POLICY IF EXISTS "Tenant insert/update/delete rats and fotos" ON storage.objects;
CREATE POLICY "Tenant insert/update/delete rats and fotos" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id IN ('rats', 'fotos') AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os 
      WHERE os.id::text = (string_to_array(name, '/'))[1] 
      AND os.empresa_id = public.get_current_empresa_id()
      AND (
         public.has_role(auth.uid(), 'gestor'::app_role) 
         OR public.has_role(auth.uid(), 'analista'::app_role)
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'superadmin'::app_role)
         OR (
           public.has_role(auth.uid(), 'tecnico'::app_role) 
           AND os.tecnico_id IN (
             SELECT t.id FROM public.tecnicos t WHERE t.user_id = auth.uid() OR t.id = auth.uid()
           )
         )
      )
    )
  )
) WITH CHECK (
  bucket_id IN ('rats', 'fotos') AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os 
      WHERE os.id::text = (string_to_array(name, '/'))[1] 
      AND os.empresa_id = public.get_current_empresa_id()
      AND (
         public.has_role(auth.uid(), 'gestor'::app_role) 
         OR public.has_role(auth.uid(), 'analista'::app_role)
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_role(auth.uid(), 'superadmin'::app_role)
         OR (
           public.has_role(auth.uid(), 'tecnico'::app_role) 
           AND os.tecnico_id IN (
             SELECT t.id FROM public.tecnicos t WHERE t.user_id = auth.uid() OR t.id = auth.uid()
           )
         )
      )
    )
  )
);
