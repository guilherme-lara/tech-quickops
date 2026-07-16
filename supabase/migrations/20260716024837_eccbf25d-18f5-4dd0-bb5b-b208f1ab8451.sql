
-- Recria as políticas de OS para reconhecer técnicos vinculados via tecnicos.user_id
DROP POLICY IF EXISTS "tenant select os" ON public.ordens_servico;
DROP POLICY IF EXISTS "tenant update os" ON public.ordens_servico;

CREATE POLICY "tenant select os" ON public.ordens_servico
FOR SELECT TO authenticated
USING (
  empresa_id = public.get_current_empresa_id()
  AND (
    public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'analista'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      public.has_role(auth.uid(), 'tecnico'::app_role)
      AND tecnico_id IN (
        SELECT t.id FROM public.tecnicos t
        WHERE t.id = auth.uid() OR t.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "tenant update os" ON public.ordens_servico
FOR UPDATE TO authenticated
USING (
  empresa_id = public.get_current_empresa_id()
  AND (
    public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'analista'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      public.has_role(auth.uid(), 'tecnico'::app_role)
      AND tecnico_id IN (
        SELECT t.id FROM public.tecnicos t
        WHERE t.id = auth.uid() OR t.user_id = auth.uid()
      )
    )
  )
);
