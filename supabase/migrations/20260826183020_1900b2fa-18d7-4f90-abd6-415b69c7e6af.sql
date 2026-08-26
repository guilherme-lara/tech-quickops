-- 1) Fixa search_path em todas as funções do schema public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND (p.proconfig IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- 2) Revoga EXECUTE de todas as funções public para PUBLIC/anon/authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 3) Reconcede EXECUTE apenas ao que o app realmente chama
DO $$
DECLARE r record;
BEGIN
  -- Funções chamadas por usuários autenticados (RPC) e usadas em políticas RLS
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname IN (
        'has_role',
        'get_current_empresa_id',
        'criar_tecnico',
        'criar_usuario_backoffice',
        'remover_acesso_backoffice',
        'vincular_acesso_tecnico',
        'resetar_senha_tecnico',
        'gerar_chave_licenca_segura',
        'validar_chave_licenca',
        'get_email_by_username'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;

  -- Login por username precisa resolver o e-mail antes de haver sessão
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname = 'get_email_by_username'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.sig);
  END LOOP;
END $$;