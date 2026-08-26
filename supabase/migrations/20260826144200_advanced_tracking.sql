-- ==========================================
-- 1. Fila de E-mails
-- ==========================================
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  destinatario TEXT NOT NULL,
  assunto TEXT NOT NULL,
  corpo TEXT NOT NULL,
  status TEXT DEFAULT 'pendente', -- pendente, enviado, erro
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins podem ver fila de emails" ON public.email_queue;
CREATE POLICY "Admins podem ver fila de emails" ON public.email_queue FOR SELECT USING (true);


-- ==========================================
-- 2. Atualizando Notificações (Gestor/Analista) e E-mails
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_notify_os_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nome_os TEXT;
  v_cliente_email TEXT;
  v_cliente_nome TEXT;
BEGIN
  v_nome_os := COALESCE(NEW.numero, 'OS');

  -- Case 1: Atribuída a um novo técnico
  IF NEW.tecnico_id IS NOT NULL AND (OLD.tecnico_id IS NULL OR OLD.tecnico_id != NEW.tecnico_id) THEN
    -- Notifica Técnico
    INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
    SELECT t.user_id, 'Nova OS Atribuída', 'A OS ' || v_nome_os || ' foi atribuída a você.', 'info', '/tecnico/os/' || NEW.id
    FROM public.tecnicos t
    WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;

    -- Notifica Gestores e Analistas
    INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
    SELECT id, 'OS Atribuída', 'OS ' || v_nome_os || ' atribuída.', 'info', '/os'
    FROM public.perfis WHERE role IN ('gestor', 'analista') AND ativo = true AND empresa_id = NEW.empresa_id;
  END IF;

  -- Case 2: Mudança de status (Qualquer)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notifica Técnico
    IF NEW.tecnico_id IS NOT NULL THEN
      INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
      SELECT t.user_id, 'Status Atualizado', 'A OS ' || v_nome_os || ' mudou para: ' || NEW.status, 'info', '/tecnico/os/' || NEW.id
      FROM public.tecnicos t
      WHERE t.id = NEW.tecnico_id AND t.user_id IS NOT NULL;
    END IF;

    -- Notifica Gestores e Analistas
    INSERT INTO public.notificacoes (perfil_id, titulo, mensagem, tipo, link_acao)
    SELECT id, 'Status OS: ' || NEW.status, 'OS ' || v_nome_os || ' mudou para ' || NEW.status, 'info', '/os'
    FROM public.perfis WHERE role IN ('gestor', 'analista') AND ativo = true AND empresa_id = NEW.empresa_id;

    -- ==========================================
    -- Envio de E-mail (Fila) se for 'concluido'
    -- ==========================================
    IF NEW.status = 'concluido' THEN
      IF NEW.cliente_id IS NOT NULL THEN
        SELECT email, nome INTO v_cliente_email, v_cliente_nome FROM public.clientes WHERE id = NEW.cliente_id;
        
        IF v_cliente_email IS NOT NULL AND v_cliente_email != '' THEN
          INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo)
          VALUES (
            NEW.empresa_id,
            NEW.id,
            v_cliente_email,
            'OS ' || v_nome_os || ' Concluída com Sucesso',
            'Olá ' || v_cliente_nome || ', informamos que a sua Ordem de Serviço ' || v_nome_os || ' foi concluída.'
          );
        END IF;
      END IF;

      -- Email interno / suporte (exemplo)
      INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo)
      VALUES (
        NEW.empresa_id,
        NEW.id,
        'suporte@tech-quickops.com',
        'OS ' || v_nome_os || ' FINALIZADA',
        'A ordem de serviço ' || v_nome_os || ' acaba de ser finalizada pelo técnico.'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;


-- ==========================================
-- 3. Atualizando o Histórico da OS para JSON Automático
-- ==========================================
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
  v_diff_json JSONB;
BEGIN
  -- Se for pelo cron ou sem auth, usar 'Sistema'
  IF v_actor IS NULL THEN
    v_actor_nome := 'Sistema';
  ELSE
    SELECT nome_completo INTO v_actor_nome FROM public.perfis WHERE id = v_actor;
    IF NOT FOUND THEN
      v_actor_nome := 'Sistema (Auto)';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_tipo := CASE WHEN NEW.tecnico_id IS NOT NULL THEN 'criada_atribuida' ELSE 'criada' END;
    IF NEW.tecnico_id IS NOT NULL THEN
      SELECT COALESCE(t.user_id, t.id) INTO v_tec_user_novo FROM public.tecnicos t WHERE t.id = NEW.tecnico_id;
    END IF;

    INSERT INTO public.os_historico (
      os_id, empresa_id, alterado_por, alterado_por_nome, tipo_evento,
      tecnico_id, tecnico_user_id, status_novo, alteracoes
    ) VALUES (
      NEW.id, NEW.empresa_id, v_actor, v_actor_nome, v_tipo,
      NEW.tecnico_id, v_tec_user_novo, NEW.status::text,
      to_jsonb(NEW)
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Calcula a diferença total dinamicamente usando JSONB!
    SELECT jsonb_object_agg(v.key, jsonb_build_object('de', o.value, 'para', v.value))
    INTO v_diff_json
    FROM jsonb_each(to_jsonb(NEW)) v
    JOIN jsonb_each(to_jsonb(OLD)) o ON o.key = v.key
    WHERE v.value IS DISTINCT FROM o.value
      AND v.key NOT IN ('updated_at', 'id');

    v_alteracoes := COALESCE(v_diff_json, '{}'::jsonb);

    IF OLD.tecnico_id IS NOT NULL THEN
      SELECT COALESCE(t.user_id, t.id) INTO v_tec_user_ant FROM public.tecnicos t WHERE t.id = OLD.tecnico_id;
    END IF;
    IF NEW.tecnico_id IS NOT NULL THEN
      SELECT COALESCE(t.user_id, t.id) INTO v_tec_user_novo FROM public.tecnicos t WHERE t.id = NEW.tecnico_id;
    END IF;

    -- Define o tipo de evento principal
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_tipo := 'status_alterado';
    ELSIF OLD.tecnico_id IS DISTINCT FROM NEW.tecnico_id THEN
      v_tipo := CASE WHEN NEW.tecnico_id IS NULL THEN 'desatribuida' ELSE 'reatribuida' END;
    ELSE
      v_tipo := 'alterada';
    END IF;

    -- Só grava se houver alteração
    IF v_alteracoes <> '{}'::jsonb THEN
      INSERT INTO public.os_historico (
        os_id, empresa_id, alterado_por, alterado_por_nome, tipo_evento,
        tecnico_id, tecnico_user_id, tecnico_id_anterior, tecnico_user_id_anterior,
        status_anterior, status_novo, alteracoes
      ) VALUES (
        NEW.id, NEW.empresa_id, v_actor, v_actor_nome, v_tipo,
        NEW.tecnico_id, v_tec_user_novo, OLD.tecnico_id, v_tec_user_ant,
        OLD.status::text, NEW.status::text, v_alteracoes
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;


-- ==========================================
-- 4. Zabbix-lite (Auditoria Universal)
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_audit_log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_nome TEXT := 'Sistema';
  v_empresa_id UUID;
  v_descricao TEXT;
  v_tipo TEXT;
  v_nome_entidade TEXT := 'Registro';
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT nome_completo INTO v_actor_nome FROM public.perfis WHERE id = v_actor;
  END IF;

  -- Tentativa de extrair nome ou id para o log
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_nome_entidade := COALESCE(OLD.nome, OLD.titulo, OLD.numero, OLD.id::text, 'Registro');
      v_empresa_id := OLD.empresa_id;
    ELSE
      v_nome_entidade := COALESCE(NEW.nome, NEW.titulo, NEW.numero, NEW.id::text, 'Registro');
      v_empresa_id := NEW.empresa_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_nome_entidade := 'Registro desconhecido';
  END;

  IF TG_OP = 'INSERT' THEN
    v_tipo := TG_TABLE_NAME || '_criado';
    v_descricao := 'Criação de ' || TG_TABLE_NAME || ': "' || v_nome_entidade || '"';
  ELSIF TG_OP = 'UPDATE' THEN
    v_tipo := TG_TABLE_NAME || '_editado';
    v_descricao := 'Edição em ' || TG_TABLE_NAME || ': "' || v_nome_entidade || '"';
  ELSIF TG_OP = 'DELETE' THEN
    v_tipo := TG_TABLE_NAME || '_excluido';
    v_descricao := 'Exclusão em ' || TG_TABLE_NAME || ': "' || v_nome_entidade || '"';
  END IF;

  IF v_empresa_id IS NOT NULL THEN
    INSERT INTO public.logs_administrativos (empresa_id, usuario_id, usuario_nome, tipo, descricao)
    VALUES (v_empresa_id, v_actor, v_actor_nome, v_tipo, v_descricao);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Atribuir trigger de auditoria a tabelas essenciais (Zabbix-lite)
DROP TRIGGER IF EXISTS trg_audit_clientes ON public.clientes;
CREATE TRIGGER trg_audit_clientes AFTER INSERT OR UPDATE OR DELETE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_tecnicos ON public.tecnicos;
CREATE TRIGGER trg_audit_tecnicos AFTER INSERT OR UPDATE OR DELETE ON public.tecnicos FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_itens ON public.itens_inventario;
CREATE TRIGGER trg_audit_itens AFTER INSERT OR UPDATE OR DELETE ON public.itens_inventario FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_changes();

DROP TRIGGER IF EXISTS trg_audit_equip_cli ON public.equipamentos_clientes;
CREATE TRIGGER trg_audit_equip_cli AFTER INSERT OR UPDATE OR DELETE ON public.equipamentos_clientes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_changes();
