import { Link, useRouterState, useNavigate, Outlet } from "@tanstack/react-router";
import { useStore } from "@/lib/mock-store";
import { LayoutDashboard, Users, UsersRound, Package, ClipboardList, Wrench, LogOut, Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/os", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/equipe", label: "Equipe", icon: UsersRound },
  { to: "/estoque", label: "Estoque", icon: Package },
] as const;

export function GestorLayout({ children }: { children?: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const current = navItems.find((n) => path.startsWith(n.to))?.label ?? "Dashboard";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 fixed h-screen p-4">
        <div className="glass rounded-3xl h-full flex flex-col p-4 shadow-[var(--shadow-card)]">
          <div className="px-2 py-3 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-violet flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Wrench className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">QuickOps</div>
              <div className="text-[10px] text-muted-foreground tracking-wider uppercase">B2B Field Ops</div>
            </div>
          </div>

          <nav className="flex-1 mt-6 space-y-1">
            {navItems.map((item) => {
              const active = path.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                    active
                      ? "bg-gradient-to-r from-primary to-violet text-primary-foreground font-semibold shadow-[var(--shadow-glow)]"
                      : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 px-2 py-2">
              <Avatar className="w-9 h-9"><AvatarFallback className="bg-gradient-to-br from-primary to-violet text-primary-foreground text-xs font-semibold">{user?.nome?.[0]}</AvatarFallback></Avatar>
              <div className="text-xs leading-tight flex-1 min-w-0">
                <div className="font-semibold truncate">{user?.nome}</div>
                <div className="text-muted-foreground truncate">{user?.email}</div>
              </div>
              <button onClick={() => { logout(); navigate({ to: "/login" }); }} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="px-8 pt-6 pb-2 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Painel</p>
            <h1 className="text-2xl font-bold tracking-tight">{current}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar OS, cliente, técnico..." className="pl-10 w-72 h-10 rounded-xl glass border-0" />
            </div>
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 glass border-0"><Bell className="w-4 h-4" /></Button>
          </div>
        </header>
        <main className="flex-1 px-8 pb-8 pt-4">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
