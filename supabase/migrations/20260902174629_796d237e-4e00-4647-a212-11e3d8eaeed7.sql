
-- Políticas de Storage para contratos de técnicos
CREATE POLICY "contratos_select_backoffice" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contratos' AND (
  public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
));

CREATE POLICY "contratos_insert_backoffice" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contratos' AND (
  public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
));

CREATE POLICY "contratos_update_backoffice" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'contratos' AND (
  public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
));

CREATE POLICY "contratos_delete_backoffice" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contratos' AND (
  public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
));

-- Tempo real para as tabelas que faltavam
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['os_historico','rat_arquivos','equipamentos_clientes','analistas_cliente','os_inventario','tecnico_ferramentas','perfis','empresas']
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
