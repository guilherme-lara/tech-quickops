ALTER TABLE public.equipamentos_clientes ADD COLUMN patrimonio text;
ALTER TABLE public.equipamentos_clientes ADD COLUMN status text DEFAULT 'em_estoque';
ALTER TABLE public.equipamentos_clientes ADD COLUMN os_id uuid REFERENCES public.ordens_servico(id);
