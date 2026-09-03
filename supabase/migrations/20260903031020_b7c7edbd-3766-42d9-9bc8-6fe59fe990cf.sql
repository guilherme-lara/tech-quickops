GRANT SELECT ON public.email_queue TO authenticated;

DROP POLICY IF EXISTS "Gestores veem emails da sua empresa" ON public.email_queue;
CREATE POLICY "Gestores veem emails da sua empresa"
ON public.email_queue
FOR SELECT
TO authenticated
USING (
  empresa_id = public.get_current_empresa_id()
  AND (
    public.has_role(auth.uid(), 'gestor'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'superadmin'::public.app_role)
  )
);