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
