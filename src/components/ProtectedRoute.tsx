import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Paywall } from "./Paywall";

interface Props {
  children: ReactNode;
  allowedRoles?: ("gestor" | "tecnico" | "analista" | "admin" | "superadmin")[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  const precisaChecarLicenca = Boolean(
    profile && profile.role !== "superadmin" && profile.empresa_id
  );

  // Cacheado por empresa: não refaz a consulta a cada navegação entre telas
  const { data: licenca, isPending: licencaPending } = useQuery({
    queryKey: ["licenca_empresa", profile?.empresa_id],
    enabled: precisaChecarLicenca,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("status_licenca, data_vencimento")
        .eq("id", profile!.empresa_id)
        .single();
      if (error) {
        console.error(error);
        return null;
      }
      return data;
    },
  });

  const isBlocked = (() => {
    if (!precisaChecarLicenca) return false;
    if (licencaPending) return null;
    if (!licenca) return false;
    const isExpired = licenca.data_vencimento
      ? new Date(licenca.data_vencimento).getTime() < Date.now()
      : false;
    return licenca.status_licenca === "bloqueado" || isExpired;
  })();


  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (profile) {
      if (allowedRoles && allowedRoles.length > 0) {
        let isAllowed = (allowedRoles as string[]).includes(profile.role);
        
        // Bypass master para o dono do sistema e superadmins
        if (user.email === 'guiigo9@gmail.com' || profile.role === 'superadmin') {
          isAllowed = true;
        }

        // Admins tem os mesmos acessos que gestores
        if (profile.role === 'admin' && allowedRoles.includes('gestor')) {
          isAllowed = true;
        }

        if (!isAllowed) {
          let redirectRoute = "/tecnico/os";
          if (profile.role === "analista") redirectRoute = "/analista-dashboard";
          else if (["gestor", "admin", "superadmin"].includes(profile.role)) redirectRoute = "/dashboard";
          
          navigate({ to: redirectRoute });
          return;
        }
      }

    }

  }, [user, profile, isLoading, allowedRoles, navigate]);

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

  if (isBlocked === null && profile && profile.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm">Verificando licença…</span>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return <Paywall />;
  }

  // Bloqueia a renderização enquanto o perfil carrega ou se o papel não é permitido
  // (evita "flash" da tela do gestor para técnicos antes do redirect)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm">Carregando perfil…</span>
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const master = user.email === "guiigo9@gmail.com" || profile.role === "superadmin";
    const adminAsGestor = profile.role === "admin" && allowedRoles.includes("gestor");
    const allowed = master || adminAsGestor || (allowedRoles as string[]).includes(profile.role);
    if (!allowed) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm">Redirecionando…</span>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
