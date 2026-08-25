import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_tecnicos",
  title: "Listar técnicos",
  description: "Lista os técnicos da empresa do usuário autenticado, com busca opcional por nome.",
  inputSchema: {
    busca: z.string().optional().describe("Trecho do nome do técnico."),
    apenas_ativos: z.boolean().optional().describe("Retornar somente técnicos ativos (padrão true)."),
    limite: z.number().optional().describe("Quantidade máxima de registros (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, apenas_ativos, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado");
    const max = Math.min(Math.max(limite ?? 25, 1), 100);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("tecnicos")
      .select("id, nome, telefone, ativo, perfil, username")
      .order("nome")
      .limit(max);
    if (apenas_ativos !== false) query = query.eq("ativo", true);
    if (busca) query = query.ilike("nome", `%${busca}%`);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ total: data?.length ?? 0, tecnicos: data ?? [] });
  },
});
