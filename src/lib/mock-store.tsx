import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ============================================================
// Types — UI-shape (kept stable so existing components compile)
// ============================================================
export type Role = "gestor" | "tecnico";
export type OSStatus = "Orçamento" | "Aprovado" | "Em Execução" | "Concluído" | "Cancelado";

export interface Cliente {
  id: string;
  nomeFantasia: string;
  documento: string;
  telefone: string;
  email: string;
}
export type TipoComissao = "fixo" | "porcentagem";
export interface Tecnico {
  id: string;
  nome: string;
  perfil: string;
  telefone: string;
  ativo: boolean;
  comissao?: number;
  tipo_comissao?: TipoComissao;
  chave_pix?: string;
  username?: string;
  email?: string;
  dados_adicionais?: Record<string, any>;
}
export interface Item {
  id: string;
  nome: string;
  codigo: string;
  quantidade: number;
  valor_unitario: number;
}

export interface OSItem {
  itemId: string;
  quantidade: number;
}
export interface RAT {
  checkin?: string;
  checkout?: string;
  descricao?: string;
  itens: OSItem[];
  evidencias: string[];
  assinatura?: string;
}
export interface OS {
  id: string;
  numero: string;
  clienteId: string;
  tecnicoId: string;
  analistaId?: string;
  titulo: string;
  status: OSStatus;
  criadaEm: string;
  data_atendimento?: string;
  data_agendamento?: string;
  horario_atendimento?: string;
  updatedAt?: string;
  valor: number;
  custo_viagem?: number;
  rat: RAT;
  dados_adicionais?: Record<string, any>;
  descricao_problema?: string;
  tecnico?: {
    id: string;
    nome: string;
    perfil: string;
    telefone: string;
    ativo: boolean;
  };
}

export const OS_PAGE_SIZE = 10;

interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
  empresaId: string;
  empresaNome: string;
}

