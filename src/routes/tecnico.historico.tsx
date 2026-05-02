import { createFileRoute } from "@tanstack/react-router";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useStore, statusColor } from "@/lib/mock-store";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/tecnico/historico")({ component: HistoricoPage });

function HistoricoPage() {
  const { os, clientes } = useStore();
  const fechadas = os.filter((o) => o.status === "Concluído" || o.status === "Cancelado");
  return (
    <TecnicoLayout>
      <div className="px-4 pt-4">
        <h2 className="text-2xl font-bold tracking-tight">Histórico</h2>
        <p className="text-xs text-muted-foreground">{fechadas.length} OS finalizadas</p>
      </div>
      <div className="px-4 mt-4 space-y-2.5">
        {fechadas.map((o) => {
          const cliente = clientes.find((c) => c.id === o.clienteId);
          return (
            <div key={o.id} className="rounded-2xl bg-card border border-border/60 p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground">{o.numero}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor[o.status]}`}>{o.status}</span>
              </div>
              <div className="font-semibold text-sm mt-1">{o.titulo}</div>
              <div className="text-xs text-muted-foreground">{cliente?.nomeFantasia}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-success font-semibold"><CheckCircle2 className="w-3 h-3" /> {o.criadaEm}</span>
                <span className="text-sm font-bold">R$ {o.valor.toLocaleString("pt-BR")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </TecnicoLayout>
  );
}
