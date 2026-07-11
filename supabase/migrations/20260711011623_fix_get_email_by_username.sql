-- Corrigir a função de login para resolver o problema de e-mail de técnicos antigos
-- Técnicos antigos não têm t.id = au.id, o vínculo correto é feito por t.user_id = au.id.

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT au.email INTO v_email
  FROM public.tecnicos t
  JOIN auth.users au ON (t.user_id = au.id OR t.id = au.id)
  WHERE lower(t.username) = lower(p_username)
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;
