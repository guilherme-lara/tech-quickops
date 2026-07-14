-- FRENTE 1: Limpeza e Blindagem do Storage (Supabase)
-- Remover políticas antigas e inseguras que causam vazamento
DROP POLICY IF EXISTS "rats authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "rats authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "rats public read" ON storage.objects;
DROP POLICY IF EXISTS "Acesso publico download rats" ON storage.objects;
DROP POLICY IF EXISTS "Acesso gestor upload rats" ON storage.objects;

-- As policies restantes para 'rats' e 'fotos' já foram fixadas no V2, mas para garantir 
-- total aderência à auditoria, recriamos assegurando cruzamento com ordens_servico.
DROP POLICY IF EXISTS "Tenant download rats and fotos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant insert/update/delete rats and fotos" ON storage.objects;

CREATE POLICY "Tenant download rats and fotos" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('rats', 'fotos') AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os 
      WHERE os.id::text = (string_to_array(name, '/'))[1] 
      AND os.empresa_id = public.get_current_empresa_id()
      AND (
         public.has_role(auth.uid(), 'gestor') 
         OR public.has_role(auth.uid(), 'analista')
         OR public.has_role(auth.uid(), 'superadmin')
         OR (public.has_role(auth.uid(), 'tecnico') AND os.tecnico_id = auth.uid())
      )
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
         OR public.has_role(auth.uid(), 'superadmin')
         OR (public.has_role(auth.uid(), 'tecnico') AND os.tecnico_id = auth.uid())
      )
    )
  )
) WITH CHECK (
  bucket_id IN ('rats', 'fotos') AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico os 
      WHERE os.id::text = (string_to_array(name, '/'))[1] 
      AND os.empresa_id = public.get_current_empresa_id()
      AND (
         public.has_role(auth.uid(), 'gestor') 
         OR public.has_role(auth.uid(), 'analista')
         OR public.has_role(auth.uid(), 'superadmin')
         OR (public.has_role(auth.uid(), 'tecnico') AND os.tecnico_id = auth.uid())
      )
    )
  )
);

-- FRENTE 2: RLS e Tabelas (Escalação de Privilégio e Forja de Logs)

-- Tabela perfis (Bloqueio de Injeção): Forçar role 'tecnico' (ou nula) no insert próprio
DROP POLICY IF EXISTS "insert own perfil" ON public.perfis;
CREATE POLICY "insert own perfil" ON public.perfis 
  FOR INSERT TO authenticated 
  WITH CHECK (
    id = auth.uid() AND 
    (role = 'tecnico'::public.app_role OR role IS NULL)
  );

-- Tabela logs_administrativos (Anti-falsificação): Exigir usuario_id = auth.uid()
DROP POLICY IF EXISTS "tenant insert" ON public.logs_administrativos;
DROP POLICY IF EXISTS "tenant insert logs_admin" ON public.logs_administrativos;
CREATE POLICY "tenant insert logs_admin" ON public.logs_administrativos FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = public.get_current_empresa_id() AND
  usuario_id = auth.uid()
);

-- Tabelas de Gestão: Exigir role 'gestor', 'analista' ou 'superadmin' para INSERT, UPDATE, DELETE
-- (Técnicos NÃO podem alterar estoque ou clientes)

-- clientes
DROP POLICY IF EXISTS "tenant insert" ON public.clientes;
DROP POLICY IF EXISTS "tenant update" ON public.clientes;
DROP POLICY IF EXISTS "tenant delete" ON public.clientes;
DROP POLICY IF EXISTS "gestor/analista insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "gestor/analista update clientes" ON public.clientes;
DROP POLICY IF EXISTS "gestor/analista delete clientes" ON public.clientes;

CREATE POLICY "gestor/analista insert clientes" ON public.clientes FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista update clientes" ON public.clientes FOR UPDATE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista delete clientes" ON public.clientes FOR DELETE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

-- tecnicos
DROP POLICY IF EXISTS "tenant insert" ON public.tecnicos;
DROP POLICY IF EXISTS "tenant update" ON public.tecnicos;
DROP POLICY IF EXISTS "tenant delete" ON public.tecnicos;
DROP POLICY IF EXISTS "gestor/analista insert tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "gestor/analista update tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "gestor/analista delete tecnicos" ON public.tecnicos;

