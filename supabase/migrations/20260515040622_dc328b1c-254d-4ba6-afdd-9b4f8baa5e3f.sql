
-- Enums
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'gestor', 'analista', 'tecnico');
CREATE TYPE public.os_status AS ENUM ('pendente', 'em_andamento', 'concluido', 'cancelado');

-- Empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfis (1:1 com auth.users)
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT,
  telefone TEXT,
  endereco_completo TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clientes_empresa ON public.clientes(empresa_id);

-- Tecnicos
CREATE TABLE public.tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  perfil TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tecnicos_empresa ON public.tecnicos(empresa_id);

-- Ordens de Servico
CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL DEFAULT '',
  descricao_problema TEXT NOT NULL DEFAULT '',
  solucao TEXT,
  status public.os_status NOT NULL DEFAULT 'pendente',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_agendamento DATE,
  horario_atendimento TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_empresa ON public.ordens_servico(empresa_id);
CREATE INDEX idx_os_cliente ON public.ordens_servico(cliente_id);
CREATE INDEX idx_os_tecnico ON public.ordens_servico(tecnico_id);

-- Security definer: get current user's empresa_id (avoids RLS recursion on perfis)
CREATE OR REPLACE FUNCTION public.get_current_empresa_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.perfis WHERE id = _user_id AND role = _role)
$$;

-- Trigger: on new auth user, create empresa + perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_empresa_id UUID;
  v_nome TEXT;
  v_empresa TEXT;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email);
  v_empresa := COALESCE(NEW.raw_user_meta_data->>'nome_empresa', 'Minha Empresa');

  INSERT INTO public.empresas (nome_fantasia)
  VALUES (v_empresa)
  RETURNING id INTO new_empresa_id;

  INSERT INTO public.perfis (id, empresa_id, nome_completo, role)
  VALUES (NEW.id, new_empresa_id, v_nome, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

-- Policies: empresas
CREATE POLICY "view own empresa" ON public.empresas FOR SELECT TO authenticated
  USING (id = public.get_current_empresa_id());
CREATE POLICY "update own empresa" ON public.empresas FOR UPDATE TO authenticated
  USING (id = public.get_current_empresa_id());

-- Policies: perfis
CREATE POLICY "view perfis same empresa" ON public.perfis FOR SELECT TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
CREATE POLICY "update own perfil" ON public.perfis FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Generic multi-tenant policies for CRUD tables
CREATE POLICY "tenant select" ON public.clientes FOR SELECT TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant insert" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant update" ON public.clientes FOR UPDATE TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant delete" ON public.clientes FOR DELETE TO authenticated
  USING (empresa_id = public.get_current_empresa_id());

CREATE POLICY "tenant select" ON public.tecnicos FOR SELECT TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant insert" ON public.tecnicos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant update" ON public.tecnicos FOR UPDATE TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant delete" ON public.tecnicos FOR DELETE TO authenticated
  USING (empresa_id = public.get_current_empresa_id());

CREATE POLICY "tenant select" ON public.ordens_servico FOR SELECT TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant insert" ON public.ordens_servico FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant update" ON public.ordens_servico FOR UPDATE TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
CREATE POLICY "tenant delete" ON public.ordens_servico FOR DELETE TO authenticated
  USING (empresa_id = public.get_current_empresa_id());
