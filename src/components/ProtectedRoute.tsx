import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface Props {
  children: ReactNode;
  requireRole?: "gestor" | "tecnico" | "analista" | "admin" | "superadmin";
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (requireRole && profile) {
      let isAllowed = profile.role === requireRole;
      
      // Analistas e Admins têm acesso às telas do Gestor
      if (requireRole === "gestor" && ["analista", "admin", "superadmin"].includes(profile.role)) {
        isAllowed = true;
      }

      if (!isAllowed) {
        navigate({ to: ["gestor", "analista", "admin", "superadmin"].includes(profile.role) ? "/dashboard" : "/tecnico/os" });
      }
    }
  }, [user, profile, isLoading, requireRole, navigate]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm">Carregando sessão…</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
