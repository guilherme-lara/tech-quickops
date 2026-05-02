import { createFileRoute, Link } from "@tanstack/react-router";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useStore, statusColor } from "@/lib/mock-store";
import { ChevronRight, MapPin, Clock, Zap } from "lucide-react";

export const Route = createFileRoute("/tecnico/os")({ component: TecOSList });

function TecOSList() {
  const { os, clientes, user } = useStore();
  const tecnicoId = "t1";
  const minhasOS = os.filter((o) => o.tecnicoId === tecnicoId && o.status !== "Cancelado");
  const pend = minhasOS.filter((o) => o.status !== "Concluído").length;

  return (
    <TecnicoLayout>
      {/* Hero */}
      <div className="px-4 pt-2">
        <div className="rounded-3xl p-5 text-white relative overflow-hidden shadow-[var(--shadow-glow)]" style={{ backgroundImage: "var(--gradient-hero)" }}>
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/15 blur-2xl" />
          <div className="relative z-10">
            <p className="text-xs opacity-80 font-medium">Bom dia,</p>
            <h2 className="text-2xl font-bold tracking-tight">{user?.nome?.split(" ")[0]} 👋</h2>
            <div className="mt-4 flex items-center gap-2">
              <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 px-3 py-2">
                <div className="text-[10px] opacity-80 uppercase tracking-wider">Pendentes</div>
                <div className="text-xl font-bold">{pend}</div>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 px-3 py-2">
                <div className="text-[10px] opacity-80 uppercase tracking-wider">Hoje</div>
                <div className="text-xl font-bold">{minhasOS.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-5">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Atendimentos</h3>
        <div className="space-y-2.5">
          {minhasOS.map((o) => {
            const cliente = clientes.find((c) => c.id === o.clienteId);
            return (
              <Link key={o.id} to="/tecnico/os/$id/rat" params={{ id: o.id }}
                className="block rounded-2xl bg-card border border-border/60 p-4 shadow-[var(--shadow-card)] active:scale-[0.98] transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider text-muted-foreground">{o.numero}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor[o.status]}`}>{o.status}</span>
                    </div>
                    <div className="font-semibold text-sm mt-1.5">{o.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">{cliente?.nomeFantasia}</div>
                    <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> São Paulo, SP</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 09:00</span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet flex items-center justify-center text-primary-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </TecnicoLayout>
  );
}
