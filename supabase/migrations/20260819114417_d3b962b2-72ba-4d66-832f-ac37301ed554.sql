UPDATE public.perfis p
SET role = 'tecnico'::app_role
WHERE p.role <> 'tecnico'::app_role
  AND EXISTS (
    SELECT 1 FROM public.tecnicos t
    WHERE t.user_id = p.id OR t.id = p.id
  );