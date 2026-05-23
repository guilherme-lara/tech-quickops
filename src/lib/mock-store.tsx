import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ============================================================
// Types — UI-shape (kept stable so existing components compile)
// ============================================================
export type Role = "gestor" | "tecnico";
export type OSStatus = "Orçamento" | "Aprovado" | "Em Execução" | "Concluído" | "Cancelado";

export interface Cliente { id: string; nomeFantasia: string; documento: string; telefone: string; email: string; }
export interface Tecnico { id: string; nome: string; perfil: string; telefone: string; ativo: boolean; }
export interface Item { id: string; nome: string; tipo: "Peça" | "Serviço"; estoque: number; custo: number; venda: number; }
export interface OSItem { itemId: string; quantidade: number; }
export interface RAT {
  checkin?: string; checkout?: string; descricao?: string;
  itens: OSItem[]; evidencias: string[]; assinatura?: string;
}
export interface OS {
  id: string; numero: string; clienteId: string; tecnicoId: string;
  titulo: string; status: OSStatus; criadaEm: string; valor: number; rat: RAT;
}

interface User { id: string; nome: string; email: string; role: Role; empresaId: string; }

// ============================================================
// DB ↔ UI mappers
// ============================================================
const dbToUiStatus: Record<string, OSStatus> = {
  pendente: "Orçamento", aprovado: "Aprovado", em_andamento: "Em Execução",
  concluido: "Concluído", cancelado: "Cancelado",
};
const uiToDbStatus: Record<OSStatus, string> = {
  "Orçamento": "pendente", "Aprovado": "aprovado", "Em Execução": "em_andamento",
  "Concluído": "concluido", "Cancelado": "cancelado",
};

// Itens (estoque) remains mock — not in DB scope
const seedItens: Item[] = [
  { id: "i1", nome: "Compressor 1HP", tipo: "Peça", estoque: 8, custo: 480, venda: 890 },
  { id: "i2", nome: "Filtro Secador", tipo: "Peça", estoque: 24, custo: 35, venda: 75 },
  { id: "i3", nome: "Gás R134a (kg)", tipo: "Peça", estoque: 15, custo: 90, venda: 180 },
  { id: "i4", nome: "Visita Técnica", tipo: "Serviço", estoque: 999, custo: 0, venda: 150 },
  { id: "i5", nome: "Hora Técnica", tipo: "Serviço", estoque: 999, custo: 0, venda: 120 },
  { id: "i6", nome: "Disjuntor 32A", tipo: "Peça", estoque: 12, custo: 25, venda: 60 },
];

