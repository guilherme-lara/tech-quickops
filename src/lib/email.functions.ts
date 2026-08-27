import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Processa a fila de e-mails pendentes. Qualquer usuário autenticado pode
// disparar: a função apenas drena linhas já enfileiradas pelos triggers do
// banco (não aceita destinatário/conteúdo arbitrário do chamador).
export const processarFilaEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { processarFilaPendentes } = await import("./email.server");
    return await processarFilaPendentes(20);
  });

// Reabre e-mails que falharam por domínio não verificado no Resend,
// para que sejam reenviados automaticamente após a verificação.
// Restrita a admins/superadmins.
export const reenviarEmailsComErroDeDominio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data: perfil } = await supabase
      .from("perfis")
      .select("role")
      .eq("id", context.userId)
      .single();
    if (!perfil || (perfil.role !== "admin" && perfil.role !== "superadmin")) {
      throw new Response("Forbidden", { status: 403 });
    }

    const { data: rows, error: fetchError } = await supabase
      .from("email_queue" as any)
      .select("id")
      .eq("status", "erro")
      .or("erro_mensagem.ilike.%domain not verified%,erro_mensagem.ilike.%domain is not verified%")
      .limit(100);
    if (fetchError) throw fetchError;

    const ids = (rows ?? []).map((r: any) => r.id);
    if (ids.length === 0) return { reabertos: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await (supabaseAdmin.from("email_queue" as any) as any)
      .update({ status: "pendente", erro_mensagem: null })
      .in("id", ids);
    if (updateError) throw updateError;

    return { reabertos: ids.length };
  });
