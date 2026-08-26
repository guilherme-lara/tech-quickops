/**
 * Mapeia cada tabela do banco para os prefixos de queryKey que dependem dela.
 * Evita que qualquer mudança no banco invalide TODAS as queries abertas.
 */
const TABLE_QUERY_KEYS: Record<string, string[]> = {
  ordens_servico: [
    "ordens_servico",
    "ordens_servico_total",
    "ordens_servico_ativas_tecnico",
    "os_detalhe",
    "os_detalhes",
    "minhas-os",
    "alertas_os",
    "pendencias_os_ativas",
    "active_os_count",
    "kpis_operacionais",
    "kpis_financeiros",
    "produtividade_tecnico",
    "radar_equipe",
    "fila_revisao",
    "dashboard_tecnico_all",
    "ultimas_os_tecnico",
    "tecnico_os_historico_modal",
  ],
  os_historico: ["os_detalhe", "os_detalhes", "tecnico_os_historico_modal"],
  rat_arquivos: ["rat_arquivos", "os_rat_arquivos", "fila_revisao"],
  clientes: ["clientes", "all_clientes", "faturas_pendentes", "kpis_financeiros"],
  equipamentos_clientes: ["equipamentos_clientes"],
  analistas_cliente: ["clientes", "all_clientes"],
  tecnicos: [
    "tecnicos",
    "all_tecnicos",
    "tecnicos_ativos",
    "equipe_tecnicos",
    "radar_equipe",
    "tecnico_self",
    "tecnico_cracha",
    "tecnico_ferramentas",
    "produtividade_tecnico",
  ],
  perfis: [
    "usuarios_sistema",
    "perfil_self",
    "perfil_username",
    "tecnico_cracha",
    "equipe_tecnicos",
  ],
  itens_inventario: ["itens_inventario"],
  notificacoes: ["notificacoes"],
  logs_administrativos: ["logs_administrativos", "logs_administrativos_recentes"],
  changelog: ["changelog"],
  empresas: ["empresa_codigo", "superadmin-empresas", "faturas_pendentes"],
};

/** Retorna os prefixos de queryKey afetados por uma tabela (vazio = invalidar tudo). */
export function queryKeysForTable(table: string | undefined): string[] {
  if (!table) return [];
  return TABLE_QUERY_KEYS[table] ?? [table];
}
