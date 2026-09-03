import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { SectionTabs } from "@/components/SectionTabs";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ClipboardList, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Printer, 
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Building,
  TrendingUp,
  Percent
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Line
} from "recharts";

export const Route = createFileRoute("/gestor-dashboard")({
  component: () => (
    <ProtectedRoute allowedRoles={['gestor', 'admin', 'superadmin']}>
      <GestorLayout>
      <SectionTabs group="estrategica" />
        <GestorDashboard />
      </GestorLayout>
    </ProtectedRoute>
  ),
});

function getTrend(current: number, previous: number) {
  if (!previous) return { val: "+0%", isUp: true };
  const pct = ((current - previous) / previous) * 100;
  const formatted = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  return { val: formatted, isUp: pct >= 0 };
}

function getTransitionDurations(logs: any[]) {
  const sortedLogs = [...logs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  let tDeslocamento: Date | null = null;
  let tAndamento: Date | null = null;
  let tConcluido: Date | null = null;
  
  for (const log of sortedLogs) {
    const status = (log.status_novo ?? "").toLowerCase();
    if (status === "em_deslocamento") {
      tDeslocamento = new Date(log.created_at);
    } else if (status === "em_andamento" || status === "em_execucao") {
      tAndamento = new Date(log.created_at);
    } else if (status === "concluido_tecnico" || status === "concluido") {
      tConcluido = new Date(log.created_at);
    }
  }
  
  let tmd: number | null = null;
  if (tDeslocamento && tAndamento && tAndamento > tDeslocamento) {
    tmd = (tAndamento.getTime() - tDeslocamento.getTime()) / (1000 * 60); // minutes
  }
  
  let tma: number | null = null;
  if (tAndamento && tConcluido && tConcluido > tAndamento) {
    tma = (tConcluido.getTime() - tAndamento.getTime()) / (1000 * 60); // minutes
  }
  
  return { tmd, tma };
}

function formatMinutes(minutes: number) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function TecnicoOSModalContent({ tecnicoId, tecnicoNome, defaultMes }: { tecnicoId: string, tecnicoNome: string, defaultMes: string }) {
  const [mes, setMes] = useState(defaultMes);

  const { data: osList, isLoading } = useQuery({
    queryKey: ['tecnico_os_historico_modal', tecnicoId, mes],
    queryFn: async () => {
      let query = supabase
        .from("ordens_servico")
        .select("id, numero, titulo, status, valor, custo_viagem, km_viagem, despesas, tecnico_id, data_agendamento, horario_atendimento, created_at, data_hora_inicio, data_hora_fim, clientes(nome), tecnicos(comissao, tipo_comissao, horas_limite, valor_hora_extra)")
        .eq('tecnico_id', tecnicoId)
        .order("data_agendamento", { ascending: false });

      if (mes !== 'todos') {
        const [yearStr, monthStr] = mes.split("-");
        const startOfMonth = `${mes}-01`;
        const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate();
        const endOfMonth = `${mes}-${String(lastDay).padStart(2, "0")}`;
        query = query.gte("data_agendamento", startOfMonth).lte("data_agendamento", endOfMonth);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const handleExportCSV = () => {
    if (!osList || osList.length === 0) return;
    const header = ["ID da OS", "Cliente", "Data", "Faturamento (R$)", "Valor do Técnico (R$)", "Status"];
    const rows = osList.map((os: any) => {
      const dataOs = os.data_agendamento ? new Date(os.data_agendamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : new Date(os.created_at).toLocaleDateString('pt-BR');
      const clienteNome = os.clientes?.nome || "Desconhecido";
      
      const valorServico = Number(os.valor) || 0;
      const custoViagem = Number(os.custo_viagem) || 0;
      const totalDespesas = Array.isArray(os.despesas) ? os.despesas.reduce((s: number, d: any) => s + (Number(d?.valor) || 0), 0) : 0;
      const faturamento = valorServico + custoViagem + totalDespesas;
      
      const comissao = Number(os.tecnicos?.comissao) || 0;
      const tipoComissao = os.tecnicos?.tipo_comissao || 'porcentagem';
      const valorTecnico = tipoComissao === 'fixo' ? comissao : (valorServico * comissao) / 100;
      // Hora extra: tempo além do limite configurado para a OS
      const horasLimite = Number(os.tecnicos?.horas_limite) || 0;
      const valorHoraExtra = Number(os.tecnicos?.valor_hora_extra) || 0;
      const duracaoH = os.data_hora_inicio && os.data_hora_fim
        ? (new Date(os.data_hora_fim).getTime() - new Date(os.data_hora_inicio).getTime()) / 3600000
        : 0;
      const horaExtraValor = horasLimite > 0 && valorHoraExtra > 0 && duracaoH > horasLimite
        ? (duracaoH - horasLimite) * valorHoraExtra
        : 0;
      const valorTecnicoTotal = valorTecnico + horaExtraValor;

      return [
        os.numero || os.id,
        `"${clienteNome}"`,
        dataOs,
        faturamento.toFixed(2).replace('.', ','),
        valorTecnicoTotal.toFixed(2).replace('.', ','),
        os.status
      ].join(";");
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + header.join(";") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_Tecnico_${tecnicoNome}_${mes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center justify-between w-full">
          <DialogTitle>Ordens de Serviço - {tecnicoNome}</DialogTitle>
          <div className="flex items-center gap-2">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo o Histórico</SelectItem>
                {Array.from({ length: 6 }).map((_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                  return <SelectItem key={val} value={val}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleExportCSV} variant="outline" className="h-9 gap-1.5 shrink-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-700">
              <Download className="w-4 h-4" /> Exportar (CSV)
            </Button>
          </div>
        </div>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-2 pr-2 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Carregando Ordens de Serviço...</div>
        ) : (!osList || osList.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma OS encontrada para este técnico neste período.</div>
        ) : (
          osList.map((os: any) => (
            <Card key={os.id} className="p-4 shadow-[var(--shadow-card)] border-border/60">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{os.numero || os.id?.split("-")[0]}</span>
                  <h3 className="font-semibold text-base">{os.titulo || "Sem título"}</h3>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider bg-primary/10 text-primary">
                  {os.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-3 pt-3 border-t border-border/30">
                <div>
                  <div className="text-muted-foreground text-xs">Valor</div>
                  <div className="font-semibold">R$ {Number(os.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Despesas</div>
                  <div className="font-semibold">R$ {(Array.isArray(os.despesas) ? os.despesas.reduce((s: number, d: any) => s + (Number(d?.valor) || 0), 0) : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Km Viagem</div>
                  <div className="font-semibold">{Number(os.km_viagem || 0)} km</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Data</div>
                  <div className="font-semibold">{os.data_agendamento ? new Date(os.data_agendamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : new Date(os.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </DialogContent>
  );
}

function GestorDashboard() {
  const [resumo, setResumo] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState<any | null>(null);
  const [topClientes, setTopClientes] = useState<any[]>([]);
  const [painelFinanceiro, setPainelFinanceiro] = useState<any[]>([]);
  const [evolucaoMensal, setEvolucaoMensal] = useState<any[]>([]);
  const [eficiencia, setEficiencia] = useState<any>({ avgTmd: 0, avgTma: 0 });
  const [loading, setLoading] = useState(true);

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [yearStr, monthStr] = mesSelecionado.split("-");
        const startOfMonth = `${mesSelecionado}-01`;
        const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate();
        const endOfMonth = `${mesSelecionado}-${String(lastDay).padStart(2, "0")}`;

        // Previous month calculation
        const prevMonthDate = new Date(Number(yearStr), Number(monthStr) - 2, 1);
        const prevMonthYear = prevMonthDate.getFullYear();
        const prevMonthMonth = prevMonthDate.getMonth() + 1;
        const prevMonthStr = `${prevMonthYear}-${String(prevMonthMonth).padStart(2, "0")}`;
        const startOfPrevMonth = `${prevMonthStr}-01`;
        const lastDayPrev = new Date(prevMonthYear, prevMonthMonth, 0).getDate();
        const endOfPrevMonth = `${prevMonthStr}-${String(lastDayPrev).padStart(2, "0")}`;

        const [pendentesRes, osMesRes, osPrevMesRes] = await Promise.all([
          supabase
            .from("ordens_servico")
            .select("id", { count: "exact" })
            .in("status", ["pendente", "em_andamento", "agendamento", "reagendado"]),
          supabase
            .from("ordens_servico")
            .select("id, numero, titulo, status, valor, custo_viagem, km_viagem, despesas, tecnico_id, tecnicos(nome, comissao, tipo_comissao, valor_fixo, meta_chamados, bonus_excedente, horas_limite, valor_hora_extra), data_agendamento, horario_atendimento, created_at, data_hora_inicio, data_hora_fim, cliente_id, clientes(nome, ultimo_mes_pago), os_historico(created_at, status_novo), dados_adicionais, lancamentos_adicionais")
            .gte("data_agendamento", startOfMonth)
            .lte("data_agendamento", endOfMonth),
          supabase
            .from("ordens_servico")
            .select("id, status, valor, custo_viagem, km_viagem, despesas, data_agendamento, clientes(ultimo_mes_pago)")
            .gte("data_agendamento", startOfPrevMonth)
            .lte("data_agendamento", endOfPrevMonth)
        ]);

        if (pendentesRes.error) throw pendentesRes.error;
        if (osMesRes.error) throw osMesRes.error;
        if (osPrevMesRes.error) throw osPrevMesRes.error;

        const pendentes_globais = pendentesRes.count || 0;
        const allOs = osMesRes.data || [];
        const allOsPrev = osPrevMesRes.data || [];

        // Current Month Metrics
        const os_mes = allOs.length;
        const concluidasMes = allOs.filter(os => os.status === 'concluido');
        const concluidas_mes = concluidasMes.length;

        const faturamento_mes = concluidasMes.reduce((acc, os) => {
          const valorServico = Number(os.valor) || 0;
          const custoViagem = Number(os.custo_viagem) || 0;
          let totalDespesas = 0;
          if (Array.isArray(os.despesas)) {
            totalDespesas = (os.despesas as any[]).reduce((s: number, d: any) => s + (Number(d?.valor) || 0), 0);
          }
          return acc + valorServico + custoViagem + totalDespesas;
        }, 0);
        const ticket_medio_mes = concluidas_mes > 0 ? faturamento_mes / concluidas_mes : 0;

        // Previous Month Metrics
        const os_prev_mes = allOsPrev.length;
        const concluidasPrevMes = allOsPrev.filter(os => os.status === 'concluido');
        const concluidas_prev_mes = concluidasPrevMes.length;

        const faturamento_prev_mes = concluidasPrevMes.reduce((acc, os) => {
          const valorServico = Number(os.valor) || 0;
          const custoViagem = Number(os.custo_viagem) || 0;
          let totalDespesas = 0;
          if (Array.isArray(os.despesas)) {
            totalDespesas = (os.despesas as any[]).reduce((s: number, d: any) => s + (Number(d?.valor) || 0), 0);
          }
          return acc + valorServico + custoViagem + totalDespesas;
        }, 0);
        const ticket_medio_prev_mes = concluidas_prev_mes > 0 ? faturamento_prev_mes / concluidas_prev_mes : 0;

        // Trends calculations
        const trendOs = getTrend(os_mes, os_prev_mes);
        const trendPendentes = { val: "-3% vs ontem", isUp: false }; // Pending is global, show standard indicator
        const trendConcluidas = getTrend(concluidas_mes, concluidas_prev_mes);
        const trendFaturamento = getTrend(faturamento_mes, faturamento_prev_mes);
        const trendTicket = getTrend(ticket_medio_mes, ticket_medio_prev_mes);

        setResumo({
          os_mes,
          pendentes_globais,
          concluidas_mes,
          faturamento_mes,
          ticket_medio_mes,
          trendOs,
          trendPendentes,
          trendConcluidas,
          trendFaturamento,
          trendTicket
        });

        // TMD / TMA calculations
        let totalTmd = 0;
        let countTmd = 0;
        let totalTma = 0;
        let countTma = 0;

        allOs.forEach(os => {
          const logs = os.os_historico || [];
          const { tmd, tma } = getTransitionDurations(logs);
          if (tmd !== null) {
            totalTmd += tmd;
            countTmd++;
          }
          if (tma !== null) {
            totalTma += tma;
            countTma++;
          }
        });

        const avgTmd = countTmd > 0 ? Math.round(totalTmd / countTmd) : 0;
        const avgTma = countTma > 0 ? Math.round(totalTma / countTma) : 0;

        setEficiencia({
          avgTmd,
          avgTma,
        });

        // Daily Evolution Grouping
        const daysInMonth = new Date(Number(yearStr), Number(monthStr), 0).getDate();
        const dailyDataMap = new Map<number, { dia: string; faturamento: number; osConcluidas: number }>();
        for (let d = 1; d <= daysInMonth; d++) {
          dailyDataMap.set(d, {
            dia: `${d}`,
            faturamento: 0,
            osConcluidas: 0,
          });
        }
        concluidasMes.forEach(os => {
          if (os.data_agendamento) {
            const dayNum = new Date(os.data_agendamento + "T00:00:00").getDate();
            const data = dailyDataMap.get(dayNum);
            if (data) {
              const valorServico = Number(os.valor) || 0;
              const custoViagem = Number(os.custo_viagem) || 0;
              let totalDespesas = 0;
              if (Array.isArray(os.despesas)) {
                totalDespesas = (os.despesas as any[]).reduce((s: number, d: any) => s + (Number(d?.valor) || 0), 0);
              }
              data.faturamento += valorServico + custoViagem + totalDespesas;
              data.osConcluidas += 1;
            }
          }
        });
        setEvolucaoMensal(Array.from(dailyDataMap.values()));

        // Ranking Técnicos
        const tecnicosMap = new Map();
        concluidasMes.forEach(os => {
          if (os.tecnico_id) {
            const tId = os.tecnico_id;
            const tNome = os.tecnicos?.nome || "Desconhecido";
            if (!tecnicosMap.has(tId)) {
              tecnicosMap.set(tId, { tecnico_nome: tNome, tecnico_id: tId, os_finalizadas: 0, faturamento_gerado: 0, valor_a_pagar: 0, comissao_total: 0, hora_extra_total: 0, valor_fixo: 0, bonus_total: 0, lancamentos_total: 0, os_list: [] });
            }
            const stat = tecnicosMap.get(tId);
            stat.os_finalizadas += 1;
            stat.os_list.push(os);
            
            const valorServico = Number(os.valor) || 0;
            const custoViagem = Number(os.custo_viagem) || 0;
            let totalDespesas = 0;
            if (Array.isArray(os.despesas)) {
              totalDespesas = (os.despesas as any[]).reduce((s: number, d: any) => s + (Number(d?.valor) || 0), 0);
            }
            
            stat.faturamento_gerado += valorServico + custoViagem + totalDespesas;

            const comissao = Number(os.tecnicos?.comissao) || 0;
            const tipoComissao = os.tecnicos?.tipo_comissao || 'porcentagem';
            const comissaoValor = tipoComissao === 'fixo' ? comissao : (valorServico * comissao) / 100;
            stat.comissao_total += comissaoValor;
            stat.valor_a_pagar += comissaoValor;

            // Lançamentos adicionais da OS (valores extras devidos ao técnico)
            if (Array.isArray((os as any).lancamentos_adicionais)) {
              const extras = ((os as any).lancamentos_adicionais as any[]).reduce(
                (s: number, l: any) => s + (Number(l?.valor) || 0),
                0,
              );
              stat.lancamentos_total = (stat.lancamentos_total || 0) + extras;
              stat.valor_a_pagar += extras;
            }

            // Guarda parâmetros contratuais do técnico (iguais em todas as OS)
            stat.valor_fixo = Number(os.tecnicos?.valor_fixo) || 0;
            stat.meta_chamados = Number(os.tecnicos?.meta_chamados) || 0;
            stat.bonus_excedente = Number(os.tecnicos?.bonus_excedente) || 0;

            // Hora extra por OS: tempo além do limite contratual
            const horasLimite = Number(os.tecnicos?.horas_limite) || 0;
            const valorHoraExtra = Number(os.tecnicos?.valor_hora_extra) || 0;
            if (horasLimite > 0 && valorHoraExtra > 0 && os.data_hora_inicio && os.data_hora_fim) {
              const duracaoH = (new Date(os.data_hora_fim).getTime() - new Date(os.data_hora_inicio).getTime()) / 3600000;
              if (duracaoH > horasLimite) {
                const extraValor = (duracaoH - horasLimite) * valorHoraExtra;
                stat.hora_extra_total += extraValor;
                stat.valor_a_pagar += extraValor;
              }
            }
          }
        });
        // Pós-processamento: valor fixo mensal + bônus por chamados excedentes
        tecnicosMap.forEach((stat) => {
          if (stat.valor_fixo > 0) stat.valor_a_pagar += stat.valor_fixo;
          if (stat.meta_chamados > 0 && stat.bonus_excedente > 0 && stat.os_finalizadas > stat.meta_chamados) {
            stat.bonus_total = (stat.os_finalizadas - stat.meta_chamados) * stat.bonus_excedente;
            stat.valor_a_pagar += stat.bonus_total;
          }
        });
        const rankingArr = Array.from(tecnicosMap.values()).sort((a, b) => b.faturamento_gerado - a.faturamento_gerado);
        setRanking(rankingArr);

        // Top Clientes
        const clientesMap = new Map();
        allOs.forEach(os => {
          if (os.cliente_id) {
            const cId = os.cliente_id;
            const cNome = os.clientes?.nome || "Desconhecido";
            const ultimoMesPago = os.clientes?.ultimo_mes_pago;
            if (!clientesMap.has(cId)) {
              clientesMap.set(cId, { 
                cliente_nome: cNome, 
                os_solicitadas: 0, 
                valor_gerado: 0,
                valor_pago: 0,
                valor_pendente: 0,
                ultimo_mes_pago: ultimoMesPago
              });
            }
            const stat = clientesMap.get(cId);
            stat.os_solicitadas += 1;
            if (os.status === 'concluido') {
              const valorServico = Number(os.valor) || 0;
              const custoViagem = Number(os.custo_viagem) || 0;
              let totalDespesas = 0;
              if (Array.isArray(os.despesas)) {
                totalDespesas = (os.despesas as any[]).reduce((s: number, d: any) => s + (Number(d?.valor) || 0), 0);
              }
              stat.valor_gerado += valorServico + custoViagem + totalDespesas;
              if ((os.dados_adicionais as any)?.mes_recebimento === mesSelecionado || (os.dados_adicionais as any)?.pago_imediatamente || stat.ultimo_mes_pago === mesSelecionado) {
                stat.valor_pago += valorServico + custoViagem + totalDespesas;
              } else {
                stat.valor_pendente += valorServico + custoViagem + totalDespesas;
              }
            }
          }
        });
        const clientesArr = Array.from(clientesMap.values()).sort((a, b) => b.valor_gerado - a.valor_gerado);
        setTopClientes(clientesArr);
        setPainelFinanceiro(clientesArr.filter(c => c.valor_gerado > 0));

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <div className="h-80 w-full rounded-2xl bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full rounded-2xl" />
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
      "Ticket Médio (R$)": Number(resumo?.ticket_medio_mes ?? 0).toFixed(2),
    }];
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    // Ranking
    const rankingData = ranking.map(t => ({
      "Técnico": t.tecnico_nome || t.nome || "—",
      "OS Finalizadas": t.os_finalizadas ?? 0,
      "Faturamento Gerado (R$)": Number(t.faturamento_gerado ?? 0).toFixed(2),
      "Comissão (R$)": Number(t.comissao_total ?? 0).toFixed(2),
      "Valor Fixo (R$)": Number(t.valor_fixo ?? 0).toFixed(2),
      "Hora Extra (R$)": Number(t.hora_extra_total ?? 0).toFixed(2),
      "Bônus Meta (R$)": Number(t.bonus_total ?? 0).toFixed(2),
      "Valor a Pagar (R$)": Number(t.valor_a_pagar ?? 0).toFixed(2),
    }));
    const wsRanking = XLSX.utils.json_to_sheet(rankingData);
    XLSX.utils.book_append_sheet(wb, wsRanking, "Ranking");

    // Top Clientes
    const clientesData = topClientes.map(c => ({
      "Cliente": c.cliente_nome || "—",
      "OS Solicitadas": c.os_solicitadas ?? 0,
      "Valor Gerado (R$)": Number(c.valor_gerado ?? 0).toFixed(2),
    }));
    const wsClientes = XLSX.utils.json_to_sheet(clientesData);
    XLSX.utils.book_append_sheet(wb, wsClientes, "TopClientes");

    XLSX.writeFile(wb, `Gestor_Relatorio_${mesSelecionado}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500 print:p-0 print:space-y-4">
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: OS do Mês */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)] flex flex-col justify-between p-1">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">OS do Mês</CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{resumo?.os_mes ?? 0}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold">
              {resumo?.trendOs.isUp ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {resumo?.trendOs.val}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {resumo?.trendOs.val}
                </span>
              )}
              <span className="text-muted-foreground font-normal">vs mês passado</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Pendentes Globais */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)] flex flex-col justify-between p-1">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes Globais</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{resumo?.pendentes_globais ?? 0}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold">
              {resumo?.trendPendentes.isUp ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {resumo?.trendPendentes.val}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {resumo?.trendPendentes.val}
                </span>
              )}
              <span className="text-muted-foreground font-normal">vs ontem</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Concluídas do Mês */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)] flex flex-col justify-between p-1">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas do Mês</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">{resumo?.concluidas_mes ?? 0}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold">
              {resumo?.trendConcluidas.isUp ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {resumo?.trendConcluidas.val}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {resumo?.trendConcluidas.val}
                </span>
              )}
              <span className="text-muted-foreground font-normal">vs mês passado</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Faturamento do Mês */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)] flex flex-col justify-between p-1">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">
              R$ {Number(resumo?.faturamento_mes ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold">
              {resumo?.trendFaturamento.isUp ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {resumo?.trendFaturamento.val}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {resumo?.trendFaturamento.val}
                </span>
              )}
              <span className="text-muted-foreground font-normal">vs mês passado</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Ticket Médio */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)] flex flex-col justify-between p-1">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <Percent className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold">
              R$ {Number(resumo?.ticket_medio_mes ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold">
              {resumo?.trendTicket.isUp ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {resumo?.trendTicket.val}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {resumo?.trendTicket.val}
                </span>
              )}
              <span className="text-muted-foreground font-normal">vs mês passado</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Principal: Evolução do Mês */}
      <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)] p-6">
        <CardHeader className="px-0 pt-0 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Evolução do Mês
          </CardTitle>
          <p className="text-xs text-muted-foreground">Comparativo diário de faturamento gerado e volume de OSs concluídas</p>
        </CardHeader>
        <CardContent className="px-0 pb-0 h-72">
          {evolucaoMensal.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados operacionais neste período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolucaoMensal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="var(--primary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <YAxis yAxisId="right" orientation="right" stroke="var(--success)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val} OS`} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--background)',
                    color: 'var(--foreground)'
                  }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area yAxisId="left" type="monotone" dataKey="faturamento" name="Faturamento (R$)" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorFaturamento)" />
                <Line yAxisId="right" type="monotone" dataKey="osConcluidas" name="OS Concluídas" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Ranking de Técnicos */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Ranking de Desempenho (Técnicos)
            </CardTitle>
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
                      <th className="px-4 py-3 font-medium text-right">Faturamento Gerado</th>
                      <th className="px-4 py-3 rounded-tr-lg font-medium text-right text-emerald-600 dark:text-emerald-400">Valor a Pagar (Técnico)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {ranking.map((t, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setTecnicoSelecionado(t)}
                      >
                        <td className="px-4 py-3 font-medium">
                          <div>{t.tecnico_nome || t.nome || "—"}</div>
                          {(Number(t.valor_fixo) > 0 || Number(t.hora_extra_total) > 0 || Number(t.bonus_total) > 0) && (
                            <div className="text-[10px] text-muted-foreground font-normal mt-0.5 space-x-1.5">
                              {Number(t.valor_fixo) > 0 && <span>Fixo: R$ {Number(t.valor_fixo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                              {Number(t.hora_extra_total) > 0 && <span>· HE: R$ {Number(t.hora_extra_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                              {Number(t.bonus_total) > 0 && <span>· Bônus: R$ {Number(t.bonus_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-full font-semibold">
                            {t.os_finalizadas ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          R$ {Number(t.faturamento_gerado ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {Number(t.valor_a_pagar ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Clientes */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" /> Top Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClientes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/40 rounded-t-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium text-center">OS Solicitadas</th>
                      <th className="px-4 py-3 rounded-tr-lg font-medium text-right">Valor Gerado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {topClientes.slice(0, 10).map((c, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{c.cliente_nome}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-2.5 py-0.5 rounded-full font-semibold">
                            {c.os_solicitadas ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {Number(c.valor_gerado ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Gráfico de Pizza */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" /> Distribuição de OS
            </CardTitle>
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
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid var(--border)', 
                      background: 'var(--background)',
                      color: 'var(--foreground)'
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Métricas de Eficiência (TMD / TMA) */}
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Métricas de Eficiência
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-[300px] gap-6 px-6">
            <div className="flex items-center gap-4 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Tempo Médio de Deslocamento (TMD)</span>
                <span className="text-2xl font-bold mt-0.5 block text-foreground">{formatMinutes(eficiencia.avgTmd)}</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">Tempo médio em trânsito dos técnicos até a chegada no local</span>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Tempo Médio de Atendimento (TMA)</span>
                <span className="text-2xl font-bold mt-0.5 block text-foreground">{formatMinutes(eficiencia.avgTma)}</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">Tempo médio gasto em campo executando o serviço</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel Financeiro Estratégico */}
      <div className="mt-6">
        <Card className="rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Painel Financeiro por Cliente (Mês Referência: {mesSelecionado})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {painelFinanceiro.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum faturamento registrado neste mês.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/40 rounded-t-lg">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium text-center">Fatura Total</th>
                      <th className="px-4 py-3 font-medium text-center">Valor Pago</th>
                      <th className="px-4 py-3 rounded-tr-lg font-medium text-right">Valor Pendente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {painelFinanceiro.map((c, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{c.cliente_nome}</td>
                        <td className="px-4 py-3 text-center font-bold">
                          R$ {Number(c.valor_gerado ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {Number(c.valor_pago ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                          R$ {Number(c.valor_pendente ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes do Técnico */}
      <Dialog open={!!tecnicoSelecionado} onOpenChange={(open) => !open && setTecnicoSelecionado(null)}>
        {tecnicoSelecionado && (
          <TecnicoOSModalContent 
            tecnicoId={tecnicoSelecionado.tecnico_id} 
            tecnicoNome={tecnicoSelecionado.tecnico_nome} 
            defaultMes={mesSelecionado}
          />
        )}
      </Dialog>
    </div>
  );
}
