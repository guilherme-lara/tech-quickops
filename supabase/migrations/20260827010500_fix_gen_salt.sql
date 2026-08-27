-- Corrige o problema "function gen_salt(unknown) does not exist"
-- Ocorre porque o search_path da função não incluía o schema 'extensions'
-- onde a extensão pgcrypto está instalada.

CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(
  p_nome text,
  p_username text,
  p_senha text,
  p_role text,
  p_telefone text DEFAULT NULL::text,
  p_dominio text DEFAULT NULL::text,
  p_empresa_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
-- AQUI ESTÁ A CORREÇÃO: Adicionado 'extensions' ao search_path
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_empresa_id uuid;
BEGIN
  v_empresa_id := COALESCE(p_empresa_id, public.get_current_empresa_id());
  IF NOT (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')) THEN
    RAISE EXCEPTION 'Sem permissão para criar usuário interno';
  END IF;
  IF p_role = 'superadmin' THEN
    RAISE EXCEPTION 'Não é permitido criar um superadmin por esta interface';
  END IF;

  v_email := p_username || COALESCE(p_dominio, '@' || v_empresa_id || '.interno');
  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
    crypt(p_senha, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nome_completo', p_nome, 'username', p_username, 'telefone', p_telefone),
    now(), now()
  );

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role, telefone, username, ativo)
  VALUES (v_user_id, v_empresa_id, p_nome, p_role::public.app_role, p_telefone, p_username, true);

  RETURN v_user_id;
END;
$$;
