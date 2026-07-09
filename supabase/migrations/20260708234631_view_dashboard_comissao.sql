CREATE OR REPLACE VIEW public.view_dashboard_tecnico
WITH (security_invoker=true) AS
SELECT
  o.tecnico_id,
  o.empresa_id,
  date_trunc('month', COALESCE(o.data_atendimento, o.created_at))::date AS mes,
  COUNT(*)::int AS total_mes,
  COUNT(*) FILTER (WHERE o.status IN ('pendente','aprovado','em_andamento'))::int AS pendentes,
  COUNT(*) FILTER (WHERE o.status = 'concluido')::int AS concluidas,
  COALESCE(
    SUM(
      CASE 
        WHEN t.tipo_comissao = 'fixo' THEN t.comissao
        WHEN t.tipo_comissao = 'porcentagem' THEN (o.valor * t.comissao) / 100
        ELSE 0
      END
    ) FILTER (WHERE o.status = 'concluido'), 0
  )::numeric AS valor_recebido
FROM public.ordens_servico o
JOIN public.tecnicos t ON t.id = o.tecnico_id
WHERE o.tecnico_id IS NOT NULL
GROUP BY o.tecnico_id, o.empresa_id, date_trunc('month', COALESCE(o.data_atendimento, o.created_at));

GRANT SELECT ON public.view_dashboard_tecnico TO authenticated;
