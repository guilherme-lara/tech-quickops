
-- 1) Tabela de histórico
CREATE TABLE IF NOT EXISTS public.os_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  alterado_por UUID,
  alterado_por_nome TEXT,
  tipo_evento TEXT NOT NULL, -- 'criada' | 'atribuida' | 'reatribuida' | 'status_alterado' | 'alterada'
  tecnico_id UUID,
  tecnico_user_id UUID,
  tecnico_id_anterior UUID,
  tecnico_user_id_anterior UUID,
  status_anterior TEXT,
  status_novo TEXT,
  alteracoes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_historico_os_id ON public.os_historico(os_id);
CREATE INDEX IF NOT EXISTS idx_os_historico_empresa_id ON public.os_historico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_os_historico_tecnico_id ON public.os_historico(tecnico_id);

-- 2) Grants
GRANT SELECT ON public.os_historico TO authenticated;
GRANT ALL ON public.os_historico TO service_role;

-- 3) RLS
ALTER TABLE public.os_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "os_historico select gestores" ON public.os_historico;
CREATE POLICY "os_historico select gestores" ON public.os_historico
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_current_empresa_id()
    AND (
      public.has_role(auth.uid(), 'gestor'::app_role)
      OR public.has_role(auth.uid(), 'analista'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'superadmin'::app_role)
    )
  );

DROP POLICY IF EXISTS "os_historico select tecnico" ON public.os_historico;
CREATE POLICY "os_historico select tecnico" ON public.os_historico
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.get_current_empresa_id()
    AND public.has_role(auth.uid(), 'tecnico'::app_role)
    AND tecnico_id IN (
      SELECT t.id FROM public.tecnicos t
      WHERE t.id = auth.uid() OR t.user_id = auth.uid()
    )
  );

-- 4) Função de trigger
CREATE OR REPLACE FUNCTION public.fn_registrar_os_historico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_nome TEXT;
  v_tipo TEXT;
  v_tec_user_novo UUID;
  v_tec_user_ant UUID;
  v_alteracoes JSONB := '{}'::jsonb;
BEGIN
  -- Nome do usuário que fez a alteração
  SELECT nome_completo INTO v_actor_nome
    FROM public.perfis WHERE id = v_actor;

  -- Resolve user_id do técnico novo
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.tecnico_id IS NOT NULL THEN
      SELECT COALESCE(t.user_id, t.id) INTO v_tec_user_novo
        FROM public.tecnicos t WHERE t.id = NEW.tecnico_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_tipo := CASE WHEN NEW.tecnico_id IS NOT NULL THEN 'criada_atribuida' ELSE 'criada' END;

    INSERT INTO public.os_historico (
      os_id, empresa_id, alterado_por, alterado_por_nome, tipo_evento,
      tecnico_id, tecnico_user_id, status_novo, alteracoes
    ) VALUES (
      NEW.id, NEW.empresa_id, v_actor, v_actor_nome, v_tipo,
      NEW.tecnico_id, v_tec_user_novo, NEW.status::text,
      jsonb_build_object(
        'numero', NEW.numero,
        'titulo', NEW.titulo,
        'cliente_id', NEW.cliente_id
      )
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- user_id do técnico anterior
    IF OLD.tecnico_id IS NOT NULL THEN
      SELECT COALESCE(t.user_id, t.id) INTO v_tec_user_ant
        FROM public.tecnicos t WHERE t.id = OLD.tecnico_id;
    END IF;

    -- Detecta tipo do evento
    IF OLD.tecnico_id IS DISTINCT FROM NEW.tecnico_id THEN
      v_tipo := CASE
        WHEN OLD.tecnico_id IS NULL THEN 'atribuida'
        WHEN NEW.tecnico_id IS NULL THEN 'desatribuida'
        ELSE 'reatribuida'
      END;
      v_alteracoes := v_alteracoes || jsonb_build_object(
        'tecnico_id', jsonb_build_object('de', OLD.tecnico_id, 'para', NEW.tecnico_id),
        'tecnico_user_id', jsonb_build_object('de', v_tec_user_ant, 'para', v_tec_user_novo)
      );
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      v_tipo := 'status_alterado';
    ELSE
      v_tipo := 'alterada';
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_alteracoes := v_alteracoes || jsonb_build_object(
        'status', jsonb_build_object('de', OLD.status::text, 'para', NEW.status::text)
      );
    END IF;
    IF OLD.titulo IS DISTINCT FROM NEW.titulo THEN
      v_alteracoes := v_alteracoes || jsonb_build_object(
        'titulo', jsonb_build_object('de', OLD.titulo, 'para', NEW.titulo)
      );
    END IF;
    IF OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
      v_alteracoes := v_alteracoes || jsonb_build_object(
        'cliente_id', jsonb_build_object('de', OLD.cliente_id, 'para', NEW.cliente_id)
      );
    END IF;
    IF OLD.valor IS DISTINCT FROM NEW.valor THEN
      v_alteracoes := v_alteracoes || jsonb_build_object(
        'valor', jsonb_build_object('de', OLD.valor, 'para', NEW.valor)
      );
    END IF;

    -- Só grava se houve algo relevante
    IF v_alteracoes <> '{}'::jsonb OR v_tipo IN ('atribuida','reatribuida','desatribuida','status_alterado') THEN
      INSERT INTO public.os_historico (
        os_id, empresa_id, alterado_por, alterado_por_nome, tipo_evento,
        tecnico_id, tecnico_user_id,
        tecnico_id_anterior, tecnico_user_id_anterior,
        status_anterior, status_novo, alteracoes
      ) VALUES (
        NEW.id, NEW.empresa_id, v_actor, v_actor_nome, v_tipo,
        NEW.tecnico_id, v_tec_user_novo,
        OLD.tecnico_id, v_tec_user_ant,
        OLD.status::text, NEW.status::text, v_alteracoes
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- 5) Trigger
DROP TRIGGER IF EXISTS trg_os_historico_ins ON public.ordens_servico;
CREATE TRIGGER trg_os_historico_ins
  AFTER INSERT ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_os_historico();

DROP TRIGGER IF EXISTS trg_os_historico_upd ON public.ordens_servico;
CREATE TRIGGER trg_os_historico_upd
  AFTER UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_os_historico();
