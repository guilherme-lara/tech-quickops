ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ordens_servico_idempotency_key
  ON public.ordens_servico (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pagamentos_tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL DEFAULT public.get_current_empresa_id()
    REFERENCES public.empresas(id) ON DELETE CASCADE,
  tecnico_id UUID REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  tecnico_nome TEXT NOT NULL,
  mes_referencia TEXT NOT NULL
    CHECK (mes_referencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  tipo TEXT NOT NULL CHECK (tipo IN ('integral', 'adiantamento')),
  valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  idempotency_key UUID NOT NULL UNIQUE,
  registrado_por UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_tecnicos_empresa_mes
  ON public.pagamentos_tecnicos (empresa_id, mes_referencia, tecnico_id);

ALTER TABLE public.pagamentos_tecnicos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.pagamentos_tecnicos TO authenticated;

DROP POLICY IF EXISTS "Gestores podem consultar pagamentos de técnicos"
  ON public.pagamentos_tecnicos;

CREATE POLICY "Gestores podem consultar pagamentos de técnicos"
  ON public.pagamentos_tecnicos
  FOR SELECT
  TO authenticated
  USING (
    empresa_id = public.get_current_empresa_id()
    AND (
      public.has_role(auth.uid(), 'gestor')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'superadmin')
    )
  );

DROP POLICY IF EXISTS "Gestores podem registrar pagamentos de técnicos"
  ON public.pagamentos_tecnicos;

CREATE POLICY "Gestores podem registrar pagamentos de técnicos"
  ON public.pagamentos_tecnicos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id = public.get_current_empresa_id()
    AND registrado_por = auth.uid()
    AND (
      public.has_role(auth.uid(), 'gestor')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'superadmin')
    )
    AND (
      tecnico_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.tecnicos
        WHERE id = tecnico_id AND empresa_id = pagamentos_tecnicos.empresa_id
      )
    )
  );
