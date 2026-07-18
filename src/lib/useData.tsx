import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compressor";

// ============================================================
// Types — UI-shape (kept stable so existing components compile)
// ============================================================
export type Role = "gestor" | "tecnico" | "analista" | "admin" | "superadmin";
export type OSStatus = string;

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
  dias_pagamento?: string;
  dia_envio_planilha?: number;
  modelo_rat_url?: string;
  ultimo_mes_pago?: string | null;
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
  endereco_servico?: string;
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
  empresaPlano?: string;
}

// ============================================================
// DB ↔ UI mappers
// ============================================================
const dbToUiStatus: Record<string, OSStatus> = {
  agendamento: "Agendamento",
  em_andamento: "Em Andamento",
  em_deslocamento: "Em Deslocamento",
  concluido_tecnico: "Concluído Técnico",
  pendencia: "Pendência",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
const uiToDbStatus: Record<OSStatus, string> = {
  Agendamento: "agendamento",
  "Em Andamento": "em_andamento",
  "Em Deslocamento": "em_deslocamento",
  "Concluído Técnico": "concluido_tecnico",
  Pendência: "pendencia",
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
  login: (email: string, senha: string, codigoEmpresa?: string, forceOverwrite?: boolean) => Promise<{ error?: string }>;
  signup: (
    email: string,
    senha: string,
    nome: string,
    empresa: string,
    dominio?: string,
    cnpj?: string,
    telefone?: string,
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
  osPageSize: number;
  setOsPageSize: (s: number) => void;
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
  ) => Promise<void>;
  uploadAsset: (file: File, path: string) => Promise<string>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [ratLocal, setRatLocal] = useState<Record<string, RAT>>({});
  const [osPage, setOsPage] = useState(0);
  const [osPageSize, setOsPageSize] = useState(15);
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
          .select("id, nome_completo, role, empresa_id, avatar_url, current_session_id")
          .eq("id", uid)
          .maybeSingle();

        if (error) {
          console.error(`[auth] erro ao buscar perfil (tentativa ${attempt}):`, error);
          if (attempt === retries) return null;
        } else if (data) {
          // Verifica sessão (Single Session)
          const localSessionId = localStorage.getItem("tqo_session_id");
          const isLoginPage = typeof window !== "undefined" && window.location.pathname.includes("/login");
          if (!isLoginPage && data.current_session_id && data.current_session_id !== localSessionId) {
            console.error("[auth] Sessão inválida ou roubada. Desconectando.");
            throw new Error("INVALID_SESSION");
          }

          // Preserva o role real vindo do banco (gestor | tecnico | analista | admin | superadmin)
          const allowedRoles: Role[] = ["gestor", "tecnico", "analista", "admin", "superadmin"];
          const role: Role = (allowedRoles as string[]).includes(data.role)
            ? (data.role as Role)
            : "gestor";

          // Trava de segurança: analista/gestor/admin sem empresa vinculada não pode entrar
          if (!data.empresa_id && role !== "superadmin") {
            console.error("[auth] Usuário sem empresa vinculada:", { uid, role });
            return null;
          }

          let empresaNome = "";
          let empresaCnpj = "";
          let empresaEndereco = "";
          let empresaTelefone = "";
          let empresaLogo = "";
          let empresaCodigo = "";
          let empresaPlano = "";
          if (data.empresa_id) {
            const { data: emp, error: empErr } = await supabase
              .from("empresas")
              .select("nome_fantasia, cnpj, endereco_comercial, telefone_empresa, logo_url, codigo_empresa, plano")
              .eq("id", data.empresa_id)
              .maybeSingle();
            if (empErr) {
              console.error("[auth] erro ao buscar empresa vinculada:", empErr);
            }
            if (emp) {
              empresaNome = emp.nome_fantasia ?? "";
              empresaCnpj = emp.cnpj ?? "";
              empresaEndereco = emp.endereco_comercial ?? "";
              empresaTelefone = emp.telefone_empresa ?? "";
              empresaLogo = emp.logo_url ?? "";
              empresaCodigo = emp.codigo_empresa ?? "";
              empresaPlano = emp.plano ?? "free";
            } else if (role !== "superadmin") {
              // Vínculo existe no perfil mas empresa não é acessível → falha explícita
              console.error("[auth] Empresa vinculada não encontrada/acessível:", data.empresa_id);
              return null;
            }
          }
          return {
            id: data.id,
            email,
            nome: data.nome_completo || email,
            role,
            empresaId: data.empresa_id,
            empresaNome,
            empresaCnpj,
            empresaEndereco,
            empresaTelefone,
            empresaLogo,
            empresaCodigo,
            empresaPlano,
            avatarUrl: data.avatar_url ?? undefined,
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
        "[auth] Perfil não encontrado após retries. Possível usuário fantasma ou falha de conexão.",
      );
      if (userRef.current) {
        console.warn("[auth] Mantendo a sessão do usuário ativo em memória para evitar logout indesejado.");
        return;
      }
      await supabase.auth.signOut();
      if (mounted) {
        setUser(null);
        setLoadingAuth(false);
      }
      toast.error("Erro de integridade ou perfil não encontrado. Por favor, recarregue a página.");
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
      } catch (err: any) {
        console.error("[auth] getSession falhou:", err);
        if (err?.message === "INVALID_SESSION") {
          await supabase.auth.signOut();
          toast.error("Você foi desconectado porque sua conta foi acessada em outro local.");
          if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.href = "/login";
        }
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      
      const isLoginPage = typeof window !== "undefined" && window.location.pathname.includes("/login");
      // Importante: se estamos no login, deixamos a função `login()` terminar de executar a lógica
      // do Modal de Sessão e setar o `user` manualmente no final.
      if (isLoginPage && event === "SIGNED_IN") return;

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
        } catch (err: any) {
          console.error("[auth] onAuthStateChange falhou:", err);
          if (err?.message === "INVALID_SESSION") {
            await supabase.auth.signOut();
            toast.error("Você foi desconectado porque sua conta foi acessada em outro local.");
            if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.href = "/login";
          }
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
        .select("id, nome, documento, telefone, email, cidade, endereco_completo, base_km, valor_por_km, dias_pagamento, dia_envio_planilha, modelo_rat_url, ultimo_mes_pago", {
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
        dias_pagamento: r.dias_pagamento ?? undefined,
        dia_envio_planilha: r.dia_envio_planilha ?? undefined,
        modelo_rat_url: r.modelo_rat_url ?? undefined,
        ultimo_mes_pago: r.ultimo_mes_pago ?? null,
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
        .select("id, nome, documento, telefone, email, cidade, endereco_completo, base_km, valor_por_km, dias_pagamento, dia_envio_planilha, modelo_rat_url, ultimo_mes_pago")
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
        dias_pagamento: r.dias_pagamento ?? undefined,
        dia_envio_planilha: r.dia_envio_planilha ?? undefined,
        modelo_rat_url: r.modelo_rat_url ?? undefined,
        ultimo_mes_pago: r.ultimo_mes_pago ?? null,
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
        user_id: r.user_id ?? null,
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
        user_id: r.user_id ?? null,
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
      osPageSize,
    ],
    enabled,
    queryFn: async (): Promise<OS[]> => {
      if (!empresaId) return [];

      let selectStr = "*, tecnico:tecnicos(id, nome, perfil, telefone, ativo)";

      let query = supabase
        .from("ordens_servico")
        .select(selectStr, { count: "exact" })
        .eq("empresa_id", empresaId);

      // Filtro de texto: busca por nome do cliente ou número da OS
      if (osSearchCliente) {
        const { data: matchedClients } = await supabase
          .from("clientes")
          .select("id")
          .eq("empresa_id", empresaId)
          .ilike("nome", `%${osSearchCliente}%`);
        
        const cIds = (matchedClients || []).map((c) => c.id);
        if (cIds.length > 0) {
          query = query.or(`numero.ilike.%${osSearchCliente}%,cliente_id.in.(${cIds.join(",")})`);
        } else {
          query = query.ilike("numero", `%${osSearchCliente}%`);
        }
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

      const from = osPage * osPageSize;
      const to = from + osPageSize - 1;
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
          endereco_servico: r.endereco_servico ?? "",
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
          dias_pagamento: c.dias_pagamento || null,
          dia_envio_planilha: c.dia_envio_planilha != null ? Number(c.dia_envio_planilha) : null,
          modelo_rat_url: c.modelo_rat_url ?? null,
          ultimo_mes_pago: c.ultimo_mes_pago ?? null,
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
      if (patch.dias_pagamento !== undefined)
        dbPatch.dias_pagamento = patch.dias_pagamento || null;
      if (patch.dia_envio_planilha !== undefined)
        dbPatch.dia_envio_planilha = patch.dia_envio_planilha != null ? Number(patch.dia_envio_planilha) : null;
      if (patch.modelo_rat_url !== undefined)
        dbPatch.modelo_rat_url = patch.modelo_rat_url ?? null;
      if (patch.ultimo_mes_pago !== undefined)
        dbPatch.ultimo_mes_pago = patch.ultimo_mes_pago ?? null;
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
        endereco_servico: o.endereco_servico ?? null,
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
      if (patch.endereco_servico !== undefined)
        dbPatch.endereco_servico = patch.endereco_servico;
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
  const login = useCallback(async (emailInput: string, senha: string, codigoEmpresa?: string, forceOverwrite?: boolean) => {
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
      .select("id, nome_completo, role, empresa_id, current_session_id, avatar_url")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (profileError || !perfil) {
      return { error: profileError?.message ?? "Perfil não encontrado." };
    }

    if (perfil.current_session_id && !forceOverwrite) {
      // Importante: se forceOverwrite for falso e a sessão existir, devolvemos ALREADY_LOGGED_IN
      // O login.tsx vai interceptar isso e abrir o modal.
      return { error: "ALREADY_LOGGED_IN" };
    }

    // Set new session ID
    const newSessionId = crypto.randomUUID();
    localStorage.setItem("tqo_session_id", newSessionId);
    await supabase.from("perfis").update({ current_session_id: newSessionId }).eq("id", perfil.id);

    const role: Role = perfil.role === "tecnico" ? "tecnico" : "gestor";
    const { data: emp } = await supabase
      .from("empresas")
      .select("nome_fantasia, codigo_empresa, plano, logo_url")
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
      empresaPlano: emp?.plano ?? "free",
      avatarUrl: perfil.avatar_url ?? undefined,
      empresaLogo: emp?.logo_url ?? undefined,
    });
    return {};
  }, []);

function isValidCpfCnpj(val: string) {
  const num = val.replace(/\D/g, "");
  if (num.length === 11) {
    if (/^(\d)\1{10}$/.test(num)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(num.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(num.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(num.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(num.substring(10, 11))) return false;
    return true;
  }
  if (num.length === 14) {
    if (/^(\d)\1{13}$/.test(num)) return false;
    let size = num.length - 2, numbers = num.substring(0, size), digits = num.substring(size);
    let sum = 0, pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    size = size + 1;
    numbers = num.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    return true;
  }
  return false;
}

  const signup = useCallback(
    async (email: string, senha: string, nome: string, empresa: string, dominio?: string, cnpj?: string, telefone?: string) => {
      try {
        if (!cnpj || !isValidCpfCnpj(cnpj)) {
          return { error: "CPF ou CNPJ inválido." };
        }

        const rawCnpj = cnpj.replace(/\D/g, "");

        const { data: existCnpj } = await supabase.from("empresas").select("id").eq("cnpj", rawCnpj).maybeSingle();
        if (existCnpj) {
          return { error: "Este CPF/CNPJ já está cadastrado em nossa base." };
        }

        if (dominio) {
          const { data: existDomain } = await supabase.from("empresas").select("id").eq("dominio", dominio.toLowerCase()).maybeSingle();
          if (existDomain) {
            return { error: "Este domínio já está em uso por outra empresa." };
          }
        }

        const redirectUrl = `${window.location.origin}/`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: redirectUrl,
            data: { 
              nome_completo: nome, 
              nome_empresa: empresa,
              cnpj: cnpj || null,
              telefone_empresa: telefone || null
            },
          },
        });
        if (signUpError) return { error: signUpError.message };

        const userId = signUpData.user?.id;
        if (!userId) return { error: "Falha ao criar conta de usuário." };

        if (!signUpData.session) {
          return { error: "Conta criada! Confirme seu e-mail antes de continuar o cadastro." };
        }

        // Aguardar o trigger handle_new_user criar a empresa e o perfil no banco
        // Fazer um polling simples de no máximo 3 tentativas para garantir que a trigger terminou
        let perfilRow = null;
        for (let i = 0; i < 3; i++) {
          const { data } = await supabase.from("perfis").select("empresa_id").eq("id", userId).maybeSingle();
          if (data?.empresa_id) {
            perfilRow = data;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!perfilRow) {
          return { error: "Conta criada, mas houve um erro ao recuperar o perfil gerado. Tente fazer login." };
        }

        const { data: empresaRow, error: empresaError } = await supabase
          .from("empresas")
          .select("id, codigo_empresa, nome_fantasia, plano")
          .eq("id", perfilRow.empresa_id)
          .single();
        if (empresaError || !empresaRow) {
          return { error: `Erro ao buscar dados da empresa gerada: ${empresaError?.message ?? "desconhecido"}` };
        }

        setUser({
          id: userId,
          email,
          nome,
          role: "gestor",
          empresaId: empresaRow.id,
          empresaNome: empresaRow.nome_fantasia || empresa,
          empresaCodigo: empresaRow.codigo_empresa || "",
          empresaPlano: empresaRow.plano || "free",
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
    async (nome: string, cnpj?: string, endereco?: string, telefone?: string, logoUrl?: string) => {
      if (!user) throw new Error("Não autenticado");
      const dbPatch: any = { nome_fantasia: nome };
      if (cnpj !== undefined) dbPatch.cnpj = cnpj;
      if (endereco !== undefined) dbPatch.endereco_comercial = endereco;
      if (telefone !== undefined) dbPatch.telefone_empresa = telefone;
      if (logoUrl !== undefined) dbPatch.logo_url = logoUrl;

      const { error } = await supabase.from("empresas").update(dbPatch).eq("id", user.empresaId);
      if (error) throw error;
      setUser({
        ...user,
        empresaNome: nome,
        empresaCnpj: cnpj !== undefined ? cnpj : user.empresaCnpj,
        empresaEndereco: endereco !== undefined ? endereco : user.empresaEndereco,
        empresaTelefone: telefone !== undefined ? telefone : user.empresaTelefone,
        empresaLogo: logoUrl !== undefined ? logoUrl : user.empresaLogo,
      });
    },
    [user],
  );

  const uploadAsset = useCallback(async (file: File, path: string) => {
    const finalFile = await compressImage(file);
    const fileExt = finalFile.name.split(".").pop();
    const fileName = `${path}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(fileName, finalFile, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("assets").getPublicUrl(fileName);
    return data.publicUrl;
  }, []);

  const logout = useCallback(async () => {
    if (userRef.current?.id) {
      // Libera a sessão atual no banco
      await supabase.from("perfis").update({ current_session_id: null }).eq("id", userRef.current.id);
    }
    localStorage.removeItem("tqo_session_id");
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
    osPageSize,
    setOsPageSize: (s: number) => {
      setOsPage(0);
      setOsPageSize(s);
    },
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
  Agendamento: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  "Em Andamento": "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300",
  "Em Deslocamento": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Concluído Técnico": "bg-emerald-400/20 text-emerald-600 dark:text-emerald-400",
  Pendência: "bg-red-500/10 text-red-600 dark:text-red-400",
  Concluído: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-500",
  Cancelado: "bg-muted text-muted-foreground",
};
