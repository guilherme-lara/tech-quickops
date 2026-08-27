-- ==============================================================================
-- ATUALIZAÇÃO DO REMETENTE PARA O DOMÍNIO VERIFICADO (QUICKOPS.JOTATECHINFO.COM.BR)
-- ==============================================================================
-- O motivo do teste do Lovable ter chegado e o nosso não, é porque o nosso
-- gatilho de banco de dados ainda estava configurado para enviar como "onboarding@resend.dev".
--
-- Como você já verificou o domínio, agora vamos atualizar o Gatilho do Banco
-- para usar o seu e-mail oficial (o mesmo que o Lovable usa).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_disparar_email_resend()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payload JSONB;
  v_request_id BIGINT;
  
  -- 🔴 COLOQUE SUA CHAVE AQUI ANTES DE RODAR 🔴
  v_api_key TEXT := 're_suachaveaqui'; 
  
  -- AGORA SIM! O SEU DOMÍNIO VERIFICADO:
  v_from_email TEXT := 'QuickOps <notifyquickops@quickops.jotatechinfo.com.br>'; 
BEGIN
  IF NEW.status = 'enviado' THEN
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object(
    'from', v_from_email,
    'to', NEW.destinatario,
    'subject', NEW.assunto,
    'html', NEW.corpo
  );

  SELECT net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_api_key
      ),
      body := v_payload
  ) INTO v_request_id;

  UPDATE public.email_queue SET status = 'enviado' WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