// ============================================================
// Store
// ============================================================
interface Store {
  user: User | null;
  loadingAuth: boolean;
  login: (email: string, senha: string) => Promise<{ error?: string }>;
  signup: (email: string, senha: string, nome: string, empresa: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;

  clientes: Cliente[];
  loadingClientes: boolean;
  addCliente: (c: Omit<Cliente, "id">) => Promise<void>;

  tecnicos: Tecnico[];
  loadingTecnicos: boolean;
  addTecnico: (t: Omit<Tecnico, "id">) => Promise<void>;

  itens: Item[];

  os: OS[];
  loadingOS: boolean;
  addOS: (o: Omit<OS, "id" | "numero" | "criadaEm" | "rat">) => Promise<void>;
  updateOS: (id: string, patch: Partial<OS>) => Promise<void>;
  updateRAT: (id: string, patch: Partial<RAT>) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  // local-only RAT progress (no DB table)
  const [ratLocal, setRatLocal] = useState<Record<string, RAT>>({});

  // Hydrate auth + perfil
  useEffect(() => {
    let mounted = true;

    const loadPerfil = async (uid: string, email: string): Promise<User | null> => {
      const { data, error } = await supabase
        .from("perfis")
        .select("id, nome_completo, role, empresa_id")
        .eq("id", uid)
        .maybeSingle();
      if (error) {
        console.error("[auth] erro ao buscar perfil:", error);
        return null;
      }
      if (!data) return null;
      const role: Role = data.role === "tecnico" ? "tecnico" : "gestor";
      return { id: data.id, email, nome: data.nome_completo || email, role, empresaId: data.empresa_id };
    };

    // 1) Restaura sessão inicial
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const perfil = await loadPerfil(session.user.id, session.user.email ?? "");
          if (mounted) setUser(perfil);
        } else if (mounted) {
          setUser(null);
        }
      } catch (err) {
        console.error("[auth] getSession falhou:", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    })();

    // 2) Listener de mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      (async () => {
        try {
          if (!session?.user) {
            if (mounted) setUser(null);
            qc.invalidateQueries();
            return;
          }
          const perfil = await loadPerfil(session.user.id, session.user.email ?? "");
          if (mounted) setUser(perfil);
          qc.invalidateQueries();
        } catch (err) {
          console.error("[auth] onAuthStateChange falhou:", err);
          if (mounted) setUser(null);
        } finally {
          if (mounted) setLoadingAuth(false);
        }
      })();
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [qc]);

  // ---------------- Queries ----------------
  const enabled = !!user;
  const empresaId = user?.empresaId;

  const clientesQ = useQuery({
    queryKey: ["clientes", empresaId],
    enabled,
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, documento, telefone, email")
        .eq("empresa_id", empresaId!)
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id, nomeFantasia: r.nome, documento: r.documento ?? "",
        telefone: r.telefone ?? "", email: r.email ?? "",
      }));
    },
  });

  const tecnicosQ = useQuery({
    queryKey: ["tecnicos", empresaId],
    enabled,
    queryFn: async (): Promise<Tecnico[]> => {
      const { data, error } = await supabase
        .from("tecnicos")
        .select("id, nome, perfil, telefone, ativo")
        .eq("empresa_id", empresaId!)
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id, nome: r.nome, perfil: r.perfil ?? "",
        telefone: r.telefone ?? "", ativo: r.ativo,
      }));
    },
  });

  const osQ = useQuery({
    queryKey: ["ordens_servico", empresaId],
    enabled,
    queryFn: async (): Promise<OS[]> => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("id, numero, cliente_id, tecnico_id, titulo, status, valor, created_at, descricao_problema, solucao")
        .eq("empresa_id", empresaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        numero: r.numero ?? "OS-?",
        clienteId: r.cliente_id,
        tecnicoId: r.tecnico_id ?? "",
        titulo: r.titulo || r.descricao_problema || "",
        status: dbToUiStatus[r.status] ?? "Orçamento",
        criadaEm: (r.created_at ?? "").slice(0, 10),
        valor: Number(r.valor ?? 0),
        rat: ratLocal[r.id] ?? { itens: [], evidencias: [] },
      }));
    },
  });

  // ---------------- Mutations ----------------
  const addClienteM = useMutation({
    mutationFn: async (c: Omit<Cliente, "id">) => {
      const { error } = await supabase.from("clientes").insert({
        empresa_id: empresaId!, nome: c.nomeFantasia, documento: c.documento,
        telefone: c.telefone, email: c.email,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addTecnicoM = useMutation({
    mutationFn: async (t: Omit<Tecnico, "id">) => {
      const { error } = await supabase.from("tecnicos").insert({
        empresa_id: empresaId!, nome: t.nome, perfil: t.perfil,
        telefone: t.telefone, ativo: t.ativo,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tecnicos", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addOSM = useMutation({
    mutationFn: async (o: Omit<OS, "id" | "numero" | "criadaEm" | "rat">) => {
      const { error } = await supabase.from("ordens_servico").insert({
        empresa_id: empresaId!,
        cliente_id: o.clienteId,
        tecnico_id: o.tecnicoId || null,
        titulo: o.titulo,
        descricao_problema: o.titulo,
        status: uiToDbStatus[o.status] as any,
        valor: o.valor,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens_servico", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateOSM = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OS> }) => {
      const dbPatch: Record<string, any> = {};
      if (patch.status) dbPatch.status = uiToDbStatus[patch.status];
      if (patch.titulo !== undefined) dbPatch.titulo = patch.titulo;
      if (patch.valor !== undefined) dbPatch.valor = patch.valor;
      if (patch.tecnicoId !== undefined) dbPatch.tecnico_id = patch.tecnicoId || null;
      const { error } = await (supabase.from("ordens_servico") as any).update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens_servico", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // ---------------- Auth methods ----------------
  const login = useCallback(async (email: string, senha: string) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return { error: error.message };

    const sessionUser = authData.user;
    if (!sessionUser) return { error: "Sessão não encontrada após o login." };

    const { data: perfil, error: profileError } = await supabase
      .from("perfis")
      .select("id, nome_completo, role, empresa_id")
      .eq("id", sessionUser.id)
      .single();

    if (profileError || !perfil) return { error: profileError?.message ?? "Perfil não encontrado." };

    const role: Role = perfil.role === "tecnico" ? "tecnico" : "gestor";
    setUser({
      id: perfil.id,
      email: sessionUser.email ?? email,
      nome: perfil.nome_completo || sessionUser.email || email,
      role,
      empresaId: perfil.empresa_id,
    });
    return {};
  }, []);

  const signup = useCallback(async (email: string, senha: string, nome: string, empresa: string) => {
    // ETAPA 1 — cria conta no Auth
    const redirectUrl = `${window.location.origin}/`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: redirectUrl, data: { nome_completo: nome, nome_empresa: empresa } },
    });
    if (signUpError) return { error: signUpError.message };

    const userId = signUpData.user?.id;
    if (!userId) return { error: "Falha ao criar conta de usuário." };

    // Se o e-mail exigir confirmação, não há sessão ativa → não dá pra inserir empresa/perfil (RLS).
    // Nesse caso paramos aqui e pedimos para o usuário confirmar o e-mail.
    if (!signUpData.session) {
      return { error: "Conta criada! Confirme seu e-mail antes de continuar o cadastro." };
    }

    // ETAPA 2 — cria empresa
    const { data: empresaRow, error: empresaError } = await supabase
      .from("empresas")
      .insert({ nome_fantasia: empresa })
      .select("id")
      .single();
    if (empresaError || !empresaRow) {
      return { error: `Erro ao criar empresa: ${empresaError?.message ?? "desconhecido"}` };
    }

    // ETAPA 3 — cria perfil (role forçada como 'admin')
    const { error: perfilError } = await supabase
      .from("perfis")
      .insert({
        id: userId,
        empresa_id: empresaRow.id,
        nome_completo: nome,
        role: "admin" as any,
      });
    if (perfilError) {
      return { error: `Erro ao criar perfil: ${perfilError.message}` };
    }

    // Hidrata o usuário em memória já com empresa_id
    setUser({
      id: userId,
      email,
      nome,
      role: "gestor",
      empresaId: empresaRow.id,
    });
    return {};
  }, []);

  const logout = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const value: Store = {
    user, loadingAuth, login, signup, logout,
    clientes: clientesQ.data ?? [], loadingClientes: clientesQ.isLoading,
    addCliente: async (c) => { await addClienteM.mutateAsync(c); },
    tecnicos: tecnicosQ.data ?? [], loadingTecnicos: tecnicosQ.isLoading,
    addTecnico: async (t) => { await addTecnicoM.mutateAsync(t); },
    itens: seedItens,
    os: osQ.data ?? [], loadingOS: osQ.isLoading,
    addOS: async (o) => { await addOSM.mutateAsync(o); },
    updateOS: async (id, patch) => { await updateOSM.mutateAsync({ id, patch }); },
    updateRAT: (id, patch) => setRatLocal((prev) => ({
      ...prev, [id]: { ...(prev[id] ?? { itens: [], evidencias: [] }), ...patch },
    })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const statusColor: Record<OSStatus, string> = {
  Orçamento: "bg-muted text-muted-foreground",
  Aprovado: "bg-info/15 text-info",
  "Em Execução": "bg-warning/20 text-warning-foreground",
  Concluído: "bg-success/15 text-success",
  Cancelado: "bg-destructive/15 text-destructive",
};
