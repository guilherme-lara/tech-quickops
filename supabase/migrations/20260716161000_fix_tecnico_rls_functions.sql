-- Corrige get_current_empresa_id para suportar tecnicos
CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()),
    (SELECT empresa_id FROM public.tecnicos WHERE user_id = auth.uid())
  );
$$;

-- Corrige has_role para suportar tecnicos
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis WHERE id = _user_id AND role = _role
    UNION ALL
    SELECT 1 FROM public.tecnicos WHERE user_id = _user_id AND _role = 'tecnico'::public.app_role
  )
$$;
