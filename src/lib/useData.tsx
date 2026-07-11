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
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  cidade?: string;
  endereco_completo?: string;
  base_km?: number;
  valor_por_km?: number;
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
  user_id?: string | null;
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
  km_viagem?: number;
  despesas?: Array<{ tipo: string; valor: number }>;
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
  pendencias_detalhes?: string;
}

export const PAGE_SIZE = 10;

interface User {
  id: string;
  nome: string;
  email: string;
  role: Role;
  empresaId: string;
  empresaNome: string;
  avatarUrl?: string;
  empresaCnpj?: string;
  empresaEndereco?: string;
  empresaTelefone?: string;
  empresaLogo?: string;
  empresaCodigo?: string;
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

const parseDespesas = (value: any): Array<{ tipo: string; valor: number }> => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is { tipo: string; valor: number } => !!item && typeof item === "object")
      .map((item) => ({
        tipo: String(item.tipo ?? "Outros"),
        valor: Number(item.valor ?? 0),
      }));
  }

  if (typeof value === "string") {
    try {
      return parseDespesas(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
};

// ============================================================
// Store
// ============================================================
interface Store {
  user: User | null;
  loadingAuth: boolean;
  login: (email: string, senha: string, codigoEmpresa?: string) => Promise<{ error?: string }>;
  signup: (
    email: string,
    senha: string,
    nome: string,
    empresa: string,
  ) => Promise<{ error?: string }>;
  logout: () => Promise<void>;

  clientes: Cliente[];
  allClientes: Cliente[];
  loadingClientes: boolean;
  clientesPage: number;
  clientesTotal: number;
  clientesSearch: string;
  setClientesSearch: (v: string) => void;
  setClientesPage: (p: number) => void;
  addCliente: (c: Omit<Cliente, "id">) => Promise<string>;
  updateCliente: (id: string, patch: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;

  tecnicos: Tecnico[];
  allTecnicos: Tecnico[];
  loadingTecnicos: boolean;
  tecnicosPage: number;
  tecnicosTotal: number;
  tecnicosSearch: string;
  setTecnicosSearch: (v: string) => void;
  setTecnicosPage: (p: number) => void;
  addTecnico: (t: Omit<Tecnico, "id">) => Promise<string>;
  updateTecnico: (id: string, patch: Partial<Tecnico>) => Promise<void>;
  deleteTecnico: (id: string) => Promise<void>;

  itens: Item[];
  loadingItens: boolean;
  estoquePage: number;
  estoqueTotal: number;
  estoqueSearch: string;
  setEstoqueSearch: (v: string) => void;
  setEstoquePage: (p: number) => void;
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

  updateProfile: (nome: string, avatarUrl?: string) => Promise<void>;
  updateEmpresa: (
    nome: string,
    cnpj?: string,
    endereco?: string,
    telefone?: string,
    logoUrl?: string,
    codigoEmpresa?: string,
  ) => Promise<void>;
  uploadAsset: (file: File, path: string) => Promise<string>;
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

  // Paginação para Clientes, Técnicos e Estoque
  const [clientesPage, setClientesPage] = useState(0);
  const [clientesTotal, setClientesTotal] = useState(0);
  const [clientesSearch, setClientesSearch] = useState("");
  const [tecnicosPage, setTecnicosPage] = useState(0);
  const [tecnicosTotal, setTecnicosTotal] = useState(0);
  const [tecnicosSearch, setTecnicosSearch] = useState("");
  const [estoquePage, setEstoquePage] = useState(0);
  const [estoqueTotal, setEstoqueTotal] = useState(0);
  const [estoqueSearch, setEstoqueSearch] = useState("");

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
          .select("id, nome_completo, role, empresa_id, avatar_url")
          .eq("id", uid)
          .maybeSingle();

        if (error) {
          console.error(`[auth] erro ao buscar perfil (tentativa ${attempt}):`, error);
          if (attempt === retries) return null;
        } else if (data) {
          const role: Role = data.role === "tecnico" ? "tecnico" : "gestor";
          let empresaNome = "";
          let empresaCnpj = "";
          let empresaEndereco = "";
          let empresaTelefone = "";
          let empresaLogo = "";
          const { data: emp } = await supabase
            .from("empresas")
            .select("nome_fantasia, cnpj, endereco_comercial, telefone_empresa, logo_url")
            .eq("id", data.empresa_id)
            .maybeSingle();
          if (emp) {
            empresaNome = emp.nome_fantasia ?? "";
            empresaCnpj = emp.cnpj ?? "";
            empresaEndereco = emp.endereco_comercial ?? "";
            empresaTelefone = emp.telefone_empresa ?? "";
            empresaLogo = emp.logo_url ?? "";
          }
          return {
            id: data.id,
            email,
            nome: data.nome_completo || email,
            role,
            empresaId: data.empresa_id,
            empresaNome,
            avatarUrl: data.avatar_url ?? undefined,
            empresaCnpj,
            empresaEndereco,
            empresaTelefone,
            empresaLogo,
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
    queryKey: ["clientes", empresaId, clientesPage, clientesSearch],
    enabled,
    queryFn: async (): Promise<Cliente[]> => {
      let query = supabase
        .from("clientes")
        .select("id, nome, documento, telefone, email, cidade, endereco_completo, base_km, valor_por_km", {
          count: "exact",
        })
        .eq("empresa_id", empresaId!);

      if (clientesSearch) {
        query = query.ilike("nome", `%${clientesSearch}%`);
      }

      const from = clientesPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query.order("nome").range(from, to);
      if (error) {
        console.error("🔥 ERRO SUPABASE CLIENTES:", error.message, error.hint, error.details);
        throw error;
      }
      setClientesTotal(count ?? 0);
      return (data ?? []).map((r) => ({
        id: r.id,
        nome: r.nome,
        documento: r.documento ?? "",
        telefone: r.telefone ?? "",
        email: r.email ?? "",
        cidade: r.cidade ?? "",
        endereco_completo: r.endereco_completo ?? "",
        base_km: Number(r.base_km ?? 0),
        valor_por_km: Number(r.valor_por_km ?? 0),
      }));
    },
  });

  const allClientesQ = useQuery({
    queryKey: ["all_clientes", empresaId],
    enabled,
    queryFn: async (): Promise<Cliente[]> => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, documento, telefone, email, cidade, endereco_completo, base_km, valor_por_km")
        .eq("empresa_id", empresaId)
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        nome: r.nome,
        documento: r.documento ?? "",
        telefone: r.telefone ?? "",
        email: r.email ?? "",
        cidade: r.cidade ?? "",
        endereco_completo: r.endereco_completo ?? "",
        base_km: Number(r.base_km ?? 0),
        valor_por_km: Number(r.valor_por_km ?? 0),
      }));
    },
  });

  const tecnicosQ = useQuery({
    queryKey: ["tecnicos", empresaId, tecnicosPage, tecnicosSearch],
    enabled,
    queryFn: async (): Promise<Tecnico[]> => {
      if (!empresaId) return [];
      let query = supabase
        .from("tecnicos")
        .select("*", { count: "exact" })
        .eq("empresa_id", empresaId);

      if (tecnicosSearch) {
        query = query.ilike("nome", `%${tecnicosSearch}%`);
      }

      const from = tecnicosPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("🔥 ERRO SUPABASE TÉCNICOS:", error.message, error.hint, error.details);
        throw error;
      } else {
        console.log("✅ TOTAL DE TÉCNICOS RETORNADOS:", data?.length);
      }
      setTecnicosTotal(count ?? 0);
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
        dados_adicionais: r.dados_adicionais ?? {},
      }));
    },
  });

  const allTecnicosQ = useQuery({
    queryKey: ["all_tecnicos", empresaId],
    enabled,
    queryFn: async (): Promise<Tecnico[]> => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from("tecnicos")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome");
      if (error) throw error;
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

      let selectStr = "*, tecnico:tecnicos(id, nome, perfil, telefone, ativo)";
      if (osSearchCliente) {
        selectStr += ", clientes!inner(id, nome)";
      }

      let query = supabase
        .from("ordens_servico")
        .select(selectStr, { count: "exact" })
        .eq("empresa_id", empresaId);

      // Filtro de texto: busca por nome do cliente
      if (osSearchCliente) {
        query = query.ilike("clientes.nome", `%${osSearchCliente}%`);
      }

      // Filtro de técnico: busca pelo nome do técnico
      if (osSearchTecnico) {
        const { data: tecFilter } = await supabase
          .from("tecnicos")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("nome", osSearchTecnico);
        const ids = (tecFilter ?? []).map((t) => t.id);
        if (ids.length > 0) {
          query = query.in("tecnico_id", ids);
        } else {
          query = query.in("tecnico_id", ["__none__"]);
        }
      }

      // Filtro de status: converte o status UI para o valor do banco
      if (osFilterStatus) {
        const dbStatus =
          uiToDbStatus[osFilterStatus as keyof typeof uiToDbStatus] || osFilterStatus;
        query = (query as any).eq("status", dbStatus);
      }

      // Filtro de mês/ano: filtra pelo campo data_agendamento
      if (osMonth > 0 && osYear > 0) {
        const startDate = `${osYear}-${String(osMonth).padStart(2, "0")}-01`;
        const lastDay = new Date(osYear, osMonth, 0).getDate();
        const endDate = `${osYear}-${String(osMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        query = query.gte("data_agendamento", startDate).lte("data_agendamento", endDate);
      }

      const from = osPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("🔥 ERRO SUPABASE OS:", error);
        throw error;
      } else {
        console.log("✅ TOTAL DE OS RETORNADAS:", data?.length);
      }
      setOsTotal(count ?? 0);

      return ((data ?? []) as any[]).map((r) => {
        const dataAgendamento =
          r.data_agendamento ?? r.data_atendimento ?? r.dados_adicionais?.Data ?? null;
        const horarioAtendimento = r.horario_atendimento ?? r.dados_adicionais?.Horario ?? null;

        return {
          id: r.id,
          numero: r.numero ?? "OS-?",
          clienteId: r.cliente_id,
          tecnicoId: r.tecnico_id ?? "",
          analistaId: r.analista_id ?? "",
          titulo: r.titulo || r.descricao_problema || "",
          descricao_problema: r.descricao_problema ?? "",
          status: dbToUiStatus[r.status] ?? "Orçamento",
          criadaEm: (r.created_at ?? "").slice(0, 10),
          data_atendimento: dataAgendamento ?? undefined,
          data_agendamento: dataAgendamento ?? undefined,
          horario_atendimento: horarioAtendimento ?? undefined,
          valor: Number(r.valor ?? 0),
          custo_viagem: Number(r.custo_viagem ?? 0),
          km_viagem: Number(r.km_viagem ?? 0),
          despesas: parseDespesas(r.despesas),
          rat: ratLocal[r.id] ?? { itens: [], evidencias: [] },
          dados_adicionais: r.dados_adicionais ?? {},
          pendencias_detalhes: r.pendencias_detalhes ?? "",
          tecnico: r.tecnico
            ? {
                id: r.tecnico.id,
                nome: r.tecnico.nome,
                perfil: r.tecnico.perfil ?? "",
                telefone: r.tecnico.telefone ?? "",
                ativo: r.tecnico.ativo ?? true,
              }
            : undefined,
        };
      });
    },
  });

  // ---------------- Itens estoque ----------------
  const itensQ = useQuery({
    queryKey: ["itens_inventario", empresaId, estoquePage, estoqueSearch],
    enabled,
    queryFn: async (): Promise<Item[]> => {
      let query = (supabase.from("itens_inventario" as any) as any)
        .select("id, nome, codigo, quantidade, valor_unitario", { count: "exact" })
        .eq("empresa_id", empresaId!);

      if (estoqueSearch) {
        query = query.or(`nome.ilike.%${estoqueSearch}%,codigo.ilike.%${estoqueSearch}%`);
      }

      const from = estoquePage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query.order("nome").range(from, to);
      if (error) throw error;
      setEstoqueTotal(count ?? 0);
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        nome: r.nome,
        codigo: r.codigo ?? "",
        quantidade: Number(r.quantidade ?? 0),
        valor_unitario: Number(r.valor_unitario ?? 0),
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
          nome: c.nome,
          documento: c.documento,
          telefone: c.telefone,
          email: c.email,
          cidade: c.cidade ?? null,
          endereco_completo: c.endereco_completo ?? null,
          base_km: c.base_km != null ? Number(c.base_km) : null,
          valor_por_km: c.valor_por_km != null ? Number(c.valor_por_km) : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clientes"] }); qc.invalidateQueries({ queryKey: ["all_clientes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateClienteM = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Cliente> }) => {
      const dbPatch: Record<string, any> = {};
      if (patch.nome !== undefined) dbPatch.nome = patch.nome;
      if (patch.documento !== undefined) dbPatch.documento = patch.documento;
      if (patch.telefone !== undefined) dbPatch.telefone = patch.telefone;
      if (patch.email !== undefined) dbPatch.email = patch.email;
      if (patch.cidade !== undefined) dbPatch.cidade = patch.cidade ?? null;
      if (patch.endereco_completo !== undefined) dbPatch.endereco_completo = patch.endereco_completo ?? null;
      if (patch.base_km !== undefined)
        dbPatch.base_km = patch.base_km != null ? Number(patch.base_km) : null;
      if (patch.valor_por_km !== undefined)
        dbPatch.valor_por_km = patch.valor_por_km != null ? Number(patch.valor_por_km) : null;
      const { error } = await supabase
        .from("clientes")
        .update(dbPatch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clientes"] }); qc.invalidateQueries({ queryKey: ["all_clientes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteClienteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clientes"] }); qc.invalidateQueries({ queryKey: ["all_clientes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTecnicoM = useMutation({
    mutationFn: async (t: Omit<Tecnico, "id">) => {
      const { data, error } = await (supabase.from("tecnicos") as any)
        .insert({
          empresa_id: empresaId!,
          nome: t.nome,
          perfil: t.perfil,
          telefone: t.telefone,
          ativo: t.ativo,
          comissao: t.comissao,
          tipo_comissao: t.tipo_comissao ?? "fixo",
          chave_pix: t.chave_pix,
          username: t.username || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tecnicos"] }); qc.invalidateQueries({ queryKey: ["all_tecnicos"] }); },
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
      if ((patch as any).email !== undefined) dbPatch.email = (patch as any).email || null;
      if (patch.dados_adicionais !== undefined) dbPatch.dados_adicionais = patch.dados_adicionais;
      const { error } = await (supabase.from("tecnicos") as any).update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tecnicos"] }); qc.invalidateQueries({ queryKey: ["all_tecnicos"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTecnicoM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tecnicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tecnicos"] }); qc.invalidateQueries({ queryKey: ["all_tecnicos"] }); },
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
        km_viagem: o.km_viagem ?? 0,
        despesas: o.despesas ?? [],
        dados_adicionais: o.dados_adicionais ?? {},
        pendencias_detalhes: o.pendencias_detalhes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens_servico"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateOSM = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OS> }) => {
      const dbPatch: Record<string, any> = {};
      if (patch.status) dbPatch.status = uiToDbStatus[patch.status];
      if (patch.titulo !== undefined) dbPatch.titulo = patch.titulo;
      if (patch.valor !== undefined) dbPatch.valor = patch.valor;
      if (patch.custo_viagem !== undefined) dbPatch.custo_viagem = patch.custo_viagem;
      if (patch.km_viagem !== undefined) dbPatch.km_viagem = patch.km_viagem;
      if (patch.despesas !== undefined) dbPatch.despesas = patch.despesas;
      if (patch.tecnicoId !== undefined) dbPatch.tecnico_id = patch.tecnicoId || null;
      if (patch.analistaId !== undefined) dbPatch.analista_id = patch.analistaId || null;
      if (patch.clienteId !== undefined) dbPatch.cliente_id = patch.clienteId;
      if (patch.dados_adicionais !== undefined) dbPatch.dados_adicionais = patch.dados_adicionais;
      if (patch.descricao_problema !== undefined)
        dbPatch.descricao_problema = patch.descricao_problema;
      if (patch.data_agendamento !== undefined) dbPatch.data_agendamento = patch.data_agendamento;
      if (patch.horario_atendimento !== undefined)
        dbPatch.horario_atendimento = patch.horario_atendimento;
      if (patch.pendencias_detalhes !== undefined)
        dbPatch.pendencias_detalhes = patch.pendencias_detalhes;
      const { error } = await (supabase.from("ordens_servico") as any).update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ordens_servico"] }),
    onError: (e: Error) => toast.error(e.message),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itens_inventario"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itens_inventario"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItemM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("itens_inventario" as any) as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itens_inventario"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // ---------------- Auth methods ----------------
  const login = useCallback(async (emailInput: string, senha: string, codigoEmpresa?: string) => {
    let email = emailInput.trim().toLowerCase();

    if (!email.includes("@")) {
      if (!codigoEmpresa) {
        return { error: "Código da Empresa é obrigatório para login de técnico." };
      }

      const { data: resolvedEmail, error: searchError } = await (supabase.rpc as any)(
        "get_email_by_username",
        { p_username: email, p_codigo_empresa: codigoEmpresa.trim().toLowerCase() },
      );

      if (searchError) {
        console.error("RPC get_email_by_username erro:", searchError);
        return { error: `Erro na busca do usuário: ${searchError.message}` };
      }
      if (!resolvedEmail) {
        console.error("RPC get_email_by_username não encontrou o email para o username:", email);
        return { error: "Usuário não encontrado (nenhum email vinculado)." };
      }
      email = resolvedEmail as string;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        return { error: "Senha incorreta" };
      }
      return { error: error.message };
    }

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
      .select("nome_fantasia, codigo_empresa")
      .eq("id", perfil.empresa_id)
      .maybeSingle();
    setUser({
      id: perfil.id,
      email: sessionUser.email ?? email,
      nome: perfil.nome_completo || sessionUser.email || email,
      role,
      empresaId: perfil.empresa_id,
      empresaNome: emp?.nome_fantasia ?? "",
      empresaCodigo: emp?.codigo_empresa ?? "",
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
    async (nome: string, avatarUrl?: string) => {
      if (!user) throw new Error("Não autenticado");
      const dbPatch: any = { nome_completo: nome };
      if (avatarUrl !== undefined) dbPatch.avatar_url = avatarUrl;
      const { error } = await supabase.from("perfis").update(dbPatch).eq("id", user.id);
      if (error) throw error;
      setUser({ ...user, nome, avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl });
    },
    [user],
  );

  const updateEmpresa = useCallback(
    async (nome: string, cnpj?: string, endereco?: string, telefone?: string, logoUrl?: string, codigoEmpresa?: string) => {
      if (!user) throw new Error("Não autenticado");
      
      if (codigoEmpresa !== undefined) {
        // Validate codigo_empresa format (lowercase, no spaces)
        if (!/^[a-z0-9_-]+$/.test(codigoEmpresa)) {
          throw new Error("O código da empresa deve conter apenas letras minúsculas, números, hífens ou underlines.");
        }
      }

      const dbPatch: any = { nome_fantasia: nome };
      if (cnpj !== undefined) dbPatch.cnpj = cnpj;
      if (endereco !== undefined) dbPatch.endereco_comercial = endereco;
      if (telefone !== undefined) dbPatch.telefone_empresa = telefone;
      if (logoUrl !== undefined) dbPatch.logo_url = logoUrl;
      if (codigoEmpresa !== undefined) dbPatch.codigo_empresa = codigoEmpresa;

      const { error } = await supabase.from("empresas").update(dbPatch).eq("id", user.empresaId);
      if (error) {
        if (error.code === '23505' || /duplicate key/.test(error.message)) {
          throw new Error("Este código de empresa já está em uso por outra conta.");
        }
        throw error;
      }

      setUser({
        ...user,
        empresaNome: nome,
        empresaCnpj: cnpj !== undefined ? cnpj : user.empresaCnpj,
        empresaEndereco: endereco !== undefined ? endereco : user.empresaEndereco,
        empresaTelefone: telefone !== undefined ? telefone : user.empresaTelefone,
        empresaLogo: logoUrl !== undefined ? logoUrl : user.empresaLogo,
        empresaCodigo: codigoEmpresa !== undefined ? codigoEmpresa : user.empresaCodigo,
      });
    },
    [user],
  );

  const uploadAsset = useCallback(async (file: File, path: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${path}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("assets").getPublicUrl(fileName);
    return data.publicUrl;
  }, []);

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
    allClientes: allClientesQ.data ?? [],
    loadingClientes: clientesQ.isLoading,
    clientesPage,
    clientesTotal,
    clientesSearch,
    setClientesSearch: (v: string) => {
      setClientesPage(0);
      setClientesSearch(v);
    },
    setClientesPage: (p: number) => {
      setClientesPage(p);
    },
    addCliente: async (c) => {
      return await addClienteM.mutateAsync(c);
    },
    updateCliente: async (id, patch) => {
      await updateClienteM.mutateAsync({ id, patch });
    },
    deleteCliente: async (id) => {
      await deleteClienteM.mutateAsync(id);
    },
    tecnicos: tecnicosQ.data ?? [],
    allTecnicos: allTecnicosQ.data ?? [],
    loadingTecnicos: tecnicosQ.isLoading,
    tecnicosPage,
    tecnicosTotal,
    tecnicosSearch,
    setTecnicosSearch: (v: string) => {
      setTecnicosPage(0);
      setTecnicosSearch(v);
    },
    setTecnicosPage: (p: number) => {
      setTecnicosPage(p);
    },
    addTecnico: async (t) => {
      return await addTecnicoM.mutateAsync(t);
    },
    updateTecnico: async (id, patch) => {
      await updateTecnicoM.mutateAsync({ id, patch });
    },
    deleteTecnico: async (id) => {
      await deleteTecnicoM.mutateAsync(id);
    },
    itens: itensQ.data ?? [],
    loadingItens: itensQ.isLoading,
    estoquePage,
    estoqueTotal,
    estoqueSearch,
    setEstoqueSearch: (v: string) => {
      setEstoquePage(0);
      setEstoqueSearch(v);
    },
    setEstoquePage: (p: number) => {
      setEstoquePage(p);
    },
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
    uploadAsset,
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
