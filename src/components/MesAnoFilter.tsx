import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/useData";
import { CalendarRange } from "lucide-react";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function MesAnoFilter() {
  const { osMonth, osYear, setOsMonth, setOsYear } = useStore();
  const thisYear = new Date().getFullYear();
  const anos = [0, ...Array.from({ length: 6 }, (_, i) => thisYear - i)];

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <CalendarRange className="w-3.5 h-3.5" /> Período:
      </div>
      <Select value={String(osMonth)} onValueChange={(v) => setOsMonth(Number(v))}>
        <SelectTrigger className="h-9 w-[140px] rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Todos os meses</SelectItem>
          {MESES.map((m, i) => (
            <SelectItem key={m} value={String(i + 1)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(osYear)} onValueChange={(v) => setOsYear(Number(v))}>
        <SelectTrigger className="h-9 w-[110px] rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {anos.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y === 0 ? "Todos os anos" : y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
