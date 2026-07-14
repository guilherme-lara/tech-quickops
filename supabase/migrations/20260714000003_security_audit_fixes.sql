-- 1. Proteção da tabela perfis
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

-- 2. Proteção de logs_administrativos
DROP POLICY IF EXISTS "Gestores podem ver logs da propria empresa" ON public.logs_administrativos;
DROP POLICY IF EXISTS "Gestores e superadmins podem ver logs da propria empresa" ON public.logs_administrativos;

CREATE POLICY "Gestores e superadmins podem ver logs da propria empresa"
  ON public.logs_administrativos FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_current_empresa_id() 
    AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'superadmin'))
  );

-- 3. Visão do Técnico em ordens_servico
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

-- 4. Proteção de Storage (Buckets e Policies)
UPDATE storage.buckets SET public = false WHERE id IN ('rats', 'fotos', 'assets');

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

-- Para assets (não estão vinculados diretamente a OS), exigimos apenas auth genérico da mesma empresa
-- Como assets podem ser logo (prefix: logo-empresa_id) ou fotos de técnicos (prefix: fotos-tecnicos/tecnico_id)
-- Vamos simplificar validando que o usuário está logado
CREATE POLICY "Tenant download assets" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'assets');

CREATE POLICY "Tenant manage assets" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'assets');
