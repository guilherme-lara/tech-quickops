ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS email_notificacoes TEXT;

CREATE OR REPLACE FUNCTION public.fn_notify_os_criada_gestao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero TEXT;
  v_titulo TEXT;
  v_endereco TEXT;
  v_cliente_nome TEXT;
  v_tec_nome TEXT;
  v_empresa_email TEXT;
  v_empresa_nome TEXT;
  v_dados JSONB;
  v_dest TEXT;
BEGIN
  v_numero := COALESCE(NEW.numero, 'OS');
  v_titulo := COALESCE(to_jsonb(NEW)->>'titulo', to_jsonb(NEW)->>'descricao_problema', 'Ordem de Serviço');
  v_endereco := COALESCE(to_jsonb(NEW)->>'endereco_servico', '');

  IF NEW.cliente_id IS NOT NULL THEN
    SELECT nome INTO v_cliente_nome FROM public.clientes WHERE id = NEW.cliente_id;
  END IF;
  IF NEW.tecnico_id IS NOT NULL THEN
    SELECT nome INTO v_tec_nome FROM public.tecnicos WHERE id = NEW.tecnico_id;
  END IF;

  SELECT email_notificacoes, nome_fantasia
    INTO v_empresa_email, v_empresa_nome
    FROM public.empresas WHERE id = NEW.empresa_id;

  v_dados := jsonb_build_object(
    'numero', v_numero,
    'titulo', v_titulo,
    'cliente_nome', v_cliente_nome,
    'tecnico_nome', v_tec_nome,
    'status', NEW.status::text,
    'endereco', v_endereco,
    'empresa_nome', v_empresa_nome
  );

  IF v_empresa_email IS NOT NULL AND v_empresa_email <> '' THEN
    INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
    VALUES (NEW.empresa_id, NEW.id, v_empresa_email,
      'Nova OS ' || v_numero || ' criada — QuickOps',
      'A OS ' || v_numero || ' foi criada.',
      'os_criada_gestao', v_dados);
  ELSE
    FOR v_dest IN
      SELECT DISTINCT u.email
      FROM public.perfis p
      JOIN auth.users u ON u.id = p.id
      WHERE p.empresa_id = NEW.empresa_id
        AND COALESCE(p.ativo, true) = true
        AND p.role IN ('gestor', 'admin', 'superadmin')
        AND u.email IS NOT NULL
        AND u.email <> ''
        AND u.email NOT LIKE '%techquickops.com'
    LOOP
      INSERT INTO public.email_queue (empresa_id, os_id, destinatario, assunto, corpo, tipo, dados)
      VALUES (NEW.empresa_id, NEW.id, v_dest,
        'Nova OS ' || v_numero || ' criada — QuickOps',
        'A OS ' || v_numero || ' foi criada.',
        'os_criada_gestao', v_dados);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_os_criada_gestao ON public.ordens_servico;
CREATE TRIGGER trg_notify_os_criada_gestao
AFTER INSERT ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_os_criada_gestao();