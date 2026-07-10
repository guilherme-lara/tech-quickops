import { Link, useRouterState, useNavigate, Outlet } from "@tanstack/react-router";
import { useStore } from "@/lib/useData";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Package,
  ClipboardList,
  Wrench,
  LogOut,
  Bell,
  Search,
  Settings,
  Menu,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"; // <-- MENU MOBILEimport { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { ReactNode, useState } from "react";

const allNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/os", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/equipe", label: "Equipe", icon: UsersRound },
  { to: "/estoque", label: "Inventário", icon: Package },
  { to: "/logs", label: "Logs e Auditoria", icon: FileText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

// Itens restritos para gestores
const restrictedItems = ["/clientes", "/equipe", "/logs"] as const;

export function GestorLayout({ children }: { children?: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  // RBAC: filtrar itens de menu baseado na role
  const navItems = allNavItems.filter(
    (item) => !(profile?.role === "tecnico" && restrictedItems.includes(item.to as any)),
  );

  const current = navItems.find((n) => path.startsWith(n.to))?.label ?? "Dashboard";
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate({
      to: "/login",
    });
  };

  const NavLinks = () => (
    <nav className="flex-1 mt-6 space-y-1">
      {navItems.map((item) => {
        const active = path.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setIsOpen(false)}
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
  );
  const UserProfile = () => (
    <div className="mt-3 pt-3 border-t border-border/60">
      <div className="flex items-center gap-2 px-2 py-2">
        <Avatar className="w-9 h-9">
          <AvatarImage
            src={profile?.avatarUrl}
            alt={profile?.nome_completo}
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-br from-primary to-violet text-primary-foreground text-xs font-semibold">
            {profile?.nome_completo?.[0] || "G"}
          </AvatarFallback>
        </Avatar>
        <div className="text-xs leading-tight flex-1 min-w-0">
          <div className="font-semibold truncate">{profile?.nome_completo || "Gestor"}</div>
          <div className="text-muted-foreground truncate">
            {user?.email || "gestor@empresa.com"}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* SIDEBAR DESKTOP (Escondida em mobile: hidden md:block) */}
      <aside className="w-64 fixed h-screen p-4 hidden md:block z-50 bg-background border-r border-border">
        <div className="rounded-3xl h-full flex flex-col p-4 shadow-[var(--shadow-card)]">
          <div className="px-2 py-3 flex items-center gap-2.5">
            {profile?.empresaLogo ? (
              <img
                src={profile.empresaLogo}
                alt="Logo da Empresa"
                className="w-10 h-10 rounded-xl object-contain bg-muted"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-violet flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Wrench className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <div className="font-bold text-base leading-tight">QuickOps</div>
              <div className="text-[10px] text-muted-foreground tracking-wider uppercase">
                B2B Field Ops
              </div>
            </div>
          </div>
          <NavLinks />
          <UserProfile />
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen w-full overflow-x-hidden">
        <header className="px-4 md:px-8 pt-4 md:pt-6 pb-2 flex items-center justify-between gap-4">
          {/* TOPO ESQUERDO: Menu Hambúrguer (Mobile) e Título */}
          <div className="flex items-center gap-3">
            {/* O Drawer Mobile */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4 flex flex-col glass border-r-0">
                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                <SheetDescription className="sr-only">
                  Navegue pelas páginas do sistema QuickOps
                </SheetDescription>

                <div className="px-2 py-3 flex items-center gap-2.5">
                  {profile?.empresaLogo ? (
                    <img
                      src={profile.empresaLogo}
                      alt="Logo da Empresa"
                      className="w-10 h-10 rounded-xl object-contain bg-muted"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-violet flex items-center justify-center shadow-[var(--shadow-glow)]">
                      <Wrench className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-base leading-tight">QuickOps</div>
                    <div className="text-[10px] text-muted-foreground tracking-wider uppercase">
                      B2B Field Ops
                    </div>
                  </div>
                </div>
                <NavLinks />
                <UserProfile />
              </SheetContent>
            </Sheet>

            <div>
              <p className="hidden md:block text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Painel
              </p>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate max-w-[160px] md:max-w-none">
                {current}
              </h1>
            </div>
          </div>

          {/* TOPO DIREITO: Pesquisa e Notificações */}
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar OS, cliente..."
                className="pl-10 w-72 h-10 rounded-xl glass border-0"
              />
            </div>
            {/* Ícone de busca substitui a barra grande no telemóvel */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-xl h-10 w-10 glass border-0"
            >
              <Search className="w-4 h-4" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 glass border-0">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* MAIN: Aqui injetamos as páginas (Dashboard, Clientes, etc) */}
        <main className="flex-1 px-4 md:px-8 pb-8 pt-4 w-full">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
