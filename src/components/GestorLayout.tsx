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
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col fixed h-screen">
        <div className="p-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">QuickOps</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => { logout(); navigate({ to: "/login" }); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold">{current}</h1>
            <p className="text-xs text-muted-foreground">Painel administrativo</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9 w-64" />
            </div>
            <Button variant="ghost" size="icon"><Bell className="w-4 h-4" /></Button>
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{user?.nome?.[0]}</AvatarFallback></Avatar>
              <div className="text-sm leading-tight">
                <div className="font-medium">{user?.nome}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
