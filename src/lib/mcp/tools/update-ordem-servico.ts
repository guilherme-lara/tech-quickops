import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "update_ordem_servico",
  title: "Atualizar ordem de serviço",
  description: "Atualiza status, técnico responsável, agendamento, valor ou solução de uma ordem de serviço existente.",
  inputSchema: {
    id: z.string().describe("UUID da ordem de serviço."),
    status: z.string().optional().describe("Novo status da OS."),
    tecnico_id: z.string().optional().describe("UUID do técnico responsável."),
    data_agendamento: z.string().optional().describe("Nova data/hora de agendamento em ISO."),
    valor: z.number().optional().describe("Novo valor do serviço."),
    solucao: z.string().optional().describe("Solução aplicada."),
    pendencias_detalhes: z.string().optional().describe("Detalhes das pendências."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, ...campos }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado");
    const patch = Object.fromEntries(
      Object.entries(campos).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(patch).length === 0) return errorResult("Informe ao menos um campo para atualizar.");

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("ordens_servico")
      .update(patch as never)
      .eq("id", id)
      .select("id, numero, titulo, status, tecnico_id, valor")
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Ordem de serviço não encontrada ou sem permissão de alteração.");
    return textResult({ atualizada: data });
  },
});
