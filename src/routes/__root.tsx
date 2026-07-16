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

import appCss from "../styles.css?url";

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
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
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

    if (user && (path === "/" || path === "/login")) {
      navigate({ to: homeFor(user.role) });
      return;
    }

    if (!user && path !== "/" && path !== "/login" && path !== "/termos-de-uso" && path !== "/privacidade") {
      navigate({ to: "/login" });
    }
  }, [user, loadingAuth, path, navigate]);
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
        refetchOnWindowFocus: true,
        staleTime: 1000 * 60 * 5, // 5 minutos, mas será invalidado via realtime
      },
    },
  }));

  useEffect(() => {
    const channel = supabase
      .channel("global-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          console.log("Realtime Update Recebido:", payload);
          // Invalida todas as queries do React Query, forçando um recarregamento em background suave (sem loaders) nas telas que estiverem abertas
          qc.invalidateQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <QueryClientProvider client={qc}>
      <StoreProvider>
        <AuthProvider>
          <AuthGate />
          <Outlet />
          <Toaster />
          <CookieConsent />
        </AuthProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}
