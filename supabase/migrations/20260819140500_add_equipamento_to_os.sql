ALTER TABLE public.ordens_servico ADD COLUMN equipamento_cliente_id uuid REFERENCES public.equipamentos_clientes(id) ON DELETE SET NULL;
