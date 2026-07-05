import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

export interface FiltroDef {
  /** Identificador único do filtro */
  id: string;
  /** Rótulo exibido acima do campo */
  label: string;
  /** Tipo de input */
  tipo: "texto" | "select" | "select-clientes" | "select-tecnicos" | "select-status";
  /** Valor atual (controlado externamente) */
  valor: string;
  /** Callback para alterar o valor */
  onChange: (valor: string) => void;
  /** Placeholder do input */
  placeholder?: string;
  /** Opções para select (quando aplicável) */
  opcoes?: { value: string; label: string }[];
}

interface FiltrosBarProps {
  filtros: FiltroDef[];
  /** Texto exibido no botão limpar */
  textoLimpar?: string;
}

/**
 * Componente reutilizável de barra de filtros.
 * Renderiza dinamicamente inputs de texto e selects conforme a configuração passada.
 */
export function FiltrosBar({ filtros, textoLimpar = "Limpar filtros" }: FiltrosBarProps) {
  const hasFilters = filtros.some((f) => f.valor);

  // Estados locais para inputs de texto com debounce
  const [termosLocais, setTermosLocais] = useState<Record<string, string>>({});

  useEffect(() => {
    // Inicializa termos locais a partir dos valores atuais
    const initial: Record<string, string> = {};
    filtros.forEach((f) => {
      if (f.tipo === "texto") {
        initial[f.id] = f.valor || "";
      }
    });
    setTermosLocais((prev) => ({ ...prev, ...initial }));
  }, []);

  // Debounce para inputs de texto (500ms)
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    filtros.forEach((f) => {
      if (f.tipo === "texto") {
        const localVal = termosLocais[f.id] ?? "";
        if (localVal !== f.valor) {
          const timer = setTimeout(() => {
            f.onChange(localVal);
          }, 500);
          timers.push(timer);
        }
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [termosLocais]);

  const limparFiltros = () => {
    filtros.forEach((f) => f.onChange(""));
    setTermosLocais({});
  };

  return (
    <div className="flex flex-col md:flex-row items-end gap-4 w-full mb-6">
      {filtros.map((filtro) => (
        <div key={filtro.id} className="flex flex-col gap-1.5 min-w-[180px] flex-1">
          <Label className="text-xs text-muted-foreground">{filtro.label}</Label>

          {filtro.tipo === "texto" && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={filtro.placeholder || "Buscar..."}
                value={termosLocais[filtro.id] ?? filtro.valor}
                onChange={(e) =>
                  setTermosLocais((prev) => ({ ...prev, [filtro.id]: e.target.value }))
                }
                className="pl-8 h-9 text-sm rounded-xl"
              />
              {(termosLocais[filtro.id] ?? filtro.valor) && (
                <button
                  onClick={() => {
                    setTermosLocais((prev) => ({ ...prev, [filtro.id]: "" }));
                    filtro.onChange("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {filtro.tipo === "select" && (
            <Select
              value={filtro.valor || "todos"}
              onValueChange={(val) => filtro.onChange(val === "todos" ? "" : val)}
            >
              <SelectTrigger className="h-9 text-sm rounded-xl">
                <SelectValue placeholder={filtro.placeholder || "Todos"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{filtro.placeholder || "Todos"}</SelectItem>
                {(filtro.opcoes ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filtro.tipo === "select-status" && (
            <Select
              value={filtro.valor || "todos"}
              onValueChange={(val) => filtro.onChange(val === "todos" ? "" : val)}
            >
              <SelectTrigger className="h-9 text-sm rounded-xl">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {(filtro.opcoes ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filtro.tipo === "select-tecnicos" && (
            <Select
              value={filtro.valor || "todos"}
              onValueChange={(val) => filtro.onChange(val === "todos" ? "" : val)}
            >
              <SelectTrigger className="h-9 text-sm rounded-xl">
                <SelectValue placeholder="Todos os técnicos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os técnicos</SelectItem>
                {(filtro.opcoes ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={limparFiltros}
          className="h-9 rounded-xl gap-1.5"
        >
          <X className="w-4 h-4" /> {textoLimpar}
        </Button>
      )}
    </div>
  );
}
