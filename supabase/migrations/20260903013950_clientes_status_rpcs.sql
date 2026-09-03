-- Add ativo column to clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- Function to count client dependencies
CREATE OR REPLACE FUNCTION public.contar_dependencias_cliente(p_cliente_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_actor_empresa uuid;
  v_alvo_empresa uuid;
  v_os int := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT role, empresa_id INTO v_actor_role, v_actor_empresa FROM public.perfis WHERE id = v_actor;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('gestor','admin','superadmin','analista') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT empresa_id INTO v_alvo_empresa FROM public.clientes WHERE id = p_cliente_id;
  IF v_alvo_empresa IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  
  IF v_actor_role <> 'superadmin' AND v_alvo_empresa IS DISTINCT FROM v_actor_empresa THEN
    RAISE EXCEPTION 'Acesso negado: cliente de outra empresa.' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_os FROM public.ordens_servico WHERE cliente_id = p_cliente_id;

  RETURN jsonb_build_object(
    'ordens_servico', v_os,
    'pode_remover', (v_os = 0)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.contar_dependencias_cliente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contar_dependencias_cliente(uuid) TO authenticated;

-- Function to set client status
CREATE OR REPLACE FUNCTION public.definir_status_cliente(p_cliente_id uuid, p_ativo boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_actor_empresa uuid;
  v_alvo_empresa uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT role, empresa_id INTO v_actor_role, v_actor_empresa FROM public.perfis WHERE id = v_actor;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('gestor','admin','superadmin','analista') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT empresa_id INTO v_alvo_empresa FROM public.clientes WHERE id = p_cliente_id;
  IF v_alvo_empresa IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_actor_role <> 'superadmin' AND v_alvo_empresa IS DISTINCT FROM v_actor_empresa THEN
    RAISE EXCEPTION 'Acesso negado: cliente de outra empresa.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.clientes SET ativo = p_ativo WHERE id = p_cliente_id;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.definir_status_cliente(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_status_cliente(uuid, boolean) TO authenticated;

-- Function to definitively remove a client
CREATE OR REPLACE FUNCTION public.remover_cliente(p_cliente_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.app_role;
  v_actor_empresa uuid;
  v_alvo_empresa uuid;
  v_deps jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT role, empresa_id INTO v_actor_role, v_actor_empresa FROM public.perfis WHERE id = v_actor;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('gestor','admin','superadmin','analista') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT empresa_id INTO v_alvo_empresa FROM public.clientes WHERE id = p_cliente_id;
  IF v_alvo_empresa IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_actor_role <> 'superadmin' AND v_alvo_empresa IS DISTINCT FROM v_actor_empresa THEN
    RAISE EXCEPTION 'Acesso negado: cliente de outra empresa.' USING ERRCODE = '42501';
  END IF;

  v_deps := public.contar_dependencias_cliente(p_cliente_id);

  IF NOT (v_deps->>'pode_remover')::boolean THEN
    RAISE EXCEPTION 'Não é possível remover: % OS vinculadas. Inative o cliente.',
      v_deps->>'ordens_servico'
      USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.clientes WHERE id = p_cliente_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.remover_cliente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remover_cliente(uuid) TO authenticated;
