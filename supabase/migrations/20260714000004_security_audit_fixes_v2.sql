-- 1. Forçar Habilitação de RLS em TODAS as tabelas do schema public
-- (Isso corrige o alerta "Policy Exists RLS Disabled" e "RLS Disabled in Public")
ALTER TABLE IF EXISTS public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rat_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.logs_administrativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analistas_cliente ENABLE ROW LEVEL SECURITY;

-- 2. Revogar execução pública de funções críticas e aplicar Search Path Mutable
-- (Isso corrige "Public Can Execute SECURITY DEFINER Function" e "Function Search Path Mutable")

-- get_current_empresa_id
REVOKE EXECUTE ON FUNCTION public.get_current_empresa_id() FROM public;
GRANT EXECUTE ON FUNCTION public.get_current_empresa_id() TO authenticated;
-- A search_path já estava definida, mas reforçamos
ALTER FUNCTION public.get_current_empresa_id() SET search_path = public;

-- has_role
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
ALTER FUNCTION public.has_role(UUID, public.app_role) SET search_path = public;

-- handle_new_user
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
-- Triggers são executados pelo banco, mas para manter a segurança:
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- criar_tecnico (Adicionando o SET search_path que faltava e restringindo acesso)
REVOKE EXECUTE ON FUNCTION public.criar_tecnico(TEXT, TEXT, TEXT, public.tipo_comissao_enum, NUMERIC, TEXT, TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.criar_tecnico(TEXT, TEXT, TEXT, public.tipo_comissao_enum, NUMERIC, TEXT, TEXT, JSONB) TO authenticated;

-- Atualizamos a função criar_tecnico para incluir o search_path e garantir que apenas gestores e superadmins possam executá-la
CREATE OR REPLACE FUNCTION public.criar_tecnico(
  p_nome TEXT,
  p_username TEXT,
  p_senha TEXT,
  p_tipo_comissao public.tipo_comissao_enum,
  p_comissao NUMERIC,
  p_telefone TEXT DEFAULT NULL,
  p_chave_pix TEXT DEFAULT NULL,
  p_dados_adicionais JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_empresa_id UUID;
  v_dominio TEXT;
BEGIN
  -- Segurança: Bloquear se não for gestor/superadmin
  IF NOT (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas gestores podem criar técnicos.';
  END IF;

  v_empresa_id := public.get_current_empresa_id();
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Não foi possível identificar a empresa do gestor ativo.';
  END IF;

  SELECT dominio INTO v_dominio FROM public.empresas WHERE id = v_empresa_id;
  IF v_dominio IS NULL THEN
    v_dominio := 'techquickops.com';
  END IF;

  v_email := p_username || '@' || v_dominio;
  
  IF EXISTS (SELECT 1 FROM public.tecnicos WHERE username = p_username) THEN
    RAISE EXCEPTION 'O nome de usuário "%" já está em uso por outro técnico.', p_username;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'O e-mail "%" já está registrado no sistema.', v_email;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(p_senha, gen_salt('bf')), now(), '', '', '', '',
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('nome_completo', p_nome, 'role', 'tecnico', 'empresa_id', v_empresa_id),
    now(), now()
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text, jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email', now(), now(), now()
  );

  INSERT INTO public.tecnicos (
    id, empresa_id, nome, username, telefone, chave_pix, tipo_comissao, comissao, ativo, dados_adicionais
  ) VALUES (
    v_user_id, v_empresa_id, p_nome, p_username, p_telefone, p_chave_pix, p_tipo_comissao, p_comissao, true, p_dados_adicionais
  );

  RETURN v_user_id;
END;
$$;


-- 3. Limites de Tamanho e Tipo de Arquivos no Storage
-- (Isso corrige "No Server-Side File Type or Size Validation on RAT File Uploads")
UPDATE storage.buckets 
SET 
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
WHERE id IN ('rats', 'fotos', 'assets');


-- A PARTIR DAQUI, REAPLICAMOS AS POLICIES DA MIGRAÇÃO ANTERIOR (garantindo que se o script falhou, elas entrarão)

-- 4. Proteção da tabela perfis (Impedir manipulação de roles)
DROP POLICY IF EXISTS "update own perfil" ON public.perfis;
DROP POLICY IF EXISTS "Gestores podem atualizar perfis da empresa" ON public.perfis;

CREATE POLICY "update own perfil" ON public.perfis 
  FOR UPDATE TO authenticated 
  USING (id = auth.uid()) 
  WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()) AND
    role = (SELECT role FROM public.perfis WHERE id = auth.uid())
  );

CREATE POLICY "Gestores podem atualizar perfis da empresa" ON public.perfis
  FOR UPDATE TO authenticated
  USING (
    empresa_id = public.get_current_empresa_id() AND
    (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'superadmin'))
  );

-- 5. Proteção de logs_administrativos
DROP POLICY IF EXISTS "Gestores podem ver logs da propria empresa" ON public.logs_administrativos;
DROP POLICY IF EXISTS "Gestores e superadmins podem ver logs da propria empresa" ON public.logs_administrativos;

CREATE POLICY "Gestores e superadmins podem ver logs da propria empresa"
  ON public.logs_administrativos FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_current_empresa_id() 
    AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'superadmin'))
  );

-- 6. Visão do Técnico em ordens_servico (Ver apenas a si mesmo)
DROP POLICY IF EXISTS "tenant select" ON public.ordens_servico;
DROP POLICY IF EXISTS "tenant select os" ON public.ordens_servico;

CREATE POLICY "tenant select os" ON public.ordens_servico FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_current_empresa_id() 
    AND (
      public.has_role(auth.uid(), 'tecnico') = false 
      OR 
      tecnico_id = auth.uid()
    )
  );

-- 7. RLS e Bloqueios em Buckets de Storage (Tornando buckets privados e criando policies)
UPDATE storage.buckets SET public = false WHERE id IN ('rats', 'fotos');
UPDATE storage.buckets SET public = true WHERE id = 'assets';

DROP POLICY IF EXISTS "Acesso publico download rats" ON storage.objects;
DROP POLICY IF EXISTS "Acesso gestor upload rats" ON storage.objects;
DROP POLICY IF EXISTS "Acesso publico download fotos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso gestor upload fotos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso publico download assets" ON storage.objects;
DROP POLICY IF EXISTS "Acesso gestor upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant download rats and fotos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant insert/update/delete rats and fotos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant download assets" ON storage.objects;
DROP POLICY IF EXISTS "Tenant manage assets" ON storage.objects;

-- NOTA: Sem o comando de ALTER TABLE para o storage.objects aqui (já tem por padrão).

CREATE POLICY "Tenant download rats and fotos" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('rats', 'fotos') AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os 
      WHERE os.id::text = (string_to_array(name, '/'))[1] 
      AND os.empresa_id = public.get_current_empresa_id()
    )
  )
);

CREATE POLICY "Tenant insert/update/delete rats and fotos" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id IN ('rats', 'fotos') AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os 
      WHERE os.id::text = (string_to_array(name, '/'))[1] 
      AND os.empresa_id = public.get_current_empresa_id()
      AND (
         public.has_role(auth.uid(), 'gestor') 
         OR public.has_role(auth.uid(), 'analista')
         OR (public.has_role(auth.uid(), 'tecnico') AND os.tecnico_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Acesso publico assets" ON storage.objects FOR SELECT USING (bucket_id = 'assets');

CREATE POLICY "Tenant manage assets" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'assets');
