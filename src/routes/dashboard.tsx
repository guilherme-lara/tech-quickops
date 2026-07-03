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
  AlertTriangle,
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
  const { clientes, tecnicos, loadingOS, loadingClientes, osMonth, osYear } = useStore();

  // Gera dataInicio/dataFim com base no filtro de mês/ano
  const hasMonthFilter = osMonth > 0 && osYear > 0;
  const dataInicio = hasMonthFilter
    ? `${osYear}-${String(osMonth).padStart(2, "0")}-01`
    : null;
  const dataFim = hasMonthFilter
    ? (() => {
        const lastDay = new Date(osYear, osMonth, 0).getDate();
        return `${osYear}-${String(osMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      })()
    : null;

  // ============================================================
  // KPIs Financeiros — consulta direta no Supabase (sem depender do store paginado)
  // ============================================================
  const kpisFinanceirosQ = useQuery({
    queryKey: ["kpis_financeiros", profile?.empresa_id, osMonth, osYear],
    enabled: !!profile && profile.role !== "tecnico",
    queryFn: async (): Promise<{
      faturamentoPrevisto: number;
      receitaMes: number;
      pendenciasPagamento: number;
      abertas: number;
      concluidas: number;
      emCampo: number;
    }> => {
      const eid = profile?.empresa_id;
      if (!eid) return { faturamentoPrevisto: 0, receitaMes: 0, pendenciasPagamento: 0, abertas: 0, concluidas: 0, emCampo: 0 };

      // Busca todas as OS da empresa (sem paginação, pois é para KPIs)
      let query = supabase
        .from("ordens_servico")
        .select("status, valor, km_viagem, despesas, data_agendamento")
        .eq("empresa_id", eid);

      if (dataInicio && dataFim) {
        query = query.gte("data_agendamento", dataInicio).lte("data_agendamento", dataFim);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const hoje = new Date();

      const totalFinanceiro = (r: any) => {
        const valorServico = Number(r.valor ?? 0);
        const kmViagem = Number(r.km_viagem ?? 0);
        const despesas = Array.isArray(r.despesas)
          ? r.despesas.reduce((sum: number, item: any) => sum + Number(item?.valor ?? 0), 0)
          : 0;
        return valorServico + kmViagem + despesas;
      };

      const faturamentoPrevisto = rows
        .filter((r: any) => ["aprovado", "em_andamento"].includes(r.status))
        .reduce((s: number, r: any) => s + totalFinanceiro(r), 0);

      const receitaMes = rows
        .filter((r: any) => r.status === "concluido")
        .reduce((s: number, r: any) => s + totalFinanceiro(r), 0);

      const pendenciasPagamento = rows.filter((r: any) => {
        if (!r.data_agendamento || r.status !== "concluido") return false;
        return new Date(r.data_agendamento) < hoje;
      }).length;

      const abertas = rows.filter((r: any) =>
        ["pendente", "aprovado", "em_andamento"].includes(r.status),
      ).length;

      const concluidas = rows.filter((r: any) => r.status === "concluido").length;

      const emCampo = rows.filter((r: any) => r.status === "em_andamento").length;

      return { faturamentoPrevisto, receitaMes, pendenciasPagamento, abertas, concluidas, emCampo };
    },
  });

  const kpis = kpisFinanceirosQ.data ?? {
    faturamentoPrevisto: 0,
    receitaMes: 0,
    pendenciasPagamento: 0,
    abertas: 0,
    concluidas: 0,
    emCampo: 0,
  };

  // ============================================================
  // Contagem total de OS (inclui OS sem técnico)
  // ============================================================
  const contagemTotalQ = useQuery({
    queryKey: ["ordens_servico_total", profile?.empresa_id, osMonth, osYear],
    enabled: !!profile && profile.role !== "tecnico",
    queryFn: async (): Promise<{ total: number; semTecnico: number }> => {
      const eid = profile?.empresa_id;
      if (!eid) return { total: 0, semTecnico: 0 };

      let qTotal = (supabase.from("ordens_servico") as any)
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", eid);

      let qSemTec = (supabase.from("ordens_servico") as any)
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", eid)
        .is("tecnico_id", null);

      if (dataInicio && dataFim) {
        qTotal = qTotal.gte("data_agendamento", dataInicio).lte("data_agendamento", dataFim);
        qSemTec = qSemTec.gte("data_agendamento", dataInicio).lte("data_agendamento", dataFim);
      }

      const { count: total, error: errTotal } = await qTotal;
      if (errTotal) throw errTotal;

      const { count: semTecnico, error: errSemTecnico } = await qSemTec;
      if (errSemTecnico) throw errSemTecnico;

      return { total: total ?? 0, semTecnico: semTecnico ?? 0 };
    },
  });

  // ============================================================
  // OS ativas para técnico logado
  // ============================================================
  const osAtivasQ = useQuery({
    queryKey: ["ordens_servico_ativas_tecnico", profile?.id, osMonth, osYear],
    enabled: !!profile && profile.role === "tecnico",
    queryFn: async (): Promise<number> => {
      let q = (supabase.from("ordens_servico") as any)
        .select("id", { count: "exact", head: true })
        .eq("tecnico_id", profile?.id || "")
        .eq("empresa_id", profile?.empresa_id || "")
        .neq("status", "Concluído")
        .neq("status", "Cancelado");

      if (dataInicio && dataFim) {
        q = q.gte("data_agendamento", dataInicio).lte("data_agendamento", dataFim);
      }

      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const osAtivasCount = profile?.role === "tecnico" ? (osAtivasQ.data ?? 0) : kpis.emCampo;

  // ============================================================
  // Produtividade — busca OS brutas do período e agrupa no frontend
  // ============================================================
  const produtividadeQ = useQuery({
    queryKey: ["produtividade_tecnico", profile?.empresa_id, osMonth, osYear],
    enabled: !!profile && profile.role !== "tecnico",
    queryFn: async (): Promise<ProdRow[]> => {
      const eid = profile?.empresa_id;
      if (!eid) return [];

      let q = supabase
        .from("ordens_servico")
        .select("tecnico_id, status, valor, custo_viagem, km_viagem, despesas, tecnico:tecnicos(id, nome)")
        .eq("empresa_id", eid);

      if (dataInicio && dataFim) {
        q = q.gte("data_agendamento", dataInicio).lte("data_agendamento", dataFim);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const mapa = new Map<string, ProdRow>();

      for (const r of rows) {
        if (!r.tecnico_id) continue;
        const nome = r.tecnico?.nome ?? "—";
        if (!mapa.has(r.tecnico_id)) {
          mapa.set(r.tecnico_id, {
            tecnico_id: r.tecnico_id,
            nome,
            os_concluidas: 0,
            os_total: 0,
            faturamento: 0,
            custos_viagem: 0,
            custos_materiais: 0,
            comissao_pagar: 0,
            km_rodado: 0,
            custo_pedagio: 0,
          });
        }
        const row = mapa.get(r.tecnico_id)!;
        row.os_total++;
        if (r.status === "concluido") {
          row.os_concluidas++;
          const valorServico = Number(r.valor ?? 0);
          const kmViagem = Number(r.km_viagem ?? 0);
          const despesas = Array.isArray(r.despesas)
            ? r.despesas.reduce((sum: number, item: any) => sum + Number(item?.valor ?? 0), 0)
            : 0;
          row.faturamento += valorServico + kmViagem + despesas;
          row.custos_viagem += Number(r.custo_viagem ?? 0);
        }
      }

      return Array.from(mapa.values()).sort((a, b) => b.faturamento - a.faturamento);
    },
  });

  // ============================================================
  // Logs Administrativos
  // ============================================================
  const logsQ = useQuery({
    queryKey: ["logs_administrativos", profile?.empresa_id, osMonth, osYear],
    enabled: !!profile && profile.role !== "tecnico",
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
            {kpisFinanceirosQ.isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              `R$ ${kpis.faturamentoPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">OSs Aprovadas + Em Execução</p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-success/10 to-success/5 p-5 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-xs font-medium text-muted-foreground">Receita do Mês</span>
          </div>
          <div className="text-2xl font-bold">
            {kpisFinanceirosQ.isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              `R$ ${kpis.receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">OSs Concluídas</p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-warning/10 to-warning/5 p-5 border border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-xs font-medium text-muted-foreground">Pendências de Pagamento</span>
          </div>
          <div className="text-2xl font-bold">
            {kpisFinanceirosQ.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              kpis.pendenciasPagamento
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">OSs com data vencida</p>
        </div>
      </div>

      {/* Layout Principal: Coluna Esquerda + Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: KPIs + Atividades Recentes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Aviso de OS Sem Técnico */}
          {contagemTotalQ.data && contagemTotalQ.data.semTecnico > 0 && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  {contagemTotalQ.data.semTecnico} OS(s) sem técnico atribuído
                </p>
                <p className="text-xs text-amber-700">
                  Verifique as importações ou atribua técnicos manualmente
                </p>
              </div>
            </div>
          )}

          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={ClipboardList}
              label="Total de OS"
              value={contagemTotalQ.data?.total ?? 0}
              trend={contagemTotalQ.isLoading ? "..." : "total"}
              tone="info"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Concluídas"
              value={kpis.concluidas}
              trend="período"
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
              label={(profile?.role as string) === "tecnico" ? "OS Ativas" : "Em Campo Agora"}
              value={osAtivasCount}
              trend={(profile?.role as string) === "tecnico" ? "Suas atribuições" : `${tecnicos.filter((t) => t.ativo).length} técnicos`}
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
              {!loadingOS && (
                <div className="text-sm text-muted-foreground text-center py-10">
                  Nenhuma OS ainda. Crie a primeira em{" "}
                  <Link to="/os" className="text-primary font-semibold">
                    Ordens de Serviço
                  </Link>
                  .
                </div>
              )}
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