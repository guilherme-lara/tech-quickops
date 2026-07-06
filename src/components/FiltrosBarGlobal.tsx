import { useStore } from "@/lib/useData";
import { FiltrosBar, type FiltroDef } from "./FiltrosBar";

const COLUNAS_STATUS = ["Orçamento", "Aprovado", "Em Execução", "Concluído", "Cancelado"] as const;

interface FiltrosBarGlobalProps {
  /** Exibe filtro de texto para cliente/número da OS (conectado ao store) */
  showCliente?: boolean;
  /** Exibe filtro select de técnico (conectado ao store) */
  showTecnico?: boolean;
  /** Exibe filtro select de status (conectado ao store) */
  showStatus?: boolean;
  /** Exibe um campo de busca textual genérico (usar com searchValue/onSearchChange) */
  showSearch?: boolean;
  /** Rótulo do campo de busca genérico */
  searchLabel?: string;
  /** Placeholder do campo de busca genérico */
  searchPlaceholder?: string;
  /** Valor controlado externamente para o modo de busca genérica */
  searchValue?: string;
  /** Callback para alterar o valor no modo de busca genérica */
  onSearchChange?: (v: string) => void;
}

/**
 * Componente "inteligente" de barra de filtros.
 *
 * Modo OS (showCliente / showTecnico / showStatus):
 *   Conecta-se automaticamente ao useStore() para buscar os estados
 *   e setters dos filtros da tela de Ordens de Serviço.
 *
 * Modo genérico (showSearch):
 *   Renderiza um campo de texto único. O estado deve ser gerenciado
 *   externamente e passado via searchValue / onSearchChange.
 *
 * Uso típico:
 *   <FiltrosBarGlobal showCliente showTecnico showStatus />
 *   <FiltrosBarGlobal showSearch searchValue={q} onSearchChange={setQ} />
 */
export function FiltrosBarGlobal({
  showCliente,
  showTecnico,
  showStatus,
  showSearch,
  searchLabel = "Buscar",
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
}: FiltrosBarGlobalProps) {
  const store = useStore();

  const filtros: FiltroDef[] = [];

  // ── Modo OS ──────────────────────────────────────────────
  if (showCliente) {
    filtros.push({
      id: "cliente",
      label: "Cliente / Número da OS",
      tipo: "texto",
      placeholder: "Buscar por cliente...",
      valor: store.osSearchCliente,
      onChange: store.setOsSearchCliente,
    });
  }

  if (showTecnico) {
    filtros.push({
      id: "tecnico",
      label: "Técnico",
      tipo: "select-tecnicos",
      valor: store.osSearchTecnico,
      onChange: store.setOsSearchTecnico,
      opcoes: (Array.isArray(store.allTecnicos) ? store.allTecnicos : []).map((t) => ({
        value: t.nome,
        label: t.nome,
      })),
    });
  }

  if (showStatus) {
    filtros.push({
      id: "status",
      label: "Status",
      tipo: "select-status",
      valor: store.osFilterStatus,
      onChange: store.setOsFilterStatus,
      opcoes: COLUNAS_STATUS.map((c) => ({ value: c, label: c })),
    });
  }

  // ── Modo genérico ────────────────────────────────────────
  if (showSearch) {
    filtros.push({
      id: "search",
      label: searchLabel,
      tipo: "texto",
      placeholder: searchPlaceholder,
      valor: searchValue ?? "",
      onChange: (v) => onSearchChange?.(v),
    });
  }

  if (filtros.length === 0) return null;

  return <FiltrosBar filtros={filtros} />;
}
