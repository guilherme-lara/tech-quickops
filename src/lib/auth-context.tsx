import { createContext, useContext, ReactNode } from "react";
import { useStore } from "./mock-store";

export interface AuthProfile {
  id: string;
  nome_completo: string;
  role: "gestor" | "tecnico";
  empresa_id: string;
}

interface AuthValue {
  user: { id: string; email: string } | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loadingAuth, login, logout } = useStore();

  const value: AuthValue = {
    user: user ? { id: user.id, email: user.email } : null,
    profile: user
      ? { id: user.id, nome_completo: user.nome, role: user.role, empresa_id: user.empresaId }
      : null,
    isLoading: loadingAuth,
    signIn: login,
    signOut: logout,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
