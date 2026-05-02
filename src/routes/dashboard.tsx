import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { useStore, statusColor } from "@/lib/mock-store";
import { ClipboardList, CheckCircle2, DollarSign, Users, TrendingUp, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { os, clientes } = useStore();
  const abertas = os.filter((o) => ["Orçamento", "Aprovado", "Em Execução"].includes(o.status)).length;
  const concluidas = os.filter((o) => o.status === "Concluído").length;
  const faturamento = os.filter((o) => o.status === "Concluído").reduce((s, o) => s + o.valor, 0);

  const cards = [
    { label: "OS Abertas", value: abertas, icon: ClipboardList, color: "bg-info/10 text-info", trend: "+12%" },
    { label: "OS Concluídas", value: concluidas, icon: CheckCircle2, color: "bg-success/10 text-success", trend: "+8%" },
    { label: "Faturamento do Mês", value: `R$ ${faturamento.toLocaleString("pt-BR")}`, icon: DollarSign, color: "bg-primary/10 text-primary", trend: "+24%" },
    { label: "Clientes Ativos", value: clientes.length, icon: Users, color: "bg-warning/20 text-warning-foreground", trend: "+3" },
  ];

  return (
    <GestorLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label} className="p-5">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                  <c.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {c.trend}
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-sm text-muted-foreground">{c.label}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">OS Recentes</h3>
              <a href="/os" className="text-sm text-primary flex items-center gap-1">Ver todas <ArrowUpRight className="w-3 h-3" /></a>
            </div>
            <div className="space-y-2">
              {os.slice(0, 5).map((o) => {
                const cliente = clientes.find((c) => c.id === o.clienteId);
                return (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium text-sm">{o.numero} · {o.titulo}</div>
                      <div className="text-xs text-muted-foreground">{cliente?.nomeFantasia}</div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[o.status]}`}>{o.status}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-4">Status das OS</h3>
            <div className="space-y-3">
              {(["Orçamento", "Aprovado", "Em Execução", "Concluído", "Cancelado"] as const).map((s) => {
                const count = os.filter((o) => o.status === s).length;
                const pct = (count / os.length) * 100;
                return (
                  <div key={s}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{s}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </GestorLayout>
  );
}
