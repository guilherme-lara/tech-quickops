import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "gestor" | "tecnico";
export type OSStatus = "Orçamento" | "Aprovado" | "Em Execução" | "Concluído" | "Cancelado";

export interface Cliente { id: string; nomeFantasia: string; documento: string; telefone: string; email: string; }
export interface Tecnico { id: string; nome: string; perfil: string; telefone: string; ativo: boolean; }
export interface Item { id: string; nome: string; tipo: "Peça" | "Serviço"; estoque: number; custo: number; venda: number; }
export interface OSItem { itemId: string; quantidade: number; }
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
  titulo: string;
  status: OSStatus;
  criadaEm: string;
  valor: number;
  rat: RAT;
}

interface User { nome: string; email: string; role: Role; }

interface Store {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
  clientes: Cliente[];
  addCliente: (c: Omit<Cliente, "id">) => void;
  tecnicos: Tecnico[];
  itens: Item[];
  os: OS[];
  addOS: (o: Omit<OS, "id" | "numero" | "criadaEm" | "rat">) => void;
  updateOS: (id: string, patch: Partial<OS>) => void;
  updateRAT: (id: string, patch: Partial<RAT>) => void;
}

const Ctx = createContext<Store | null>(null);

const seedClientes: Cliente[] = [
  { id: "c1", nomeFantasia: "Padaria Pão Quente", documento: "12.345.678/0001-90", telefone: "(11) 98765-4321", email: "contato@paoquente.com" },
  { id: "c2", nomeFantasia: "Mercado Bom Preço", documento: "98.765.432/0001-10", telefone: "(11) 91234-5678", email: "compras@bompreco.com" },
  { id: "c3", nomeFantasia: "Restaurante Sabor & Cia", documento: "11.222.333/0001-44", telefone: "(11) 99999-1111", email: "adm@saborecia.com" },
  { id: "c4", nomeFantasia: "Posto Energia Total", documento: "55.444.333/0001-22", telefone: "(11) 95555-3333", email: "gerencia@energiatotal.com" },
];
const seedTecnicos: Tecnico[] = [
  { id: "t1", nome: "Carlos Silva", perfil: "Refrigeração", telefone: "(11) 98888-1111", ativo: true },
  { id: "t2", nome: "Marina Souza", perfil: "Elétrica", telefone: "(11) 97777-2222", ativo: true },
  { id: "t3", nome: "João Pereira", perfil: "Hidráulica", telefone: "(11) 96666-3333", ativo: false },
];
const seedItens: Item[] = [
  { id: "i1", nome: "Compressor 1HP", tipo: "Peça", estoque: 8, custo: 480, venda: 890 },
  { id: "i2", nome: "Filtro Secador", tipo: "Peça", estoque: 24, custo: 35, venda: 75 },
  { id: "i3", nome: "Gás R134a (kg)", tipo: "Peça", estoque: 15, custo: 90, venda: 180 },
  { id: "i4", nome: "Visita Técnica", tipo: "Serviço", estoque: 999, custo: 0, venda: 150 },
  { id: "i5", nome: "Hora Técnica", tipo: "Serviço", estoque: 999, custo: 0, venda: 120 },
  { id: "i6", nome: "Disjuntor 32A", tipo: "Peça", estoque: 12, custo: 25, venda: 60 },
];
const seedOS: OS[] = [
  { id: "o1", numero: "OS-1042", clienteId: "c1", tecnicoId: "t1", titulo: "Manutenção câmara fria", status: "Em Execução", criadaEm: "2026-04-30", valor: 1250, rat: { itens: [], evidencias: [] } },
  { id: "o2", numero: "OS-1043", clienteId: "c2", tecnicoId: "t2", titulo: "Troca de disjuntor geral", status: "Aprovado", criadaEm: "2026-05-01", valor: 480, rat: { itens: [], evidencias: [] } },
  { id: "o3", numero: "OS-1044", clienteId: "c3", tecnicoId: "t1", titulo: "Vazamento de gás", status: "Orçamento", criadaEm: "2026-05-01", valor: 0, rat: { itens: [], evidencias: [] } },
  { id: "o4", numero: "OS-1045", clienteId: "c4", tecnicoId: "t1", titulo: "Instalação de freezer", status: "Concluído", criadaEm: "2026-04-25", valor: 2100, rat: { itens: [], evidencias: [] } },
  { id: "o5", numero: "OS-1046", clienteId: "c1", tecnicoId: "t2", titulo: "Revisão elétrica", status: "Em Execução", criadaEm: "2026-05-02", valor: 720, rat: { itens: [], evidencias: [] } },
  { id: "o6", numero: "OS-1047", clienteId: "c2", tecnicoId: "t1", titulo: "Limpeza de evaporador", status: "Cancelado", criadaEm: "2026-04-20", valor: 0, rat: { itens: [], evidencias: [] } },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [clientes, setClientes] = useState(seedClientes);
  const [tecnicos] = useState(seedTecnicos);
  const [itens] = useState(seedItens);
  const [os, setOs] = useState(seedOS);

  const value: Store = {
    user,
    login: (role) =>
      setUser({
        nome: role === "gestor" ? "Ana Gestora" : "Carlos Silva",
        email: role === "gestor" ? "ana@quickops.com" : "carlos@quickops.com",
        role,
      }),
    logout: () => setUser(null),
    clientes,
    addCliente: (c) => setClientes((prev) => [...prev, { ...c, id: `c${prev.length + 1}` }]),
    tecnicos,
    itens,
    os,
    addOS: (o) =>
      setOs((prev) => [
        ...prev,
        {
          ...o,
          id: `o${prev.length + 1}`,
          numero: `OS-${1048 + prev.length - 5}`,
          criadaEm: new Date().toISOString().slice(0, 10),
          rat: { itens: [], evidencias: [] },
        },
      ]),
    updateOS: (id, patch) => setOs((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    updateRAT: (id, patch) =>
      setOs((prev) => prev.map((x) => (x.id === id ? { ...x, rat: { ...x.rat, ...patch } } : x))),
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
