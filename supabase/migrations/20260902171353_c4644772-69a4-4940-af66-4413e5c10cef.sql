-- 1) Funções de apoio às políticas RLS: precisam ser executáveis por quem consulta
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_empresa_id() TO anon, authenticated;

-- 2) RPC pública do login (busca de e-mail por username): anon + authenticated
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text, text) TO anon, authenticated;

-- 3) Funções de trigger/internas: ninguém chama diretamente
REVOKE ALL ON FUNCTION public.fn_audit_log_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_disparar_email_resend() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_notify_changelog() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_notify_os_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_notify_os_criada_gestao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_os_inventario_movimenta() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_registrar_os_historico() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gen_os_numero() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_codigo_empresa() FROM PUBLIC, anon, authenticated;

-- 4) RPCs administrativas: somente usuários autenticados (com checagem interna de papel)
REVOKE ALL ON FUNCTION public.criar_tecnico(text, text, text, tipo_comissao_enum, numeric, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_tecnico(text, text, text, tipo_comissao_enum, numeric, text, text, jsonb, text) TO authenticated;
REVOKE ALL ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_usuario_backoffice(text, text, text, app_role, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.resetar_senha_tecnico(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resetar_senha_tecnico(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.remover_acesso_backoffice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remover_acesso_backoffice(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.vincular_acesso_tecnico(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vincular_acesso_tecnico(uuid, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.validar_chave_licenca(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_chave_licenca(text) TO authenticated;
REVOKE ALL ON FUNCTION public.gerar_chave_licenca_segura(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_chave_licenca_segura(uuid) TO authenticated;

-- 5) Padroniza search_path na função que estava sem (aviso do linter)
ALTER FUNCTION public.fn_disparar_email_resend() SET search_path = public, extensions;