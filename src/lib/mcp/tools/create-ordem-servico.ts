import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, empresaIdDoUsuario, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "create_ordem_servico",
  title: "Criar ordem de serviço",
  description: "Cria uma nova ordem de serviço na empresa do usuário autenticado.",
  inputSchema: {
    titulo: z.string().describe("Título da OS."),
    cliente_id: z.string().describe("UUID do cliente."),
    descricao_problema: z.string().describe("Descrição do problema relatado."),
    tecnico_id: z.string().optional().describe("UUID do técnico responsável."),
    endereco_servico: z.string().optional().describe("Endereço onde o serviço será executado."),
    data_agendamento: z.string().optional().describe("Data/hora de agendamento em ISO."),
    valor: z.number().optional().describe("Valor do serviço."),
    status: z.string().optional().describe("Status inicial (padrão: pendente)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado");
    try {
      const empresa_id = await empresaIdDoUsuario(ctx);
      const supabase = supabaseForUser(ctx);
      const { data, error } = await supabase
        .from("ordens_servico")
        .insert({
          empresa_id,
          titulo: input.titulo,
          cliente_id: input.cliente_id,
          descricao_problema: input.descricao_problema,
          tecnico_id: input.tecnico_id ?? null,
          endereco_servico: input.endereco_servico ?? null,
          data_agendamento: input.data_agendamento ?? null,
          valor: input.valor ?? 0,
          status: (input.status ?? "pendente") as never,
        })
        .select("id, numero, titulo, status")
        .single();
      if (error) return errorResult(error.message);
      return textResult({ criada: data });
    } catch (e) {
      return errorResult((e as Error).message);
    }
  },
});
