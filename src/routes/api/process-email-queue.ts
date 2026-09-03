import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/process-email-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ ok: false }, { status: 401 });
        }

        const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) {
          return Response.json({ ok: false }, { status: 503 });
        }

        const token = authHeader.slice("Bearer ".length);
        const authClient = createClient(url, key, {
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        const { data, error } = await authClient.auth.getClaims(token);
        if (error || !data?.claims?.sub) {
          return Response.json({ ok: false }, { status: 401 });
        }

        try {
          const { processarFilaPendentes } = await import("@/lib/email.server");
          const result = await processarFilaPendentes(20);
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("[EmailQueue] Falha ao processar fila autenticada", error);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});