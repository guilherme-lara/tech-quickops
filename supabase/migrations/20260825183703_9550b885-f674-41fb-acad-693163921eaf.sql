-- 1. Harden criar_usuario_backoffice (all overloads)
CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(p_nome text, p_username text, p_senha text, p_role app_role, p_dominio text DEFAULT '@techquickops.com'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RAISE EXCEPTION 'Função obsoleta. Use criar_usuario_backoffice(p_nome, p_username, p_senha, p_role, p_telefone, p_dominio, p_empresa_id).';
END;
$function$;

CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(p_nome text, p_username text, p_senha text, p_role app_role, p_telefone text DEFAULT NULL::text, p_dominio text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN public.criar_usuario_backoffice(
    p_nome, p_username, p_senha, p_role, p_telefone, p_dominio,
    public.get_current_empresa_id()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.criar_usuario_backoffice(p_nome text, p_username text, p_senha text, p_role app_role, p_telefone text, p_dominio text, p_empresa_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF EXISTS (
    SELECT 1 FROM public.perfis
    WHERE empresa_id = p_empresa_id AND lower(username) = lower(trim(p_username))
  ) THEN
    RAISE EXCEPTION 'Usuário já cadastrado nesta empresa' USING ERRCODE = '23505';
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

  SELECT id INTO v_existing_id FROM public.perfis WHERE id = v_user_id;
  v_was_created := v_existing_id IS NULL;

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role, username, telefone)
  VALUES (v_user_id, p_empresa_id, p_nome, p_role, lower(trim(p_username)), p_telefone)
  ON CONFLICT (id) DO UPDATE SET
    empresa_id    = EXCLUDED.empresa_id,
    nome_completo = EXCLUDED.nome_completo,
    role          = EXCLUDED.role,
    username      = EXCLUDED.username,
    telefone      = EXCLUDED.telefone;

  SELECT nome_completo INTO v_actor_nome FROM public.perfis WHERE id = v_actor;

  INSERT INTO public.logs_administrativos (empresa_id, tipo, descricao, usuario_id, usuario_nome)
  VALUES (
    p_empresa_id,
    CASE WHEN v_was_created THEN 'perfil_criado' ELSE 'perfil_atualizado_upsert' END,
    format(
      '[criar_usuario_backoffice] %s perfil %s (user_id=%s, role=%s, username=%s, actor=%s, duracao_ms=%s)',
      CASE WHEN v_was_created THEN 'INSERT' ELSE 'UPSERT UPDATE' END,
      p_nome, v_user_id, p_role, lower(trim(p_username)),
      COALESCE(v_actor_nome, v_actor::text, 'system'),
      round(extract(epoch FROM clock_timestamp() - v_started) * 1000)::int
    ),
    v_actor,
    v_actor_nome
  );

  RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.logs_administrativos (empresa_id, tipo, descricao, usuario_id, usuario_nome)
    VALUES (
      p_empresa_id, 'perfil_erro',
      format('[criar_usuario_backoffice] FAIL sqlstate=%s message=%s username=%s role=%s',
             SQLSTATE, SQLERRM, p_username, p_role),
      v_actor, v_actor_nome
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RAISE;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text, uuid) TO authenticated;

-- 2. handle_new_user: não confiar em role/empresa_id vindos do cliente
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_empresa_id UUID;
  v_nome TEXT;
  v_empresa TEXT;
  v_role TEXT;
  v_provided_empresa_id UUID;
  v_cnpj TEXT;
  v_telefone TEXT;
  v_actor UUID := auth.uid();
  v_actor_role public.app_role;
  v_actor_empresa UUID;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email);
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  v_empresa := COALESCE(NEW.raw_user_meta_data->>'nome_empresa', 'Minha Empresa');
  v_cnpj := NEW.raw_user_meta_data->>'cnpj';
  v_telefone := NEW.raw_user_meta_data->>'telefone_empresa';
  v_provided_empresa_id := NULLIF(NEW.raw_user_meta_data->>'empresa_id','')::UUID;

  IF v_actor IS NOT NULL THEN
    SELECT role, empresa_id INTO v_actor_role, v_actor_empresa
      FROM public.perfis WHERE id = v_actor;
  END IF;

  -- Só honra empresa_id/role informados quando a criação parte de um
  -- gestor/admin/superadmin autenticado da MESMA empresa (fluxos RPC internos).
  IF v_provided_empresa_id IS NOT NULL
     AND v_actor_role IN ('gestor','admin','superadmin')
     AND (v_actor_role = 'superadmin' OR v_actor_empresa = v_provided_empresa_id)
     AND v_role IN ('gestor','admin','analista','tecnico')
  THEN
    INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
    VALUES (NEW.id, v_provided_empresa_id, v_nome, v_role::app_role)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Auto-cadastro público: sempre cria uma NOVA empresa e o usuário é admin dela.
  INSERT INTO public.empresas (nome_fantasia, cnpj, telefone_empresa, data_vencimento)
  VALUES (v_empresa, v_cnpj, v_telefone, now() + interval '14 days')
  RETURNING id INTO new_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
  VALUES (NEW.id, new_empresa_id, v_nome, 'admin')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 3. Storage bucket "equipamentos": escopo por empresa (path: <empresa_id>/...)
DROP POLICY IF EXISTS "Acesso autenticado ao bucket equipamentos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso insercao bucket equipamentos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso atualizacao bucket equipamentos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso delete bucket equipamentos" ON storage.objects;

CREATE POLICY "equipamentos_select_tenant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'equipamentos'
  AND (
    (storage.foldername(name))[1] = public.get_current_empresa_id()::text
    OR EXISTS (
      SELECT 1 FROM public.equipamentos_clientes e
      WHERE e.empresa_id = public.get_current_empresa_id()
        AND (e.fotos IS NOT NULL AND storage.objects.name = ANY (e.fotos))
    )
  )
);

CREATE POLICY "equipamentos_insert_tenant"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'equipamentos'
  AND (storage.foldername(name))[1] = public.get_current_empresa_id()::text
);

CREATE POLICY "equipamentos_update_tenant"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'equipamentos'
  AND (storage.foldername(name))[1] = public.get_current_empresa_id()::text
)
WITH CHECK (
  bucket_id = 'equipamentos'
  AND (storage.foldername(name))[1] = public.get_current_empresa_id()::text
);

CREATE POLICY "equipamentos_delete_tenant"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'equipamentos'
  AND (storage.foldername(name))[1] = public.get_current_empresa_id()::text
);

-- 4. Todas as views públicas passam a usar security_invoker
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'v'
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', r.relname);
  END LOOP;
END $$;