import { Link, useRouterState, useNavigate, Outlet } from "@tanstack/react-router";
import { ClipboardList, User, History, Wrench, LogOut } from "lucide-react";
import { useStore } from "@/lib/mock-store";
import { ReactNode } from "react";

const tabs = [
  { to: "/tecnico/os", label: "Atendimentos", icon: ClipboardList },
  { to: "/tecnico/historico", label: "Histórico", icon: History },
  { to: "/tecnico/perfil", label: "Perfil", icon: User },
];

export function TecnicoLayout({ children }: { children?: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const isRAT = path.includes("/rat");

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md flex flex-col min-h-screen bg-background relative shadow-2xl">
        {!isRAT && (
          <header className="sticky top-0 z-20 px-4 pt-3 pb-2 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-violet flex items-center justify-center shadow-[var(--shadow-glow)]">
                  <Wrench className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-bold text-sm leading-tight">QuickOps</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{user?.nome}</div>
                </div>
              </div>
              <button onClick={() => { logout(); navigate({ to: "/login" }); }} className="w-9 h-9 rounded-xl glass flex items-center justify-center text-muted-foreground active:scale-95 transition">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

        <main className={`flex-1 ${isRAT ? "" : "pb-24"}`}>{children ?? <Outlet />}</main>

        {!isRAT && (
          <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[26rem] glass rounded-3xl h-16 flex shadow-[var(--shadow-glow)] z-30">
            {tabs.map((t) => {
              const active = path.startsWith(t.to);
              return (
                <Link key={t.to} to={t.to} className="flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${active ? "bg-gradient-to-br from-primary to-violet text-primary-foreground shadow-[var(--shadow-glow)]" : "text-muted-foreground"}`}>
                    <t.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
