-- ==============================================================================
-- RESTAURAÇÃO DA FUNÇÃO AVANÇADA DE CRIAÇÃO DE USUÁRIOS
-- ==============================================================================
-- O erro "Este usuário já está cadastrado, mas não tem cadastrado" ocorre porque
-- o usuário provavelmente foi "desativado" (excluído logicamente) e sumiu da tela,
-- mas o e-mail ou username dele ainda existe no banco de dados oculto.
--
-- Para resolver isso (e outros problemas de segurança), estou restaurando a versão
-- mais robusta e completa da função de criação, que avisa exatamente o que houve
-- e gera os e-mails com o código real da empresa (ex: @suaempresa.techquickops.com).
-- ==============================================================================

-- Remove qualquer rastro de versões bagunçadas
DROP FUNCTION IF EXISTS public.criar_usuario_backoffice(text, text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.criar_usuario_backoffice(text, text, text, public.app_role, text, text, uuid);

CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(
  p_nome text, 
  p_username text, 
  p_senha text, 
  p_role public.app_role, 
  p_telefone text, 
  p_dominio text, 
  p_empresa_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
-- A correção do gen_salt mantida aqui:
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_domain text;
  v_codigo text;
  v_existing_id uuid;
  v_was_created boolean;
  v_started timestamptz := clock_timestamp();
  v_actor uuid := auth.uid();
  v_actor_nome text;
  v_actor_empresa uuid;
  v_actor_role public.app_role;
BEGIN
  -- AUTHZ: somente gestor/admin/superadmin autenticados
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT role, empresa_id INTO v_actor_role, v_actor_empresa
    FROM public.perfis WHERE id = v_actor;

  IF v_actor_role IS NULL OR v_actor_role NOT IN ('gestor','admin','superadmin') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  -- Allow-list de papéis atribuíveis (nunca superadmin)
  IF p_role NOT IN ('gestor','analista','admin') THEN
    RAISE EXCEPTION 'Nível de acesso não permitido.' USING ERRCODE = '42501';
  END IF;

  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id obrigatório' USING ERRCODE = '22023';
  END IF;

  -- Isolamento multi-tenant: só superadmin cria fora da própria empresa
  IF v_actor_role <> 'superadmin' AND p_empresa_id IS DISTINCT FROM v_actor_empresa THEN
    RAISE EXCEPTION 'Acesso negado: empresa inválida.' USING ERRCODE = '42501';
  END IF;

  SELECT codigo_empresa INTO v_codigo FROM public.empresas WHERE id = p_empresa_id;
  v_domain := COALESCE(NULLIF(trim(p_dominio), ''), v_codigo || '.techquickops.com');
  v_email  := lower(trim(p_username)) || '@' || v_domain;

  -- Verifica se o usuário já existe na empresa (mesmo se estiver inativo/escondido)
  IF EXISTS (
    SELECT 1 FROM public.perfis
    WHERE empresa_id = p_empresa_id AND lower(username) = lower(trim(p_username))
  ) THEN
    -- Aqui avisamos o motivo exato
    RAISE EXCEPTION 'Usuário já cadastrado (pode estar inativo/excluído)' USING ERRCODE = '23505';
  END IF;
  
  -- Se o e-mail exato já existir em auth.users, também avisa
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_email
  ) THEN
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

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role, username, telefone, ativo)
  VALUES (v_user_id, p_empresa_id, p_nome, p_role, lower(trim(p_username)), p_telefone, true);

  -- Log de auditoria (opcional se você não usar logs de segurança)
  BEGIN
    INSERT INTO public.logs_administrativos (
      empresa_id, ator_id, ator_nome, ator_role, acao, entidade_tipo, entidade_id, detalhes, ip_address, user_agent, duracao_ms, status
    ) VALUES (
      p_empresa_id, v_actor, COALESCE(v_actor_nome, 'Sistema'), v_actor_role,
      'criar_usuario_backoffice', 'perfil', v_user_id,
      jsonb_build_object('username', p_username, 'role', p_role, 'email_gerado', v_email),
      current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
      current_setting('request.headers', true)::jsonb->>'user-agent',
      EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000,
      'sucesso'
    );
  EXCEPTION WHEN OTHERS THEN 
    -- Ignora erro de log silenciosamente
  END;

  RETURN v_user_id;
END;
$$;