// ============================================================
// DB ↔ UI mappers
// ============================================================
const dbToUiStatus: Record<string, OSStatus> = {
  pendente: "Orçamento",
  aprovado: "Aprovado",
  em_andamento: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
const uiToDbStatus: Record<OSStatus, string> = {
  Orçamento: "pendente",
  Aprovado: "aprovado",
  "Em Execução": "em_andamento",
  Concluído: "concluido",
  Cancelado: "cancelado",
};

// ============================================================
// Store
// ============================================================
interface Store {
  user: User | null;
  loadingAuth: boolean;
  login: (email: string, senha: string) => Promise<{ error?: string }>;
  signup: (
    email: string,
    senha: string,
    nome: string,
    empresa: string,
  ) => Promise<{ error?: string }>;
  logout: () => Promise<void>;

  clientes: Cliente[];
  loadingClientes: boolean;
  addCliente: (c: Omit<Cliente, "id">) => Promise<string>;
  updateCliente: (id: string, patch: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;

  tecnicos: Tecnico[];
  loadingTecnicos: boolean;
  addTecnico: (t: Omit<Tecnico, "id">) => Promise<string>;
  updateTecnico: (id: string, patch: Partial<Tecnico>) => Promise<void>;
  deleteTecnico: (id: string) => Promise<void>;

  itens: Item[];
  loadingItens: boolean;
  addItem: (i: Omit<Item, "id">) => Promise<void>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  os: OS[];
  loadingOS: boolean;
  osPage: number;
  osTotal: number;
  setOsPage: (p: number) => void;
  osMonth: number;
  osYear: number;
  setOsMonth: (m: number) => void;
  setOsYear: (y: number) => void;
  osSearchCliente: string;
  setOsSearchCliente: (v: string) => void;
  osSearchTecnico: string;
  setOsSearchTecnico: (v: string) => void;
  osFilterStatus: string;
  setOsFilterStatus: (v: string) => void;
  addOS: (o: Omit<OS, "id" | "numero" | "criadaEm" | "rat">) => Promise<void>;
  updateOS: (id: string, patch: Partial<OS>) => Promise<void>;
  updateRAT: (id: string, patch: Partial<RAT>) => void;

  updateProfile: (nome: string) => Promise<void>;
  updateEmpresa: (nome: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [ratLocal, setRatLocal] = useState<Record<string, RAT>>({});
  const [osPage, setOsPage] = useState(0);
  const [osTotal, setOsTotal] = useState(0);
  const now = new Date();
  const [osMonth, setOsMonth] = useState<number>(0);
  const [osYear, setOsYear] = useState<number>(now.getFullYear());
  const [osSearchCliente, setOsSearchCliente] = useState("");
  const [osSearchTecnico, setOsSearchTecnico] = useState("");
  const [osFilterStatus, setOsFilterStatus] = useState("");

  // Hydrate auth + perfil
  useEffect(() => {
    let mounted = true;

    const loadPerfil = async (
      uid: string,
      email: string,
      retries = 3,
      delayMs = 500,
    ): Promise<User | null> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        const { data, error } = await supabase
          .from("perfis")
          .select("id, nome_completo, role, empresa_id")
          .eq("id", uid)
          .maybeSingle();

        if (error) {
          console.error(`[auth] erro ao buscar perfil (tentativa ${attempt}):`, error);
          if (attempt === retries) return null;
        } else if (data) {
          const role: Role = data.role === "tecnico" ? "tecnico" : "gestor";
          let empresaNome = "";
          const { data: emp } = await supabase
            .from("empresas")
            .select("nome_fantasia")
            .eq("id", data.empresa_id)
            .maybeSingle();
          if (emp) empresaNome = emp.nome_fantasia ?? "";
          return {
            id: data.id,
            email,
            nome: data.nome_completo || email,
            role,
            empresaId: data.empresa_id,
            empresaNome,
          };
        }

        if (attempt < retries) {
          console.warn(
            `[auth] Perfil não encontrado, tentando novamente em ${delayMs}ms... (tentativa ${attempt})`,
          );
          await new Promise((res) => setTimeout(res, delayMs));
        }
      }
      return null;
    };

    const handleGhostUser = async () => {
      console.error(
        "[auth] Perfil não encontrado após retries. Possível usuário fantasma. Deslogando...",
      );
      await supabase.auth.signOut();
      if (mounted) {
        setUser(null);
        setLoadingAuth(false);
      }
      toast.error("Erro de integridade: Perfil não encontrado. Por favor, contate o suporte.");
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    };

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const perfil = await loadPerfil(session.user.id, session.user.email ?? "");
          if (perfil) {
            if (mounted) setUser(perfil);
          } else {
            await handleGhostUser();
          }
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      (async () => {
        try {
          if (!session?.user) {
            if (mounted) setUser(null);
            qc.invalidateQueries();
            return;
          }
          const perfil = await loadPerfil(session.user.id, session.user.email ?? "");
          if (perfil) {
            if (mounted) setUser(perfil);
            qc.invalidateQueries();
          } else {
            await handleGhostUser();
            qc.invalidateQueries();
          }
        } catch (err) {
          console.error("[auth] onAuthStateChange falhou:", err);
          if (mounted) setUser(null);
        } finally {
          if (mounted) setLoadingAuth(false);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [qc]);

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
        id: r.id,
        nomeFantasia: r.nome,
        documento: r.documento ?? "",
        telefone: r.telefone ?? "",
        email: r.email ?? "",
      }));
    },
  });

  const tecnicosQ = useQuery({
    queryKey: ["tecnicos", empresaId],
    enabled,
    queryFn: async (): Promise<Tecnico[]> => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("tecnicos")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("🔥 ERRO SUPABASE TÉCNICOS:", error.message, error.hint, error.details);
        throw error;
      } else {
        console.log("✅ TOTAL DE TÉCNICOS RETORNADOS:", data?.length);
      }
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        nome: r.nome,
        perfil: r.perfil ?? "",
        telefone: r.telefone ?? "",
        ativo: r.ativo,
        comissao: Number(r.comissao || 0),
        tipo_comissao: (r.tipo_comissao as TipoComissao) ?? "fixo",
        chave_pix: r.chave_pix ?? "",
        username: r.username ?? "",
        email: r.email ?? "",
        dados_adicionais: r.dados_adicionais ?? {},
      }));
    },
  });

  const osQ = useQuery({
    queryKey: [
      "ordens_servico",
      empresaId,
      osPage,
      osMonth,
      osYear,
      osSearchCliente,
      osSearchTecnico,
      osFilterStatus,
    ],
    enabled,
    queryFn: async (): Promise<OS[]> => {
      if (!empresaId) return [];

      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, tecnico:tecnicos(id, nome, perfil, telefone, ativo)")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("🔥 ERRO SUPABASE OS:", error);
        throw error;
      } else {
        console.log("✅ TOTAL DE OS RETORNADAS:", data?.length);
      }

      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        numero: r.numero ?? "OS-?",
        clienteId: r.cliente_id,
        tecnicoId: r.tecnico_id ?? "",
        analistaId: r.analista_id ?? "",
        titulo: r.titulo || r.descricao_problema || "",
        descricao_problema: r.descricao_problema ?? "",
        status: dbToUiStatus[r.status] ?? "Orçamento",
        criadaEm: (r.created_at ?? "").slice(0, 10),
        data_atendimento: r.data_agendamento ?? undefined,
        data_agendamento: r.data_agendamento ?? undefined,
        horario_atendimento: r.horario_atendimento ?? undefined,
        valor: Number(r.valor ?? 0),
        custo_viagem: Number(r.custo_viagem ?? 0),
        rat: ratLocal[r.id] ?? { itens: [], evidencias: [] },
        dados_adicionais: r.dados_adicionais ?? {},
        tecnico: r.tecnico
          ? {
              id: r.tecnico.id,
              nome: r.tecnico.nome,
              perfil: r.tecnico.perfil ?? "",
              telefone: r.tecnico.telefone ?? "",
              ativo: r.tecnico.ativo ?? true,
            }
          : undefined,
      }));
    },
  });

  // ---------------- Mutations ----------------
  const addClienteM = useMutation({
    mutationFn: async (c: Omit<Cliente, "id">) => {
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          empresa_id: empresaId!,
          nome: c.nomeFantasia,
          documento: c.documento,
          telefone: c.telefone,
          email: c.email,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateClienteM = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Cliente> }) => {
      const dbPatch: Record<string, any> = {};
      if (patch.nomeFantasia !== undefined) dbPatch.nome = patch.nomeFantasia;
      if (patch.documento !== undefined) dbPatch.documento = patch.documento;
      if (patch.telefone !== undefined) dbPatch.telefone = patch.telefone;
      if (patch.email !== undefined) dbPatch.email = patch.email;
      const { error } = await supabase
        .from("clientes")
        .update(dbPatch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteClienteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addTecnicoM = useMutation({
    mutationFn: async (t: Omit<Tecnico, "id">) => {
      const { error } = await (supabase.from("tecnicos") as any).insert({
        empresa_id: empresaId!,
        nome: t.nome,
        perfil: t.perfil,
        telefone: t.telefone,
        ativo: t.ativo,
        comissao: t.comissao,
        tipo_comissao: t.tipo_comissao ?? "fixo",
        chave_pix: t.chave_pix,
        username: t.username || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tecnicos", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTecnicoM = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Tecnico> }) => {
      const dbPatch: Record<string, any> = {};
      if (patch.nome !== undefined) dbPatch.nome = patch.nome;
      if (patch.perfil !== undefined) dbPatch.perfil = patch.perfil;
      if (patch.ativo !== undefined) dbPatch.ativo = patch.ativo;
      if (patch.comissao !== undefined) dbPatch.comissao = patch.comissao;
      if (patch.tipo_comissao !== undefined) dbPatch.tipo_comissao = patch.tipo_comissao;
      if (patch.chave_pix !== undefined) dbPatch.chave_pix = patch.chave_pix;
      if (patch.username !== undefined) dbPatch.username = patch.username || null;
      if (patch.email !== undefined) dbPatch.email = patch.email || null;
      if (patch.dados_adicionais !== undefined) dbPatch.dados_adicionais = patch.dados_adicionais;
      const { error } = await (supabase.from("tecnicos") as any).update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tecnicos", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTecnicoM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tecnicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tecnicos", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addOSM = useMutation({
    mutationFn: async (o: Omit<OS, "id" | "numero" | "criadaEm" | "rat">) => {
      const { error } = await (supabase.from("ordens_servico") as any).insert({
        empresa_id: empresaId!,
        cliente_id: o.clienteId,
        tecnico_id: o.tecnicoId || null,
        analista_id: o.analistaId || null,
        titulo: o.titulo,
        descricao_problema: o.descricao_problema ?? null,
        data_agendamento: o.data_agendamento ?? null,
        horario_atendimento: o.horario_atendimento ?? null,
        status: uiToDbStatus[o.status] as any,
        valor: o.valor,
        custo_viagem: o.custo_viagem ?? 0,
        dados_adicionais: o.dados_adicionais ?? {},
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
      if (patch.custo_viagem !== undefined) dbPatch.custo_viagem = patch.custo_viagem;
      if (patch.tecnicoId !== undefined) dbPatch.tecnico_id = patch.tecnicoId || null;
      if (patch.analistaId !== undefined) dbPatch.analista_id = patch.analistaId || null;
      if (patch.clienteId !== undefined) dbPatch.cliente_id = patch.clienteId;
      if (patch.dados_adicionais !== undefined) dbPatch.dados_adicionais = patch.dados_adicionais;
      if (patch.descricao_problema !== undefined)
        dbPatch.descricao_problema = patch.descricao_problema;
      if (patch.data_agendamento !== undefined) dbPatch.data_agendamento = patch.data_agendamento;
      if (patch.horario_atendimento !== undefined)
        dbPatch.horario_atendimento = patch.horario_atendimento;
      const { error } = await (supabase.from("ordens_servico") as any).update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens_servico", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // ---------------- Itens estoque ----------------
  const itensQ = useQuery({
    queryKey: ["itens_inventario", empresaId],
    enabled,
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await (supabase.from("itens_inventario" as any) as any)
        .select("id, nome, codigo, quantidade, valor_unitario")
        .eq("empresa_id", empresaId!)
        .order("nome");
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        nome: r.nome,
        codigo: r.codigo ?? "",
        quantidade: Number(r.quantidade ?? 0),
        valor_unitario: Number(r.valor_unitario ?? 0),
      }));
    },
  });

  const addItemM = useMutation({
    mutationFn: async (i: Omit<Item, "id">) => {
      const { error } = await (supabase.from("itens_inventario" as any) as any).insert({
        empresa_id: empresaId!,
        nome: i.nome,
        codigo: i.codigo || null,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itens_inventario", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItemM = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Item> }) => {
      const dbPatch: Record<string, any> = {};
      if (patch.nome !== undefined) dbPatch.nome = patch.nome;
      if (patch.codigo !== undefined) dbPatch.codigo = patch.codigo || null;
      if (patch.quantidade !== undefined) dbPatch.quantidade = patch.quantidade;
      if (patch.valor_unitario !== undefined) dbPatch.valor_unitario = patch.valor_unitario;
      const { error } = await (supabase.from("itens_inventario" as any) as any)
        .update(dbPatch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itens_inventario", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItemM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("itens_inventario" as any) as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itens_inventario", empresaId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // ---------------- Auth methods ----------------
  const login = useCallback(async (email: string, senha: string) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) return { error: error.message };

    const sessionUser = authData.user;
    if (!sessionUser) return { error: "Sessão não encontrada após o login." };

    const { data: perfil, error: profileError } = await supabase
      .from("perfis")
      .select("id, nome_completo, role, empresa_id")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (profileError || !perfil)
      return { error: profileError?.message ?? "Perfil não encontrado." };

    const role: Role = perfil.role === "tecnico" ? "tecnico" : "gestor";
    const { data: emp } = await supabase
      .from("empresas")
      .select("nome_fantasia")
      .eq("id", perfil.empresa_id)
      .maybeSingle();
    setUser({
      id: perfil.id,
      email: sessionUser.email ?? email,
      nome: perfil.nome_completo || sessionUser.email || email,
      role,
      empresaId: perfil.empresa_id,
      empresaNome: emp?.nome_fantasia ?? "",
    });
    return {};
  }, []);

  const signup = useCallback(
    async (email: string, senha: string, nome: string, empresa: string) => {
      try {
        const redirectUrl = `${window.location.origin}/`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: redirectUrl,
            data: { nome_completo: nome, nome_empresa: empresa },
          },
        });
        if (signUpError) return { error: signUpError.message };

        const userId = signUpData.user?.id;
        if (!userId) return { error: "Falha ao criar conta de usuário." };

        if (!signUpData.session) {
          return { error: "Conta criada! Confirme seu e-mail antes de continuar o cadastro." };
        }

        const { data: empresaRow, error: empresaError } = await supabase
          .from("empresas")
          .insert({ nome_fantasia: empresa })
          .select("id")
          .single();
        if (empresaError || !empresaRow) {
          return { error: `Erro ao criar empresa: ${empresaError?.message ?? "desconhecido"}` };
        }

        const { error: perfilError } = await supabase.from("perfis").insert({
          id: userId,
          empresa_id: empresaRow.id,
          nome_completo: nome,
          role: "gestor" as any,
        });
        if (perfilError) {
          await supabase.auth.signOut();
          return { error: `Erro ao criar perfil. Conta não ativada: ${perfilError.message}` };
        }

        setUser({
          id: userId,
          email,
          nome,
          role: "gestor",
          empresaId: empresaRow.id,
          empresaNome: empresa,
        });
        return {};
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro inesperado durante o cadastro";
        return { error: errorMessage };
      }
    },
    [],
  );

  const updateProfile = useCallback(
    async (nome: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("perfis")
        .update({ nome_completo: nome })
        .eq("id", user.id);
      if (error) throw error;
      setUser({ ...user, nome });
    },
    [user],
  );

  const updateEmpresa = useCallback(
    async (nome: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("empresas")
        .update({ nome_fantasia: nome })
        .eq("id", user.empresaId);
      if (error) throw error;
      setUser({ ...user, empresaNome: nome });
    },
    [user],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: Store = {
    user,
    loadingAuth,
    login,
    signup,
    logout,
    clientes: clientesQ.data ?? [],
    loadingClientes: clientesQ.isLoading,
    addCliente: async (c) => {
      await addClienteM.mutateAsync(c);
    },
    updateCliente: async (id, patch) => {
      await updateClienteM.mutateAsync({ id, patch });
    },
    deleteCliente: async (id) => {
      await deleteClienteM.mutateAsync(id);
    },
    tecnicos: tecnicosQ.data ?? [],
    loadingTecnicos: tecnicosQ.isLoading,
    addTecnico: async (t) => {
      await addTecnicoM.mutateAsync(t);
    },
    updateTecnico: async (id, patch) => {
      await updateTecnicoM.mutateAsync({ id, patch });
    },
    deleteTecnico: async (id) => {
      await deleteTecnicoM.mutateAsync(id);
    },
    itens: itensQ.data ?? [],
    loadingItens: itensQ.isLoading,
    addItem: async (i) => {
      await addItemM.mutateAsync(i);
    },
    updateItem: async (id, patch) => {
      await updateItemM.mutateAsync({ id, patch });
    },
    deleteItem: async (id) => {
      await deleteItemM.mutateAsync(id);
    },
    os: osQ.data ?? [],
    loadingOS: osQ.isLoading,
    osPage,
    osTotal,
    setOsPage,
    osMonth,
    osYear,
    setOsMonth: (m: number) => {
      setOsPage(0);
      setOsMonth(m);
    },
    setOsYear: (y: number) => {
      setOsPage(0);
      setOsYear(y);
    },
    osSearchCliente,
    setOsSearchCliente: (v: string) => {
      setOsPage(0);
      setOsSearchCliente(v);
    },
    osSearchTecnico,
    setOsSearchTecnico: (v: string) => {
      setOsPage(0);
      setOsSearchTecnico(v);
    },
    osFilterStatus,
    setOsFilterStatus: (v: string) => {
      setOsPage(0);
      setOsFilterStatus(v);
    },
    addOS: async (o) => {
      await addOSM.mutateAsync(o);
    },
    updateOS: async (id, patch) => {
      await updateOSM.mutateAsync({ id, patch });
    },
    updateRAT: (id, patch) =>
      setRatLocal((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? { itens: [], evidencias: [] }), ...patch },
      })),
    updateProfile,
    updateEmpresa,
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
