CREATE OR REPLACE VIEW public.view_dashboard_tecnico
WITH (security_invoker=true) AS
SELECT
  tecnico_id,
  empresa_id,
  date_trunc('month', COALESCE(data_atendimento, created_at))::date AS mes,
  COUNT(*)::int AS total_mes,
  COUNT(*) FILTER (WHERE status IN ('pendente','aprovado','em_andamento'))::int AS pendentes,
  COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluidas,
  COALESCE(SUM(valor) FILTER (WHERE status = 'concluido'), 0)::numeric AS valor_recebido
FROM public.ordens_servico
WHERE tecnico_id IS NOT NULL
GROUP BY tecnico_id, empresa_id, date_trunc('month', COALESCE(data_atendimento, created_at));

GRANT SELECT ON public.view_dashboard_tecnico TO authenticated;