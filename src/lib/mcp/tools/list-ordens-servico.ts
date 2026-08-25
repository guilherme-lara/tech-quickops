import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_ordens_servico",
  title: "Listar ordens de serviço",
  description:
    "Lista as ordens de serviço visíveis para o usuário autenticado, com filtros opcionais de status, cliente e período.",
  inputSchema: {
    status: z.string().optional().describe("Status da OS (pendente, aprovado, em_andamento, concluido, cancelado, agendamento, reagendado, concluido_tecnico, pendencia, em_deslocamento)."),
    cliente_id: z.string().optional().describe("UUID do cliente."),
    tecnico_id: z.string().optional().describe("UUID do técnico."),
    desde: z.string().optional().describe("Data inicial ISO (created_at >=)."),
    ate: z.string().optional().describe("Data final ISO (created_at <=)."),
    limite: z.number().optional().describe("Quantidade máxima de registros (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, cliente_id, tecnico_id, desde, ate, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado");
    const max = Math.min(Math.max(limite ?? 25, 1), 100);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("ordens_servico")
      .select(
        "id, numero, titulo, status, valor, created_at, data_agendamento, endereco_servico, cliente_id, tecnico_id, clientes(nome), tecnicos(nome)",
      )
      .order("created_at", { ascending: false })
      .limit(max);
    if (status) query = query.eq("status", status as never);
    if (cliente_id) query = query.eq("cliente_id", cliente_id);
    if (tecnico_id) query = query.eq("tecnico_id", tecnico_id);
    if (desde) query = query.gte("created_at", desde);
    if (ate) query = query.lte("created_at", ate);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ total: data?.length ?? 0, ordens: data ?? [] });
  },
});
