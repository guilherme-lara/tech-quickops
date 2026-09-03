import type { QueryClient } from "@tanstack/react-query";

/**
 * Chaves de cache afetadas por qualquer mudança em Ordens de Serviço.
 * Usado após ações do técnico/analista para que listas, dashboards e
 * indicadores reflitam a alteração imediatamente.
 */
const OS_QUERY_KEYS = [
  "os",
  "ordens",
  "ordens_servico",
  "minhas-os",
  "os_detalhe",
  "dashboard_tecnico_all",
  "ultimas_os_tecnico",
  "tecnico_historico",
  "kpis_operacionais",
  "fila_revisao",
  "radar_equipe",
  "active_os_count",
  "kpis_data",
  "desempenho_tecnicos",
  "gestor_dashboard",
  "tempo_real",
  "os_historico",
];

export function invalidateOS(qc: QueryClient) {
  OS_QUERY_KEYS.forEach((key) => {
    qc.invalidateQueries({ queryKey: [key] });
  });
}

/** Opções padrão para telas de acompanhamento "ao vivo". */
export const liveQueryOptions = {
  staleTime: 15_000,
  refetchOnMount: "always" as const,
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
};
