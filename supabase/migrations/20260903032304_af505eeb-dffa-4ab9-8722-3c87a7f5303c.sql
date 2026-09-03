-- 1) Corrigir criação de usuários de backoffice (conflito com o trigger handle_new_user)
CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(p_nome text, p_username text, p_senha text, p_role app_role, p_telefone text, p_dominio text, p_empresa_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_user_id uuid;
  v_email text;
  v_domain text;
  v_codigo text;
  v_actor uuid := auth.uid();
  v_actor_empresa uuid;
  v_actor_role public.app_role;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT role, empresa_id INTO v_actor_role, v_actor_empresa
    FROM public.perfis WHERE id = v_actor;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('gestor','admin','superadmin') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('gestor','analista','admin') THEN
    RAISE EXCEPTION 'Nível de acesso não permitido.' USING ERRCODE = '42501';
  END IF;

  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id obrigatório' USING ERRCODE = '22023';
  END IF;

  IF v_actor_role <> 'superadmin' AND p_empresa_id IS DISTINCT FROM v_actor_empresa THEN
    RAISE EXCEPTION 'Acesso negado: empresa inválida.' USING ERRCODE = '42501';
  END IF;

  SELECT codigo_empresa INTO v_codigo FROM public.empresas WHERE id = p_empresa_id;
  v_domain := COALESCE(NULLIF(trim(p_dominio), ''), v_codigo || '.techquickops.com');
  v_email  := lower(trim(p_username)) || '@' || v_domain;

  IF EXISTS (
    SELECT 1 FROM public.perfis
    WHERE empresa_id = p_empresa_id AND lower(username) = lower(trim(p_username))
  ) THEN
    RAISE EXCEPTION 'Usuário já cadastrado (pode estar inativo/excluído)' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'E-mail interno % já em uso', v_email USING ERRCODE = '23505';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, crypt(p_senha, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome_completo', p_nome, 'role', p_role, 'empresa_id', p_empresa_id),
    now(), now(), '', '', '', ''
  ) RETURNING id INTO v_user_id;

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email', now(), now(), now()
  );

  -- O trigger handle_new_user já pode ter criado o perfil: completar os dados
  INSERT INTO public.perfis (id, empresa_id, nome_completo, role, username, telefone, ativo)
  VALUES (v_user_id, p_empresa_id, p_nome, p_role, lower(trim(p_username)), p_telefone, true)
  ON CONFLICT (id) DO UPDATE
    SET empresa_id = EXCLUDED.empresa_id,
        nome_completo = EXCLUDED.nome_completo,
        role = EXCLUDED.role,
        username = EXCLUDED.username,
        telefone = EXCLUDED.telefone,
        ativo = true;

  RETURN v_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text, uuid) TO authenticated;

