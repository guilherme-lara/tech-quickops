-- Modifica has_role para considerar admin como gestor
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis 
    WHERE id = _user_id 
    AND (role = _role OR (_role = 'gestor'::public.app_role AND role IN ('admin'::public.app_role, 'superadmin'::public.app_role)))
    UNION ALL
    SELECT 1 FROM public.tecnicos WHERE user_id = _user_id AND _role = 'tecnico'::public.app_role
  )
$$;