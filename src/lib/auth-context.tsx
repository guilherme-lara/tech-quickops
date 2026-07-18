import { createContext, useContext, ReactNode, useEffect } from "react";
import { useStore } from "./useData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AuthProfile {
  id: string;
  nome_completo: string;
  role: string;
  empresa_id: string;
  email?: string;
  empresaNome?: string;
  avatarUrl?: string;
  empresaLogo?: string;
  empresaLogo?: string;
  empresaCodigo?: string;
  empresaPlano?: string;
}

interface AuthValue {
  user:
    | {
        id: string;
        email: string;
        empresaId?: string;
        nome?: string;
      }
    | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ error?: string }>;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loadingAuth, login, logout } = useStore();

  const value: AuthValue = {
    user: user ? { id: user.id, email: user.email } : null,
    profile: user
      ? {
          id: user.id,
          nome_completo: user.nome,
          role: user.role,
          empresa_id: user.empresaId,
          empresaNome: user.empresaNome,
          avatarUrl: user.avatarUrl,
          empresaLogo: user.empresaLogo,
          empresaCodigo: (user as any).empresaCodigo,
          empresaPlano: (user as any).empresaPlano || "free",
        }
      : null,
    isLoading: loadingAuth,
    signIn: login,
    signOut: logout,
    changePassword: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error?.message };
    },
  };

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('session-monitor')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'perfis', filter: `id=eq.${user.id}` },
        (payload) => {
          const newSessionId = payload.new.current_session_id;
          const localSessionId = localStorage.getItem("tqo_session_id");

          if (newSessionId && localSessionId && newSessionId !== localSessionId) {
            toast.error("Você foi desconectado porque sua conta foi acessada em outro dispositivo.", { duration: 10000 });
            logout().then(() => {
              window.location.href = "/login";
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, logout]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
