REVOKE EXECUTE ON FUNCTION public.get_current_empresa_id() FROM anon;

DROP POLICY IF EXISTS "view perfis same empresa" ON public.perfis;
CREATE POLICY "view own perfil"
ON public.perfis
FOR SELECT
TO authenticated
USING (id = auth.uid());