import { createFileRoute, Link } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { useStore, statusColor } from "@/lib/mock-store";
import { ClipboardList, CheckCircle2, DollarSign, Users, TrendingUp, ArrowUpRight, Activity, Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { os, clientes, tecnicos } = useStore();
  const abertas = os.filter((o) => ["Orçamento", "Aprovado", "Em Execução"].includes(o.status)).length;
  const concluidas = os.filter((o) => o.status === "Concluído").length;
  const emCampo = os.filter((o) => o.status === "Em Execução").length;
  const faturamento = os.filter((o) => o.status === "Concluído").reduce((s, o) => s + o.valor, 0);

  return (
    <GestorLayout>
      {/* BENTO GRID */}
      <div className="grid grid-cols-12 auto-rows-[120px] gap-4">
        {/* Hero faturamento */}
        <div className="col-span-12 lg:col-span-6 row-span-2 rounded-3xl p-6 text-primary-foreground relative overflow-hidden shadow-[var(--shadow-glow)]" style={{ backgroundImage: "var(--gradient-hero)" }}>
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-medium opacity-90">
              <Sparkles className="w-3.5 h-3.5" /> FATURAMENTO DO MÊS
            </div>
            <div>
              <div className="text-5xl font-bold tracking-tight">R$ {faturamento.toLocaleString("pt-BR")}</div>
              <div className="flex items-center gap-2 mt-2 text-sm opacity-90">
                <TrendingUp className="w-4 h-4" /> +24% vs mês anterior
              </div>
            </div>
            <div className="flex gap-6 text-xs">
              <div><div className="opacity-75">Ticket médio</div><div className="font-semibold text-base">R$ {concluidas ? Math.round(faturamento / concluidas).toLocaleString("pt-BR") : 0}</div></div>
              <div><div className="opacity-75">Conversão</div><div className="font-semibold text-base">{os.length ? Math.round((concluidas / os.length) * 100) : 0}%</div></div>
            </div>
          </div>
        </div>

        <KpiCard className="col-span-6 lg:col-span-3" icon={ClipboardList} label="OS Abertas" value={abertas} trend="+12%" tone="info" />
        <KpiCard className="col-span-6 lg:col-span-3" icon={CheckCircle2} label="Concluídas" value={concluidas} trend="+8%" tone="success" />
        <KpiCard className="col-span-6 lg:col-span-3" icon={Users} label="Clientes Ativos" value={clientes.length} trend="+3" tone="violet" />
        <KpiCard className="col-span-6 lg:col-span-3" icon={Activity} label="Em Campo Agora" value={emCampo} trend={`${tecnicos.filter(t => t.ativo).length} técnicos`} tone="warning" />

        {/* OS Recentes */}
        <div className="col-span-12 lg:col-span-7 row-span-3 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] border border-border/60">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-lg">Atividade recente</h3>
              <p className="text-xs text-muted-foreground">Últimas ordens de serviço</p>
            </div>
            <Link to="/os" className="text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
              Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {os.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-10">Nenhuma OS ainda. Crie a primeira em <Link to="/os" className="text-primary font-semibold">Ordens de Serviço</Link>.</div>
            )}
            {os.slice(0, 6).map((o) => {
              const cliente = clientes.find((c) => c.id === o.clienteId);
              const suffix = (o.numero?.split("-")[1] ?? "").slice(-2) || "OS";
              return (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/60 transition-all duration-300 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-muted flex items-center justify-center text-xs font-bold text-primary">
                      {suffix}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{o.titulo}</div>
                      <div className="text-xs text-muted-foreground">{cliente?.nomeFantasia ?? "—"} · {o.numero}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${statusColor[o.status]}`}>{o.status}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline */}
        <div className="col-span-12 lg:col-span-5 row-span-3 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] border border-border/60">
          <h3 className="font-bold text-lg">Pipeline de OS</h3>
          <p className="text-xs text-muted-foreground mb-5">Distribuição por status</p>
          <div className="space-y-4">
            {(["Orçamento", "Aprovado", "Em Execução", "Concluído", "Cancelado"] as const).map((s) => {
              const count = os.filter((o) => o.status === s).length;
              const pct = (count / os.length) * 100;
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1.5 font-medium">
                    <span>{s}</span>
                    <span className="text-muted-foreground">{count} OS</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GestorLayout>
  );
}

function KpiCard({ className = "", icon: Icon, label, value, trend, tone }: any) {
  const tones: Record<string, string> = {
    info: "from-info/15 to-info/5 text-info",
    success: "from-success/15 to-success/5 text-success",
    violet: "from-violet/15 to-violet/5 text-violet",
    warning: "from-warning/30 to-warning/10 text-warning-foreground",
  };
  return (
    <div className={`${className} rounded-3xl bg-card p-5 border border-border/60 shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${tones[tone]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">{trend}</span>
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
      </div>
    </div>
  );
}
