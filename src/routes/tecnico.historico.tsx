import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useStore, statusColor } from "@/lib/useData";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/tecnico/historico")({
  component: () => (
    <ProtectedRoute allowedRoles={['tecnico']}>
      <HistoricoPage />
    </ProtectedRoute>
  ),
});

function HistoricoPage() {
  const { os, clientes, allTecnicos } = useStore();
  const fechadas = os.filter((o) => ["Concluído", "concluido", "Concluído Técnico", "concluido_tecnico", "Cancelado", "cancelado"].includes(o.status));
  return (
    <TecnicoLayout>
      <div className="px-4 pt-4">
        <h2 className="text-2xl font-bold tracking-tight">Histórico</h2>
        <p className="text-xs text-muted-foreground">{fechadas.length} OS finalizadas</p>
      </div>
      <div className="px-4 mt-4 space-y-2.5">
        {fechadas.map((o) => {
          const cliente = clientes.find((c) => c.id === o.clienteId);
          const tecnico = allTecnicos.find((t) => t.id === o.tecnicoId);
          const tipoComissao = tecnico?.tipo_comissao ?? "fixo";
          const comissaoBase = Number(tecnico?.comissao ?? 0);
          const ganho = tipoComissao === "fixo" ? comissaoBase : (Number(o.valor ?? 0) * comissaoBase) / 100;

          return (
            <div
              key={o.id}
              className="rounded-2xl bg-card border border-border/60 p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                  {o.numero}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor[o.status]}`}
                >
                  {o.status}
                </span>
              </div>
              <div className="font-semibold text-sm mt-1">{o.titulo}</div>
              <div className="text-xs text-muted-foreground">{cliente?.nome}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-success font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> {o.criadaEm}
                </span>
                <span className="text-sm font-bold">R$ {ganho.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </TecnicoLayout>
  );
}
