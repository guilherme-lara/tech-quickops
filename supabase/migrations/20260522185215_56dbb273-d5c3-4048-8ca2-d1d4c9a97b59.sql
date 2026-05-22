DROP POLICY IF EXISTS "authenticated insert empresa" ON public.empresas;

CREATE POLICY "signup insert empresa"
ON public.empresas
FOR INSERT
TO authenticated
WITH CHECK (NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid()));
