import { Link, useRouterState, useNavigate, Outlet } from "@tanstack/react-router";
import { ClipboardList, User, Wrench, LogOut } from "lucide-react";
import { useStore } from "@/lib/mock-store";
import { ReactNode } from "react";

const tabs = [
  { to: "/tecnico/os", label: "Minhas OS", icon: ClipboardList },
  { to: "/tecnico/perfil", label: "Perfil", icon: User },
];

export function TecnicoLayout({ children }: { children?: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const isRAT = path.includes("/rat");

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto shadow-2xl relative">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">QuickOps</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{user?.nome}</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate({ to: "/login" }); }} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <main className={`flex-1 ${isRAT ? "" : "pb-20"}`}>{children ?? <Outlet />}</main>

      {!isRAT && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border h-16 flex">
          {tabs.map((t) => {
            const active = path.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={`flex-1 flex flex-col items-center justify-center gap-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
                <t.icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{t.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
