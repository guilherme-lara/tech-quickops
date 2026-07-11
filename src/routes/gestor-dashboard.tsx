import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, AlertCircle, CheckCircle2, DollarSign, Printer, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";
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

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const startOfMonth = `${mesSelecionado}-01`;
        const d = new Date(`${mesSelecionado}-01T00:00:00`);
        d.setMonth(d.getMonth() + 1);
        const endOfMonth = d.toISOString().substring(0, 7) + '-01';

        const [pendentesRes, osMesRes] = await Promise.all([
          supabase
            .from("ordens_servico")
            .select("id", { count: "exact" })
            .in("status", ["pendente", "em_andamento", "agendamento", "reagendado"]),
          supabase
            .from("ordens_servico")
            .select("id, status, valor, custo_viagem, tecnico_id, tecnicos(nome), created_at")
            .gte("created_at", startOfMonth)
            .lt("created_at", endOfMonth)
        ]);

        if (pendentesRes.error) throw pendentesRes.error;
        if (osMesRes.error) throw osMesRes.error;

        const pendentes_globais = pendentesRes.count || 0;
        const allOs = osMesRes.data || [];
        
        const os_mes = allOs.length;
        const concluidasMes = allOs.filter(os => os.status === 'concluido');
        const concluidas_mes = concluidasMes.length;
        
        const faturamento_mes = concluidasMes.reduce((acc, os) => acc + (Number(os.valor) || 0), 0);
        const custos_viagem_mes = concluidasMes.reduce((acc, os) => acc + (Number(os.custo_viagem) || 0), 0);

        setResumo({
          os_mes,
          pendentes_globais,
          concluidas_mes,
          faturamento_mes,
          custos_viagem_mes
        });

        const tecnicosMap = new Map();
        concluidasMes.forEach(os => {
          if (os.tecnico_id) {
            const tId = os.tecnico_id;
            // @ts-ignore
            const tNome = os.tecnicos?.nome || "Desconhecido";
            if (!tecnicosMap.has(tId)) {
              tecnicosMap.set(tId, { tecnico_nome: tNome, os_finalizadas: 0, faturamento_gerado: 0 });
            }
            const stat = tecnicosMap.get(tId);
            stat.os_finalizadas += 1;
            stat.faturamento_gerado += (Number(os.valor) || 0);
          }
        });
        
        const rankingArr = Array.from(tecnicosMap.values()).sort((a, b) => b.faturamento_gerado - a.faturamento_gerado);
        setRanking(rankingArr);

      } catch (e: any) {
        toast.error("Erro ao carregar dados do dashboard: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [mesSelecionado]);

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

  const handlePrint = () => window.print();

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    
    // Resumo
    const resumoData = [{
      "Mês Referência": mesSelecionado,
      "OS do Mês": resumo?.os_mes ?? 0,
      "Pendentes Globais": resumo?.pendentes_globais ?? 0,
      "Concluídas do Mês": resumo?.concluidas_mes ?? 0,
      "Faturamento (R$)": Number(resumo?.faturamento_mes ?? 0).toFixed(2),
      "Custos (R$)": Number(resumo?.custos_viagem_mes ?? 0).toFixed(2),
    }];
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    // Ranking
    const rankingData = ranking.map(t => ({
      "Técnico": t.tecnico_nome || t.nome || "—",
      "OS Finalizadas": t.os_finalizadas ?? 0,
      "Faturamento Gerado (R$)": Number(t.faturamento_gerado ?? 0).toFixed(2),
    }));
    const wsRanking = XLSX.utils.json_to_sheet(rankingData);
    XLSX.utils.book_append_sheet(wb, wsRanking, "Ranking");

    XLSX.writeFile(wb, `Gestor_Relatorio_${mesSelecionado}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500 print:p-0 print:space-y-4 bg-white dark:bg-white text-slate-900 dark:text-slate-900 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 print:mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Estratégica</h1>
          <p className="text-muted-foreground">
            Resumo operacional e financeiro
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 print:hidden">
          <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o Mês" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                return (
                  <SelectItem key={val} value={val} className="capitalize">
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportXLSX}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">OS do Mês</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.os_mes ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes Globais</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.pendentes_globais ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas do Mês</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo?.concluidas_mes ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 shadow-sm">
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
                  <thead className="text-xs text-slate-500 dark:text-slate-500 uppercase bg-slate-50 dark:bg-slate-50 rounded-t-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg font-medium">Técnico</th>
                      <th className="px-4 py-3 font-medium text-center">OS Finalizadas</th>
                      <th className="px-4 py-3 rounded-tr-lg font-medium text-right">Faturamento Gerado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {ranking.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-50 transition-colors border-b border-slate-100 dark:border-slate-100 last:border-0">
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
        <Card className="rounded-2xl border-slate-200 bg-white dark:bg-white text-slate-900 dark:text-slate-900 shadow-sm">
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
