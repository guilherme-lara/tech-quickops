import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_inventario",
  title: "Listar inventário",
  description: "Lista os itens de inventário da empresa do usuário autenticado, com busca opcional por nome.",
  inputSchema: {
    busca: z.string().optional().describe("Trecho do nome do item."),
    limite: z.number().optional().describe("Quantidade máxima de registros (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado");
    const max = Math.min(Math.max(limite ?? 25, 1), 100);
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("itens_inventario").select("*").limit(max);
    if (busca) query = query.ilike("nome", `%${busca}%`);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ total: data?.length ?? 0, itens: data ?? [] });
  },
});
