import { Link, useRouterState } from "@tanstack/react-router";

type TabDef = { to: string; label: string };

export const SECTION_TABS: Record<string, { titulo: string; tabs: TabDef[] }> = {
  estrategica: {
    titulo: "Visão Estratégica",
    tabs: [
      { to: "/gestor-dashboard", label: "Visão Geral" },
      { to: "/kpis", label: "KPIs" },
      { to: "/desempenho", label: "Desempenho" },
      { to: "/tempo-real", label: "Tempo Real" },
    ],
  },
  auditoria: {
    titulo: "Logs e Auditoria",
    tabs: [
      { to: "/logs", label: "Logs" },
      { to: "/emails", label: "E-mails Enviados" },
    ],
  },
  equipe: {
    titulo: "Equipe",
    tabs: [
      { to: "/equipe", label: "Técnicos" },
      { to: "/contratos", label: "Contratos" },
    ],
  },
  configuracoes: {
    titulo: "Configurações",
    tabs: [
      { to: "/configuracoes", label: "Conta e Empresa" },
      { to: "/planos", label: "Meu Plano" },
    ],
  },
};

export function SectionTabs({ group }: { group: keyof typeof SECTION_TABS }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const section = SECTION_TABS[group];
  if (!section) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1">
      {section.tabs.map((t) => {
        const active = path === t.to || path.startsWith(`${t.to}/`);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-background font-semibold text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