-- 2) Contagem de dependências antes de remover
CREATE OR REPLACE FUNCTION public.contar_dependencias_usuario(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_actor_empresa uuid;
  v_alvo_empresa uuid;
  v_tecnico_id uuid;
  v_os int := 0;
  v_ferramentas int := 0;
  v_historico int := 0;
  v_notificacoes int := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT role, empresa_id INTO v_actor_role, v_actor_empresa FROM public.perfis WHERE id = v_actor;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('gestor','admin','superadmin') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT empresa_id INTO v_alvo_empresa FROM public.perfis WHERE id = p_user_id;
  IF v_alvo_empresa IS NULL THEN
    SELECT empresa_id INTO v_alvo_empresa FROM public.tecnicos WHERE id = p_user_id OR user_id = p_user_id LIMIT 1;
  END IF;
  IF v_alvo_empresa IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_actor_role <> 'superadmin' AND v_alvo_empresa IS DISTINCT FROM v_actor_empresa THEN
    RAISE EXCEPTION 'Acesso negado: usuário de outra empresa.' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_tecnico_id FROM public.tecnicos WHERE id = p_user_id OR user_id = p_user_id LIMIT 1;

  IF v_tecnico_id IS NOT NULL THEN
    SELECT count(*) INTO v_os FROM public.ordens_servico WHERE tecnico_id = v_tecnico_id;
    SELECT COALESCE(sum(quantidade), 0) INTO v_ferramentas FROM public.tecnico_ferramentas WHERE tecnico_id = v_tecnico_id;
  END IF;

  SELECT count(*) INTO v_historico
    FROM public.os_historico
   WHERE alterado_por = p_user_id
      OR (v_tecnico_id IS NOT NULL AND (tecnico_id = v_tecnico_id OR tecnico_user_id = p_user_id));

  SELECT count(*) INTO v_notificacoes FROM public.notificacoes WHERE perfil_id = p_user_id;

  RETURN jsonb_build_object(
    'is_tecnico', v_tecnico_id IS NOT NULL,
    'ordens_servico', v_os,
    'ferramentas', v_ferramentas,
    'historico', v_historico,
    'notificacoes', v_notificacoes,
    'pode_remover', (v_os = 0 AND v_ferramentas = 0 AND v_historico = 0)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.contar_dependencias_usuario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contar_dependencias_usuario(uuid) TO authenticated;

-- 3) Inativar / reativar usuário
CREATE OR REPLACE FUNCTION public.definir_status_usuario(p_user_id uuid, p_ativo boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_actor_empresa uuid;
  v_alvo_empresa uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;
  IF v_actor = p_user_id THEN
    RAISE EXCEPTION 'Não é possível alterar o próprio status.' USING ERRCODE = '42501';
  END IF;

  SELECT role, empresa_id INTO v_actor_role, v_actor_empresa FROM public.perfis WHERE id = v_actor;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('gestor','admin','superadmin') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT empresa_id INTO v_alvo_empresa FROM public.perfis WHERE id = p_user_id;
  IF v_alvo_empresa IS NULL THEN
    SELECT empresa_id INTO v_alvo_empresa FROM public.tecnicos WHERE id = p_user_id OR user_id = p_user_id LIMIT 1;
  END IF;
  IF v_alvo_empresa IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_actor_role <> 'superadmin' AND v_alvo_empresa IS DISTINCT FROM v_actor_empresa THEN
    RAISE EXCEPTION 'Acesso negado: usuário de outra empresa.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.perfis SET ativo = p_ativo WHERE id = p_user_id;
  UPDATE public.tecnicos SET ativo = p_ativo WHERE id = p_user_id OR user_id = p_user_id;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.definir_status_usuario(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_status_usuario(uuid, boolean) TO authenticated;

-- 4) Remoção definitiva com validação de dependências
CREATE OR REPLACE FUNCTION public.remover_acesso_backoffice(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_actor_empresa uuid;
  v_alvo_empresa uuid;
  v_deps jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;
  IF v_actor = p_user_id THEN
    RAISE EXCEPTION 'Não é possível remover o próprio acesso.' USING ERRCODE = '42501';
  END IF;

  SELECT role, empresa_id INTO v_actor_role, v_actor_empresa FROM public.perfis WHERE id = v_actor;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('gestor','admin','superadmin') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT empresa_id INTO v_alvo_empresa FROM public.perfis WHERE id = p_user_id;
  IF v_alvo_empresa IS NULL THEN
    SELECT empresa_id INTO v_alvo_empresa FROM public.tecnicos WHERE id = p_user_id OR user_id = p_user_id LIMIT 1;
  END IF;
  IF v_alvo_empresa IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_actor_role <> 'superadmin' AND v_alvo_empresa IS DISTINCT FROM v_actor_empresa THEN
    RAISE EXCEPTION 'Acesso negado: usuário de outra empresa.' USING ERRCODE = '42501';
  END IF;

  v_deps := public.contar_dependencias_usuario(p_user_id);

  IF NOT (v_deps->>'pode_remover')::boolean THEN
    RAISE EXCEPTION 'Não é possível remover: % OS, % ferramenta(s) e % registro(s) de histórico vinculados. Inative o usuário.',
      v_deps->>'ordens_servico', v_deps->>'ferramentas', v_deps->>'historico'
      USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.notificacoes WHERE perfil_id = p_user_id;
  DELETE FROM public.tecnicos WHERE id = p_user_id OR user_id = p_user_id;
  DELETE FROM public.perfis WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.remover_acesso_backoffice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remover_acesso_backoffice(uuid) TO authenticated;