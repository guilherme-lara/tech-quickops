import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "get_ordem_servico",
  title: "Detalhar ordem de serviço",
  description: "Retorna os detalhes completos de uma ordem de serviço, incluindo os últimos eventos do histórico.",
  inputSchema: {
    id: z.string().describe("UUID da ordem de serviço."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Não autenticado");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("*, clientes(nome, email, telefone), tecnicos(nome, telefone)")
      .eq("id", id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Ordem de serviço não encontrada ou sem permissão de acesso.");

    const { data: historico } = await supabase
      .from("os_historico")
      .select("*")
      .eq("os_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    return textResult({ os: data, historico: historico ?? [] });
  },
});
