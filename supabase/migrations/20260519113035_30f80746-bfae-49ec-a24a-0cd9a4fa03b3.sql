CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_empresa_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_empresa_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_empresa_id() TO authenticated;