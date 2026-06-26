import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { useStore, statusColor } from "@/lib/mock-store";
import { MesAnoFilter } from "@/components/MesAnoFilter";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowUpRight,
  Activity,
  Sparkles,
  Wallet,
  FileText,
  Clock,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  ),
});

interface ProdRow {
  tecnico_id: string;
  nome: string;
  os_concluidas: number;
  os_total: number;
  faturamento: number;
  custos_viagem: number;
  custos_materiais: number;
  comissao_pagar: number;
  km_rodado: number;
  custo_pedagio: number;
}

interface LogEntry {
  id: string;
  created_at: string;
  tipo: string;
  descricao: string;
  usuario_nome: string;
}

function Dashboard() {
  const { profile } = useAuth();
  const { os, clientes, tecnicos, loadingOS, loadingClientes } = useStore();

  // Cards estratégicos
  const faturamentoPrevisto = os
    .filter((o) => ["Aprovado", "Em Execução"].includes(o.status))
    .reduce((s, o) => s + o.valor, 0);

  const receitaMes = os
    .filter((o) => o.status === "Concluído")
    .reduce((s, o) => s + o.valor, 0);

  const hoje = new Date();
  const pendenciasPagamento = os.filter((o) => {
    if (!o.data_agendamento || o.status !== "Concluído") return false;
    const dataVencimento = new Date(o.data_agendamento);
    return dataVencimento < hoje;
  }).length;

  const abertas = os.filter((o) =>
    ["Orçamento", "Aprovado", "Em Execução"].includes(o.status),
  ).length;
  const concluidas = os.filter((o) => o.status === "Concluído").length;
  const emCampo = os.filter((o) => o.status === "Em Execução").length;

  const produtividadeQ = useQuery({
    queryKey: ["vw_produtividade_tecnico", profile?.empresa_id],
    enabled: !!profile && profile.role !== "tecnico",
    queryFn: async (): Promise<ProdRow[]> => {
      const { data, error } = await (supabase.from("vw_produtividade_tecnico" as any) as any)
        .select("*")
        .order("faturamento", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        tecnico_id: r.tecnico_id,
        nome: r.nome ?? "—",
        os_concluidas: Number(r.os_concluidas ?? 0),
        os_total: Number(r.os_total ?? 0),
        faturamento: Number(r.faturamento ?? 0),
        custos_viagem: Number(r.custos_viagem ?? 0),
        custos_materiais: Number(r.custos_materiais ?? 0),
        comissao_pagar: Number(r.comissao_pagar ?? 0),
        km_rodado: Number(r.km_rodado ?? 0),
        custo_pedagio: Number(r.custo_pedagio ?? 0),
      }));
    },
  });

  const logsQ = useQuery({
    queryKey: ["logs_administrativos", profile?.empresa_id],
    enabled: false, // Desabilitado até criarmos a tabela
    queryFn: async (): Promise<LogEntry[]> => {
      const { data, error } = await (supabase.from("logs_administrativos" as any) as any)
        .select("*")
        .eq("empresa_id", profile?.empresa_id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as LogEntry[];
    },
  });

  if (profile?.role === "tecnico") {
    return <Navigate to="/tecnico/os" replace />;
  }

  return (
    <GestorLayout>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Visão geral do período selecionado</p>
        </div>
        <MesAnoFilter />
      </div>

      {/* Cards Estratégicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 p-5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Faturamento Previsto</span>
          </div>
          <div className="text-2xl font-bold">
            R$ {faturamentoPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">OSs Aprovadas + Em Execução</p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-success/10 to-success/5 p-5 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-xs font-medium text-muted-foreground">Receita do Mês</span>
          </div>
          <div className="text-2xl font-bold">
            R$ {receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">OSs Concluídas</p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-warning/10 to-warning/5 p-5 border border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-xs font-medium text-muted-foreground">Pendências de Pagamento</span>
          </div>
          <div className="text-2xl font-bold">{pendenciasPagamento}</div>
          <p className="text-xs text-muted-foreground mt-1">OSs com data vencida</p>
        </div>
      </div>

      {/* Layout Principal: Coluna Esquerda + Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: KPIs + Atividades Recentes */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={ClipboardList}
              label="OS Abertas"
              value={abertas}
              trend="+12%"
              tone="info"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Concluídas"
              value={concluidas}
              trend="+8%"
              tone="success"
            />
            <KpiCard
              icon={Users}
              label="Clientes Ativos"
              value={clientes.length}
              trend="+3"
              tone="violet"
            />
            <KpiCard
              icon={Activity}
              label="Em Campo Agora"
              value={emCampo}
              trend={`${tecnicos.filter((t) => t.ativo).length} técnicos`}
              tone="warning"
            />
          </div>

          {/* Atividades Recentes */}
          <div className="rounded-3xl bg-card p-4 md:p-6 shadow-[var(--shadow-card)] border border-border/60">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg">Atividades Recentes</h3>
                <p className="text-xs text-muted-foreground">Últimas ordens de serviço</p>
              </div>
              <Link
                to="/os"
                className="text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all"
              >
                Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {loadingOS && (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="w-10 h-10 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-3 w-2/5" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              )}
              {!loadingOS && os.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-10">
                  Nenhuma OS ainda. Crie a primeira em{" "}
                  <Link to="/os" className="text-primary font-semibold">
                    Ordens de Serviço
                  </Link>
                  .
                </div>
              )}
              {!loadingOS &&
                os.slice(0, 6).map((o) => {
                  const cliente = clientes.find((c) => c.id === o.clienteId);
                  const suffix = (o.numero?.split("-")[1] ?? "").slice(-2) || "OS";
                  return (
                    <div
                      key={o.id}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/60 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-muted flex items-center justify-center text-xs font-bold text-primary">
                          {suffix}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{o.titulo}</div>
                          <div className="text-xs text-muted-foreground">
                            {cliente?.nomeFantasia ?? "—"} · {o.numero}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${statusColor[o.status]}`}
                      >
                        {o.status}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Produtividade + Logs */}
        <div className="space-y-6">
          {/* Produtividade da Equipe */}
          <div className="rounded-3xl bg-card p-4 md:p-6 shadow-[var(--shadow-card)] border border-border/60">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" /> Produtividade
                </h3>
                <p className="text-xs text-muted-foreground">Performance por técnico</p>
              </div>
            </div>
            {produtividadeQ.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : produtividadeQ.error ? (
              <div className="text-sm text-destructive py-4">
                Erro ao carregar produtividade: {(produtividadeQ.error as Error).message}
              </div>
            ) : (produtividadeQ.data ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Nenhuma OS concluída no período ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="px-2 py-2 font-semibold">Técnico</th>
                      <th className="px-2 py-2 font-semibold text-right">Eficiência</th>
                      <th className="px-2 py-2 font-semibold text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(produtividadeQ.data ?? []).slice(0, 5).map((p) => {
                      const eficiencia = p.os_total > 0 ? Math.round((p.os_concluidas / p.os_total) * 100) : 0;
                      return (
                        <tr key={p.tecnico_id} className="hover:bg-muted/30">
                          <td className="px-2 py-2.5 font-medium text-xs">{p.nome.split(" ")[0]}</td>
                          <td className="px-2 py-2.5 text-right text-xs">
                            <span className={`font-semibold ${eficiencia >= 70 ? "text-success" : eficiencia >= 40 ? "text-warning" : "text-destructive"}`}>
                              {eficiencia}%
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right text-xs font-semibold">
                            R$ {p.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Logs Administrativos */}
          <div className="rounded-3xl bg-card p-4 md:p-6 shadow-[var(--shadow-card)] border border-border/60">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Logs do Sistema
                </h3>
                <p className="text-xs text-muted-foreground">Últimas 10 ações</p>
              </div>
              <Link to="/logs">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  Ver mais
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {logsQ.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : logsQ.error ? (
                <div className="text-sm text-destructive py-4">
                  Erro ao carregar logs: {(logsQ.error as Error).message}
                </div>
              ) : (logsQ.data ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Nenhum log registrado ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {(logsQ.data ?? []).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-relaxed">{log.descricao}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
    <div
      className={`${className} rounded-3xl bg-card p-4 border border-border/60 shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${tones[tone]}`}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
          {trend}
        </span>
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
      </div>
    </div>
  );
}