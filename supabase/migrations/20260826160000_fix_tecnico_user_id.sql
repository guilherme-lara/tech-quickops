-- Esse script garante que todos os técnicos que têm acesso ao sistema (que podem logar)
-- tenham a coluna user_id devidamente preenchida para receberem notificações.

UPDATE public.tecnicos t
SET user_id = u.id
FROM auth.users u
WHERE t.user_id IS NULL 
  AND t.id = u.id;

UPDATE public.tecnicos t
SET user_id = p.id
FROM public.perfis p
WHERE t.user_id IS NULL
  AND lower(t.username) = lower(p.username)
  AND t.empresa_id = p.empresa_id;
