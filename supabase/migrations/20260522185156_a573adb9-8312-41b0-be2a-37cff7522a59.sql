-- Allow authenticated users to insert an empresa (used during signup)
CREATE POLICY "authenticated insert empresa"
ON public.empresas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert their own perfil row
CREATE POLICY "insert own perfil"
ON public.perfis
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());