CREATE POLICY "gestor/analista insert tecnicos" ON public.tecnicos FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista update tecnicos" ON public.tecnicos FOR UPDATE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin') OR id = auth.uid())); -- Técnico pode atualizar a si mesmo se necessário, ex: avatar (ou não, se você quiser travar geral, remova o `OR id = auth.uid()`). A auditoria foca em estoque/clientes, mas para tecnicos deixaremos atualizar apenas a si, ou via RPC.

CREATE POLICY "gestor/analista delete tecnicos" ON public.tecnicos FOR DELETE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

-- itens_inventario
DROP POLICY IF EXISTS "tenant insert" ON public.itens_inventario;
DROP POLICY IF EXISTS "tenant update" ON public.itens_inventario;
DROP POLICY IF EXISTS "tenant delete" ON public.itens_inventario;
DROP POLICY IF EXISTS "gestor/analista insert itens_inventario" ON public.itens_inventario;
DROP POLICY IF EXISTS "gestor/analista update itens_inventario" ON public.itens_inventario;
DROP POLICY IF EXISTS "gestor/analista delete itens_inventario" ON public.itens_inventario;

CREATE POLICY "gestor/analista insert itens_inventario" ON public.itens_inventario FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista update itens_inventario" ON public.itens_inventario FOR UPDATE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista delete itens_inventario" ON public.itens_inventario FOR DELETE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

-- analistas_cliente
DROP POLICY IF EXISTS "tenant insert" ON public.analistas_cliente;
DROP POLICY IF EXISTS "tenant update" ON public.analistas_cliente;
DROP POLICY IF EXISTS "tenant delete" ON public.analistas_cliente;
DROP POLICY IF EXISTS "gestor/analista insert analistas_cliente" ON public.analistas_cliente;
DROP POLICY IF EXISTS "gestor/analista update analistas_cliente" ON public.analistas_cliente;
DROP POLICY IF EXISTS "gestor/analista delete analistas_cliente" ON public.analistas_cliente;

CREATE POLICY "gestor/analista insert analistas_cliente" ON public.analistas_cliente FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista update analistas_cliente" ON public.analistas_cliente FOR UPDATE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista delete analistas_cliente" ON public.analistas_cliente FOR DELETE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'superadmin')));

-- Visão do Técnico (Histórico): Técnicos não podem ler ordens de serviço de outros
DROP POLICY IF EXISTS "tenant select os" ON public.ordens_servico;
DROP POLICY IF EXISTS "tenant select" ON public.ordens_servico;

CREATE POLICY "tenant select os" ON public.ordens_servico FOR SELECT TO authenticated
USING (
  empresa_id = public.get_current_empresa_id() AND 
  (
    public.has_role(auth.uid(), 'gestor') OR 
    public.has_role(auth.uid(), 'analista') OR 
    public.has_role(auth.uid(), 'superadmin') OR 
    (public.has_role(auth.uid(), 'tecnico') AND tecnico_id = auth.uid())
  )
);


-- FRENTE 3: Funções e Views (Security Definer)
-- Adicionar SET search_path = public nas funções marcadas como SECURITY DEFINER

ALTER FUNCTION public.get_current_empresa_id() SET search_path = public;
ALTER FUNCTION public.has_role(UUID, public.app_role) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.criar_tecnico(TEXT, TEXT, TEXT, public.tipo_comissao_enum, NUMERIC, TEXT, TEXT, JSONB) SET search_path = public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reset_senha_tecnico') THEN
    ALTER FUNCTION public.reset_senha_tecnico(UUID, TEXT) SET search_path = public;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_email_by_username') THEN
    ALTER FUNCTION public.get_email_by_username(TEXT) SET search_path = public;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'criar_usuario_backoffice') THEN
    ALTER FUNCTION public.criar_usuario_backoffice(TEXT, TEXT, TEXT, public.app_role, TEXT) SET search_path = public;
  END IF;
END $$;
