import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Paywall } from "./Paywall";

interface Props {
  children: ReactNode;
  allowedRoles?: ("gestor" | "tecnico" | "analista" | "admin" | "superadmin")[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (profile) {
      if (allowedRoles && allowedRoles.length > 0) {
        let isAllowed = allowedRoles.includes(profile.role);
        
        // Bypass master para o dono do sistema e superadmins
        if (user.email === 'guiigo9@gmail.com' || profile.role === 'superadmin') {
          isAllowed = true;
        }

        // Admins tem os mesmos acessos que gestores
        if (profile.role === 'admin' && allowedRoles.includes('gestor')) {
          isAllowed = true;
        }

        if (!isAllowed) {
          navigate({ to: ["gestor", "analista", "admin", "superadmin"].includes(profile.role) ? "/dashboard" : "/tecnico/os" });
          return;
        }
      }

      // Verifica o status da licença
      if (profile.role !== 'superadmin' && profile.empresa_id) {
        supabase
          .from('empresas')
          .select('status_licenca, data_vencimento')
          .eq('id', profile.empresa_id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error(error);
              setIsBlocked(false);
            } else {
              // Verifica status e vencimento
              let isExpired = false;
              if (data?.data_vencimento) {
                isExpired = new Date(data.data_vencimento).getTime() < new Date().getTime();
              }
              
              if (data?.status_licenca === 'bloqueado' || isExpired) {
                setIsBlocked(true);
              } else {
                setIsBlocked(false);
              }
            }
          });
      } else {
        setIsBlocked(false);
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

  return <>{children}</>;
}
