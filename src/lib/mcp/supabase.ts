import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL (ou VITE_SUPABASE_URL) é obrigatório");
  return url;
}

function supabasePublishableKey(): string {
  const direct = configuredEnv([
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)]
          .find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"))
          ?.trim();
        if (key) return key;
      }
    } catch {
      // dicionário malformado; tenta os nomes legados abaixo
    }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEYS ou SUPABASE_ANON_KEY é obrigatório");
}

/** Encaminha o token verificado para que o RLS rode como o usuário logado. */
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("supabaseForUser exige um token OAuth verificado");
  return createClient(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** empresa_id do perfil do usuário autenticado (isolamento multi-tenant). */
export async function empresaIdDoUsuario(ctx: ToolContext): Promise<string> {
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase
    .from("perfis")
    .select("empresa_id")
    .eq("id", ctx.getUserId() as string)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.empresa_id) throw new Error("Perfil sem empresa vinculada");
  return data.empresa_id as string;
}

export function textResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}
