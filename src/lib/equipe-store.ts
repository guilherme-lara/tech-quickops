import { create } from "zustand";

export type Tecnico = { id: string; nome: string };

type EquipeState = {
  disponiveis: Tecnico[];
  equipe: Tecnico[];
  loading: boolean;
  adicionar: (t: Tecnico) => Promise<void>;
  remover: (t: Tecnico) => Promise<void>;
};

const MOCK_DISPONIVEIS: Tecnico[] = [
  { id: "t1", nome: "João Silva" },
  { id: "t2", nome: "Marcos Pereira" },
  { id: "t3", nome: "Rafael Costa" },
  { id: "t4", nome: "Pedro Almeida" },
  { id: "t5", nome: "Lucas Rocha" },
];

const MOCK_EQUIPE: Tecnico[] = [
  { id: "t6", nome: "Fernanda Dias" },
  { id: "t7", nome: "Gustavo Nunes" },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useEquipeStore = create<EquipeState>((set, get) => ({
  disponiveis: MOCK_DISPONIVEIS,
  equipe: MOCK_EQUIPE,
  loading: false,
  adicionar: async (t) => {
    set({ loading: true });
    await delay(600);
    set({
      disponiveis: get().disponiveis.filter((x) => x.id !== t.id),
      equipe: [...get().equipe, t],
      loading: false,
    });
  },
  remover: async (t) => {
    set({ loading: true });
    await delay(600);
    set({
      equipe: get().equipe.filter((x) => x.id !== t.id),
      disponiveis: [...get().disponiveis, t],
      loading: false,
    });
  },
}));
