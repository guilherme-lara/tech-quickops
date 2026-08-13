-- Fase 1: Inventário de Ferramentas
ALTER TABLE public.itens_inventario 
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'insumo',
ADD COLUMN IF NOT EXISTS descricao text;

CREATE TABLE IF NOT EXISTS public.tecnico_ferramentas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    item_id uuid REFERENCES public.itens_inventario(id) ON DELETE CASCADE NOT NULL,
    tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE CASCADE NOT NULL,
    quantidade integer NOT NULL DEFAULT 1,
    data_atribuicao timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- RLS para tecnico_ferramentas
ALTER TABLE public.tecnico_ferramentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver ferramentas de tecnicos" 
ON public.tecnico_ferramentas FOR SELECT 
USING (
    empresa_id = (SELECT get_current_empresa_id())
);

CREATE POLICY "Gestores podem gerenciar ferramentas de tecnicos" 
ON public.tecnico_ferramentas FOR ALL 
USING (
    empresa_id = (SELECT get_current_empresa_id())
)
WITH CHECK (
    empresa_id = (SELECT get_current_empresa_id())
);

-- Fase 2: Equipamentos de Clientes
CREATE TABLE IF NOT EXISTS public.equipamentos_clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    nome text NOT NULL,
    modelo text,
    numero_serie text,
    data_recebimento date,
    fotos text[] DEFAULT '{}',
    nota_fiscal text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS para equipamentos_clientes
ALTER TABLE public.equipamentos_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver equipamentos_clientes" 
ON public.equipamentos_clientes FOR SELECT 
USING (
    empresa_id = (SELECT get_current_empresa_id())
);

CREATE POLICY "Gestores podem gerenciar equipamentos_clientes" 
ON public.equipamentos_clientes FOR ALL 
USING (
    empresa_id = (SELECT get_current_empresa_id())
)
WITH CHECK (
    empresa_id = (SELECT get_current_empresa_id())
);

-- Criação do Bucket "equipamentos"
INSERT INTO storage.buckets (id, name, public) 
VALUES ('equipamentos', 'equipamentos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS do Bucket "equipamentos"
CREATE POLICY "Acesso autenticado ao bucket equipamentos"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'equipamentos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Acesso insercao bucket equipamentos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'equipamentos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Acesso atualizacao bucket equipamentos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'equipamentos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Acesso delete bucket equipamentos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'equipamentos' 
    AND auth.role() = 'authenticated'
);
