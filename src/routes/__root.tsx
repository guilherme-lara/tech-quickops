import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState, useNavigate } from "@tanstack/react-router";
import { StoreProvider, useStore } from "@/lib/mock-store";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
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
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function AuthGate() {
  const { user, loadingAuth } = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (loadingAuth) return;
    if (path === "/") {
      if (!user) navigate({ to: "/login" });
      else navigate({ to: user.role === "gestor" ? "/dashboard" : "/tecnico/os" });
      return;
    }
    if (!user && path !== "/login") navigate({ to: "/login" });
    if (user && path === "/login") navigate({ to: user.role === "gestor" ? "/dashboard" : "/tecnico/os" });
  }, [user, loadingAuth, path, navigate]);
  return null;
}

function RootComponent() {
  const [qc] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={qc}>
      <StoreProvider>
        <AuthGate />
        <Outlet />
        <Toaster />
      </StoreProvider>
    </QueryClientProvider>
  );
}
