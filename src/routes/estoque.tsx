import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/mock-store";
import { Package, Wrench, Search, TrendingUp, AlertTriangle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/estoque")({ component: EstoquePage });

function EstoquePage() {
  const { itens } = useStore();
  const [q, setQ] = useState("");
  const filtrados = itens.filter((i) => i.nome.toLowerCase().includes(q.toLowerCase()));

  return (
    <GestorLayout>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar item..." className="pl-10 h-11 rounded-xl glass border-0" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtrados.map((i) => {
          const margem = i.custo > 0 ? ((i.venda - i.custo) / i.custo) * 100 : 100;
          const Icon = i.tipo === "Peça" ? Package : Wrench;
          const baixo = i.tipo === "Peça" && i.estoque < 10;
          return (
            <div key={i.id} className="rounded-3xl bg-card border border-border/60 p-5 shadow-[var(--shadow-card)] hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${i.tipo === "Peça" ? "bg-info/10 text-info" : "bg-violet/10 text-violet"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${i.tipo === "Peça" ? "bg-info/10 text-info" : "bg-violet/10 text-violet"}`}>{i.tipo}</span>
              </div>
              <h3 className="font-bold text-base mt-4 leading-tight">{i.nome}</h3>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Custo</div>
                  <div className="font-semibold text-sm">R$ {i.custo.toFixed(2)}</div>
                </div>
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Venda</div>
                  <div className="font-bold text-sm">R$ {i.venda.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
                <span className="flex items-center gap-1 text-xs font-semibold text-success"><TrendingUp className="w-3 h-3" />+{margem.toFixed(0)}% margem</span>
                {i.tipo === "Peça" && (
                  <span className={`text-xs font-semibold flex items-center gap-1 ${baixo ? "text-warning-foreground" : "text-muted-foreground"}`}>
                    {baixo && <AlertTriangle className="w-3 h-3" />}
                    {i.estoque} un.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GestorLayout>
  );
}
