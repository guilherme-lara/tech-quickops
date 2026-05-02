import { createFileRoute, Link } from "@tanstack/react-router";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useStore, statusColor } from "@/lib/mock-store";
import { ChevronRight, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/tecnico/os")({ component: TecOSList });

function TecOSList() {
  const { os, clientes, user } = useStore();
  // Pretend logged-in técnico is t1 (Carlos) for the mock
  const tecnicoId = user?.role === "tecnico" ? "t1" : "";
  const minhasOS = os.filter((o) => o.tecnicoId === tecnicoId && o.status !== "Cancelado");

  return (
    <TecnicoLayout>
      <div className="p-4 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground -mb-3 rounded-b-3xl">
        <p className="text-xs opacity-80">Olá,</p>
        <h2 className="text-xl font-bold">{user?.nome}</h2>
        <p className="text-xs opacity-80 mt-1">Você tem {minhasOS.filter((o) => o.status !== "Concluído").length} OS pendentes hoje</p>
      </div>

      <div className="p-4 space-y-3">
        {minhasOS.map((o) => {
          const cliente = clientes.find((c) => c.id === o.clienteId);
          return (
            <Link key={o.id} to="/tecnico/os/$id/rat" params={{ id: o.id }} className="block">
              <div className="bg-card rounded-xl p-4 border border-border active:scale-[0.98] transition-transform">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-muted-foreground">{o.numero}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[o.status]}`}>{o.status}</span>
                </div>
                <div className="font-semibold">{o.titulo}</div>
                <div className="text-sm text-muted-foreground mt-1">{cliente?.nomeFantasia}</div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cliente?.telefone}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {o.criadaEm}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          );
        })}
        {minhasOS.length === 0 && (
          <div className="text-center text-muted-foreground py-12 text-sm">Nenhuma OS atribuída.</div>
        )}
      </div>
    </TecnicoLayout>
  );
}
