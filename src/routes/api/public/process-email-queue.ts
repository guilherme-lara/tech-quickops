import { createFileRoute } from "@tanstack/react-router";

// Endpoint para agendadores externos (cron) drenarem a fila de e-mails.
// Protegido por Bearer token (EMAIL_CRON_SECRET).
export const Route = createFileRoute("/api/public/process-email-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["EMAIL_CRON_SECRET"];
        const auth = request.headers.get("authorization");
        if (!secret || auth !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { processarFilaPendentes } = await import("@/lib/email.server");
          const url = new URL(request.url);
          const resetDomainErrors = url.searchParams.get("resetDomainErrors") === "true";

          let reabertos = 0;
          if (resetDomainErrors) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: rows, error: fetchError } = await (supabaseAdmin.from("email_queue" as any) as any)
              .select("id")
              .eq("status", "erro")
              .or("erro_mensagem.ilike.%domain not verified%,erro_mensagem.ilike.%domain is not verified%")
              .limit(100);
            if (fetchError) throw fetchError;
            const ids = (rows ?? []).map((r: any) => r.id);
            if (ids.length > 0) {
              const { error: updateError } = await (supabaseAdmin.from("email_queue" as any) as any)
                .update({ status: "pendente", erro_mensagem: null })
                .in("id", ids);
              if (updateError) throw updateError;
              reabertos = ids.length;
            }
          }

          const result = await processarFilaPendentes(50);
          return Response.json({ ok: true, reabertos, ...result });
        } catch (e: any) {
          return Response.json(
            { ok: false, error: String(e?.message ?? e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
