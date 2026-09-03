import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { StoreProvider, useStore } from "@/lib/useData";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary, installGlobalErrorHandlers } from "@/components/ErrorBoundary";
import { ConfirmDialogProvider } from "@/components/ConfirmDialogProvider";
import { queryKeysForTable } from "@/lib/realtime-invalidation";
import { iniciarPollingEmails } from "@/lib/email-trigger";
import { PwaUpdater } from "@/components/PwaUpdater";


import appCss from "../styles.css?url";

installGlobalErrorHandlers();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ir para início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "QuickOps — Gestão de Ordens de Serviço" },
      { name: "description", content: "QuickOps: SaaS B2B para gestão de OS e RAT digital." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ({ error, reset }) => {
    console.error("[RouteError]", error, (error as Error)?.stack);
    return (
      <ErrorBoundary scope="route" fallback={(e, r) => (
        <div className="min-h-screen flex items-center justify-center p-6">
          <pre className="max-w-2xl w-full overflow-auto rounded border border-destructive/40 bg-destructive/5 p-4 text-xs">
            {e.name}: {e.message}
            {"\n\n"}
            {e.stack}
          </pre>
        </div>
      )}>
        {(() => { throw error; })()}
      </ErrorBoundary>
    );
  },
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthGate() {
  const { user, loadingAuth } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (loadingAuth) return;
    const homeFor = (role: string) =>
      role === "tecnico" ? "/tecnico/os" : role === "analista" ? "/analista-dashboard" : "/dashboard";

    // Fluxo de consentimento OAuth (integrações de agentes) tem auth própria
    if (path.startsWith("/.lovable/oauth/")) return;

    if (user && (path === "/" || path === "/login")) {
      const next = new URLSearchParams(window.location.search).get("next");
      if (path === "/login" && next && next.startsWith("/") && !next.startsWith("//")) {
        window.location.href = next;
        return;
      }
      navigate({ to: homeFor(user.role) });
      return;
    }

    if (!user && path !== "/" && path !== "/login" && path !== "/termos-de-uso" && path !== "/privacidade") {
      navigate({ to: "/login" });
    }
  }, [user, loadingAuth, path, navigate]);

  // Drena a fila de e-mails pendentes enquanto houver sessão autenticada
  useEffect(() => {
    if (!user) return;
    return iniciarPollingEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  return null;
}

function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (consent) {
      try {
        const parsed = JSON.parse(consent);
        const now = new Date().getTime();
        const expiration = parsed.timestamp + 15 * 24 * 60 * 60 * 1000; // 15 dias
        if (now < expiration) {
          return;
        }
      } catch (e) {
        console.error("Erro ao ler cookie consent", e);
      }
    }
    const timer = setTimeout(() => setShow(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-slate-900 border-t border-slate-800 p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-full duration-500">
      <div className="text-slate-300 text-sm font-medium leading-relaxed max-w-4xl">
        Utilizamos cookies essenciais e tecnologias semelhantes para garantir o funcionamento do sistema, realizar login de forma segura e proporcionar a melhor experiência, em total conformidade com a nossa <Link to="/privacidade" className="text-blue-400 font-bold hover:underline transition-all">Política de Privacidade (LGPD)</Link> e nossos <Link to="/termos-de-uso" className="text-blue-400 font-bold hover:underline transition-all">Termos de Uso</Link>.
      </div>
      <div className="flex shrink-0 w-full md:w-auto">
        <Button
          onClick={() => {
            localStorage.setItem(
              "cookie-consent",
              JSON.stringify({ timestamp: new Date().getTime(), accepted: true })
            );
            setShow(false);
          }}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-xl font-bold text-base transition-colors"
        >
          Entendi e Aceito
        </Button>
      </div>
    </div>
  );
}

function RootComponent() {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Realtime já invalida o que muda: evitamos refetch agressivo ao focar a aba
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutos, mas será invalidado via realtime
        gcTime: 1000 * 60 * 30, // mantém o cache das telas visitadas por 30 min
        // Mantém os dados anteriores visíveis ao paginar/filtrar (sem tela em branco)
        placeholderData: (prev: unknown) => prev,
      },
    },
  }));

  useEffect(() => {
    // Coalesce eventos: várias mudanças em sequência viram uma única invalidação
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      const keys = new Set<string>();
      for (const table of pending) {
        for (const key of queryKeysForTable(table)) keys.add(key);
      }
      pending.clear();
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    };

    const channel = supabase
      .channel("global-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          pending.add((payload as { table?: string }).table ?? "");
          if (timer) clearTimeout(timer);
          timer = setTimeout(flush, 400);
        }
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [qc]);


  return (
    <QueryClientProvider client={qc}>
      <StoreProvider>
        <AuthProvider>
          <ConfirmDialogProvider>
            <ErrorBoundary scope="app">
              <AuthGate />
              <PwaUpdater />
              <Outlet />
              <Toaster />
              <CookieConsent />
            </ErrorBoundary>
          </ConfirmDialogProvider>
        </AuthProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}
