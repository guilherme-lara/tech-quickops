import { useSyncExternalStore } from "react";

export type Tecnico = { id: string; nome: string };

type State = {
  disponiveis: Tecnico[];
  equipe: Tecnico[];
  loading: boolean;
};

let state: State = {
  disponiveis: [
    { id: "t1", nome: "João Silva" },
    { id: "t2", nome: "Marcos Pereira" },
    { id: "t3", nome: "Rafael Costa" },
    { id: "t4", nome: "Pedro Almeida" },
    { id: "t5", nome: "Lucas Rocha" },
  ],
  equipe: [
    { id: "t6", nome: "Fernanda Dias" },
    { id: "t7", nome: "Gustavo Nunes" },
  ],
  loading: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const setState = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const equipeStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot() {
    return state;
  },
  async adicionar(t: Tecnico) {
    setState({ loading: true });
    await delay(600);
    setState({
      disponiveis: state.disponiveis.filter((x) => x.id !== t.id),
      equipe: [...state.equipe, t],
      loading: false,
    });
  },
  async remover(t: Tecnico) {
    setState({ loading: true });
    await delay(600);
    setState({
      equipe: state.equipe.filter((x) => x.id !== t.id),
      disponiveis: [...state.disponiveis, t],
      loading: false,
    });
  },
};

export function useEquipeStore() {
  return useSyncExternalStore(equipeStore.subscribe, equipeStore.getSnapshot, equipeStore.getSnapshot);
}
