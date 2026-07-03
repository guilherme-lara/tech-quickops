-- Drop old policies
DROP POLICY IF EXISTS "Gestores podem ver logs da propria empresa" ON public.logs_administrativos;
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.logs_administrativos;

-- Recreate policies with security definer functions to prevent RLS recursion
CREATE POLICY "Gestores podem ver logs da propria empresa"
  ON public.logs_administrativos
  FOR SELECT
  TO authenticated
  USING (
    empresa_id = public.get_current_empresa_id() AND public.has_role(auth.uid(), 'gestor')
  );

CREATE POLICY "Sistema pode inserir logs"
  ON public.logs_administrativos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = public.get_current_empresa_id()
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
