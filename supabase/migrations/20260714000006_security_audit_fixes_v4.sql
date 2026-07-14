-- FRENTE 2: Correção de RLS (Inclusão da role 'admin')
-- O V3 removeu inadvertidamente o acesso da role 'admin'.

-- clientes
DROP POLICY IF EXISTS "gestor/analista insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "gestor/analista update clientes" ON public.clientes;
DROP POLICY IF EXISTS "gestor/analista delete clientes" ON public.clientes;

CREATE POLICY "gestor/analista insert clientes" ON public.clientes FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista update clientes" ON public.clientes FOR UPDATE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista delete clientes" ON public.clientes FOR DELETE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

-- tecnicos
DROP POLICY IF EXISTS "gestor/analista insert tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "gestor/analista update tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "gestor/analista delete tecnicos" ON public.tecnicos;

CREATE POLICY "gestor/analista insert tecnicos" ON public.tecnicos FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista update tecnicos" ON public.tecnicos FOR UPDATE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin') OR id = auth.uid()));

CREATE POLICY "gestor/analista delete tecnicos" ON public.tecnicos FOR DELETE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

-- itens_inventario
DROP POLICY IF EXISTS "gestor/analista insert itens_inventario" ON public.itens_inventario;
DROP POLICY IF EXISTS "gestor/analista update itens_inventario" ON public.itens_inventario;
DROP POLICY IF EXISTS "gestor/analista delete itens_inventario" ON public.itens_inventario;

CREATE POLICY "gestor/analista insert itens_inventario" ON public.itens_inventario FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista update itens_inventario" ON public.itens_inventario FOR UPDATE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista delete itens_inventario" ON public.itens_inventario FOR DELETE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

-- analistas_cliente
DROP POLICY IF EXISTS "gestor/analista insert analistas_cliente" ON public.analistas_cliente;
DROP POLICY IF EXISTS "gestor/analista update analistas_cliente" ON public.analistas_cliente;
DROP POLICY IF EXISTS "gestor/analista delete analistas_cliente" ON public.analistas_cliente;

CREATE POLICY "gestor/analista insert analistas_cliente" ON public.analistas_cliente FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista update analistas_cliente" ON public.analistas_cliente FOR UPDATE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

CREATE POLICY "gestor/analista delete analistas_cliente" ON public.analistas_cliente FOR DELETE TO authenticated
USING (empresa_id = public.get_current_empresa_id() AND (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')));

-- ordens_servico
DROP POLICY IF EXISTS "tenant select os" ON public.ordens_servico;
CREATE POLICY "tenant select os" ON public.ordens_servico FOR SELECT TO authenticated
USING (
  empresa_id = public.get_current_empresa_id() AND 
  (
    public.has_role(auth.uid(), 'gestor') OR 
    public.has_role(auth.uid(), 'analista') OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'superadmin') OR 
    (public.has_role(auth.uid(), 'tecnico') AND tecnico_id = auth.uid())
  )
);

-- Storage
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
         OR public.has_role(auth.uid(), 'admin')
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
         OR public.has_role(auth.uid(), 'admin')
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
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'superadmin')
         OR (public.has_role(auth.uid(), 'tecnico') AND os.tecnico_id = auth.uid())
      )
    )
  )
);
