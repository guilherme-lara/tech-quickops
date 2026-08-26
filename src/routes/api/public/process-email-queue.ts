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
          const result = await processarFilaPendentes(50);
          return Response.json({ ok: true, ...result });
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
