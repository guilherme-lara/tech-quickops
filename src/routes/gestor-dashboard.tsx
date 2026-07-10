import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, AlertCircle, CheckCircle2, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export const Route = createFileRoute("/gestor-dashboard")({
  component: () => (
    <ProtectedRoute>
      <GestorLayout>
        <GestorDashboard />
      </GestorLayout>
    </ProtectedRoute>
  ),
});

function GestorDashboard() {
  const [resumo, setResumo] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [resumoRes, rankingRes] = await Promise.all([
          supabase.from("view_resumo_gestor" as any).select("*").limit(1).single(),
          supabase.from("view_ranking_tecnicos" as any).select("*"),
        ]);

        if (resumoRes.error) throw resumoRes.error;
        if (rankingRes.error) throw rankingRes.error;

        setResumo(resumoRes.data);
        setRanking(rankingRes.data || []);
      } catch (e: any) {
        toast.error("Erro ao carregar dados do dashboard: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const chartData = resumo
    ? [
        { name: "Pendentes", value: Number(resumo.pendentes_globais) || 0, color: "#f59e0b" },
        { name: "Concluídas (Mês)", value: Number(resumo.concluidas_mes) || 0, color: "#10b981" },
      ]
    : [];

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Estratégica</h1>
        <p className="text-muted-foreground">
          Resumo operacional e ranking de técnicos.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">OS do Mês</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.os_mes ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes Globais</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.pendentes_globais ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas do Mês</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.concluidas_mes ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {Number(resumo?.faturamento_mes ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Ranking de Técnicos */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Ranking de Desempenho (Técnicos)</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/40 rounded-t-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg font-medium">Técnico</th>
                      <th className="px-4 py-3 font-medium text-center">OS Finalizadas</th>
                      <th className="px-4 py-3 rounded-tr-lg font-medium text-right">Faturamento Gerado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {ranking.map((t, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{t.tecnico_nome || t.nome || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-full font-semibold">
                            {t.os_finalizadas ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          R$ {Number(t.faturamento_gerado ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Pizza */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg">Pendentes vs Concluídas</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {chartData.every(d => d.value === 0) ? (
              <p className="text-sm text-muted-foreground">Sem dados para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value, "OS"]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--background)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
