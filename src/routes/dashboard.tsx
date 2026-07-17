import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { useStore, statusColor, OSStatus, OS } from "@/lib/useData";
import { MesAnoFilter } from "@/components/MesAnoFilter";
import { EditOSDialog } from "@/routes/os";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { logActivity } from "@/lib/logger";
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
  FileSpreadsheet,
  Circle,
  Loader2,
} from "lucide-react";
import { ExportFaturamentoModal } from "@/components/ExportFaturamentoModal";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedRoute allowedRoles={['gestor', 'analista', 'admin', 'superadmin']}>
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

function getLimitTimeBadge(
  dataAgendamento: string,
  horarioAtendimento?: string | null,
): string | null {
  if (!horarioAtendimento) return null;

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const hojeStr = getLocalDateString(new Date());
  if (dataAgendamento !== hojeStr) return null;

  try {
    const [h, m] = horarioAtendimento.split(":").map(Number);
    const agendado = new Date();
    agendado.setHours(h, m, 0, 0);

    const agora = new Date();
    const diffMs = agendado.getTime() - agora.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 0 && diffHours <= 2) {
      const minutesLeft = Math.round(diffMs / (1000 * 60));
      return `Expira em ${minutesLeft} min!`;
    } else if (diffHours <= 0 && diffHours >= -1) {
      return `Em andamento/Atrasado!`;
    }
  } catch (e) {
    console.error("Erro ao calcular tempo limite", e);
  }
  return null;
}

function PriorityAlerts({ ordens, isLoading, onEdit, logs }: { ordens: any[]; isLoading: boolean; onEdit: (os: any) => void; logs?: any[] }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const hojeStr = getLocalDateString(new Date());

  const atrasadas = (Array.isArray(ordens) ? ordens : []).filter((o) => {
    if (!o.data_agendamento) return false;
    return o.data_agendamento < hojeStr;
  });

  const hoje = (Array.isArray(ordens) ? ordens : []).filter((o) => {
    if (!o.data_agendamento) return false;
    return o.data_agendamento === hojeStr;
  });

  if (atrasadas.length === 0 && hoje.length === 0) return null;

  const hasBoth = atrasadas.length > 0 && hoje.length > 0;

  return (
    <div className="space-y-3 mb-6">
      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
        Painel de Controle: Alertas & Prioridades
      </div>
      <div className={`grid grid-cols-1 gap-4 ${hasBoth ? "md:grid-cols-2" : ""}`}>
        {/* Alertas de Atraso */}
        {atrasadas.length > 0 && (
          <div className="rounded-3xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-4 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(239,68,68,0.08)]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="font-bold text-sm text-red-900 dark:text-red-200">
                  {atrasadas.length} OS Atrasada{atrasadas.length > 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                Crítico
              </span>
            </div>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {(Array.isArray(atrasadas) ? atrasadas : []).map((o) => {
                const isConcluidoReal = o.status === "Concluído" || o.status === "concluido";
                const isConcluidoTecnico = o.status === "Concluído Técnico" || o.status === "concluido_tecnico";
                const isAnyConcluido = isConcluidoReal || isConcluidoTecnico;
                return (
                  <div
                    key={o.id}
                    onClick={() => onEdit(o)}
                    className="text-xs bg-card p-2.5 rounded-2xl border border-border/50 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-foreground">{o.titulo}</p>
                      <p className="text-muted-foreground text-[10px] truncate">
                        {o.numero} • Cliente: {o.clientes?.nome || "Não informado"}
                      </p>
                      <p className="text-muted-foreground text-[10px] truncate">
                        Téc: {o.tecnico?.nome || "Não atribuído"}
                      </p>
                      {(o.endereco_servico || o.clientes?.endereco_completo) && (
                        <p className="text-muted-foreground text-[10px] truncate">
                          📍 {o.endereco_servico || o.clientes?.endereco_completo}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      {isAnyConcluido ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${statusColor[o.status] || "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900"}`}>
                            <CheckCircle2 className="w-3 h-3" /> {o.status}
                          </span>
                          {isConcluidoTecnico && (
                            <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Revisar p/ Finalizar
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${statusColor[o.status] || "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>
                            {o.status}
                          </span>
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-900">
                            {o.data_agendamento
                              ? new Date(o.data_agendamento + "T00:00:00").toLocaleDateString("pt-BR")
                              : "—"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Prioridades do Dia */}
        {hoje.length > 0 && (
          <div className="rounded-3xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(245,158,11,0.08)]">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-bold text-sm text-amber-900 dark:text-amber-200">
                  {hoje.length} OS Prioridade do Dia
                </span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Hoje
              </span>
            </div>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {(Array.isArray(hoje) ? hoje : []).map((o) => {
                const limitTimeText = getLimitTimeBadge(o.data_agendamento, o.horario_atendimento);
                const isConcluidoReal = o.status === "Concluído" || o.status === "concluido";
                const isConcluidoTecnico = o.status === "Concluído Técnico" || o.status === "concluido_tecnico";
                const isAnyConcluido = isConcluidoReal || isConcluidoTecnico;
                return (
                  <div
                    key={o.id}
                    onClick={() => onEdit(o)}
                    className="text-xs bg-card p-2.5 rounded-2xl border border-border/50 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-foreground">{o.titulo}</p>
                      <p className="text-muted-foreground text-[10px] truncate">
                        {o.numero} • Cliente: {o.clientes?.nome || "Não informado"}
                      </p>
                      <p className="text-muted-foreground text-[10px] truncate">
                        Téc: {o.tecnico?.nome || "Não atribuído"}
                      </p>
                      {(o.endereco_servico || o.clientes?.endereco_completo) && (
                        <p className="text-muted-foreground text-[10px] truncate">
                          📍 {o.endereco_servico || o.clientes?.endereco_completo}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      {isAnyConcluido ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${statusColor[o.status] || "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900"}`}>
                            <CheckCircle2 className="w-3 h-3" /> {o.status}
                          </span>
                          {isConcluidoTecnico && (
                            <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Revisar p/ Finalizar
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${statusColor[o.status] || "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>
                            {o.status}
                          </span>
                          {limitTimeText && (
                            <span className="text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                              {limitTimeText}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900">
                            {o.horario_atendimento || "Sem hora"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EnvioPlanilhaAlerts({ clientes }: { clientes: any[] }) {
  if (!clientes || clientes.length === 0) return null;

  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const proximosEnvios = clientes.filter(c => {
    if (!c.dia_envio_planilha) return false;
    
    let proxEnvio = new Date(hoje.getFullYear(), hoje.getMonth(), c.dia_envio_planilha, 0,0,0,0);
    
    if (proxEnvio < hoje) {
      proxEnvio = new Date(hoje.getFullYear(), hoje.getMonth() + 1, c.dia_envio_planilha, 0,0,0,0);
    }

    const diffTime = proxEnvio.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 5;
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<{ id: string, nome: string } | null>(null);

  if (proximosEnvios.length === 0) return null;

  const handleOpenExport = (clienteId: string, clienteNome: string) => {
    setSelectedCliente({ id: clienteId, nome: clienteNome });
    setIsExportModalOpen(true);
  };

  return (
    <div className="space-y-3 mb-6">
      <div className="rounded-3xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 p-4 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(59,130,246,0.08)]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-sm text-blue-900 dark:text-blue-200">
              {proximosEnvios.length} Envio{proximosEnvios.length > 1 ? "s" : ""} de Planilha Próximo{proximosEnvios.length > 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            Até 5 dias
          </span>
        </div>
        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
          {proximosEnvios.map((c) => {
            let proxEnvio = new Date(hoje.getFullYear(), hoje.getMonth(), c.dia_envio_planilha, 0,0,0,0);
            if (proxEnvio < hoje) {
              proxEnvio = new Date(hoje.getFullYear(), hoje.getMonth() + 1, c.dia_envio_planilha, 0,0,0,0);
            }
            const diffTime = proxEnvio.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return (
              <div
                key={c.id}
                onClick={() => handleOpenExport(c.id, c.nome)}
                className="text-xs bg-card p-2.5 rounded-2xl border border-border/50 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-bold truncate text-foreground">{c.nome}</p>
                  <p className="text-muted-foreground text-[10px] truncate">
                    Enviar dia {c.dia_envio_planilha}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${diffDays === 0 ? 'text-red-600 border-red-200 bg-red-50' : 'text-blue-600 border-blue-200 bg-blue-50'}`}>
                    {diffDays === 0 ? "É hoje!" : `Em ${diffDays} dia${diffDays > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ExportFaturamentoModal 
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        clienteId={selectedCliente?.id || null}
        clienteNome={selectedCliente?.nome || ""}
      />
    </div>
  );
}

function PagamentoAlerts({ clientes }: { clientes: any[] }) {
  if (!clientes || clientes.length === 0) return null;

  const { updateCliente } = useStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  // Mês anterior (mês do faturamento referente ao pagamento que vence este mês)
  const dataRef = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const billingMonthForCurrentPayment = `${dataRef.getFullYear()}-${String(dataRef.getMonth() + 1).padStart(2, "0")}`;

  const proximosPagamentos = clientes.filter(c => {
    if (!c.dias_pagamento) return false;
    
    const isPaid = c.ultimo_mes_pago === billingMonthForCurrentPayment;

    const diasStr = typeof c.dias_pagamento === 'string' ? c.dias_pagamento : String(c.dias_pagamento);
    const diasArray = diasStr.split(",").map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d));
    if (diasArray.length === 0) return false;
    
    // Find the closest upcoming payment day
    let closestDiffDays = Infinity;
    
    for (const dia of diasArray) {
      const proxPagamento = new Date(hoje.getFullYear(), hoje.getMonth(), dia, 0,0,0,0);
      const diffTime = proxPagamento.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (Math.abs(diffDays) < Math.abs(closestDiffDays)) {
        closestDiffDays = diffDays;
      }
    }
    
    const diffDays = closestDiffDays;
    
    // Se já pagou, mostra por até 5 dias antes/depois do vencimento (limpa a lista para os antigos)
    if (isPaid) {
      return diffDays >= -2 && diffDays <= 5;
    }
    // Se não pagou, mostra se vence em até 5 dias ou se já estiver atrasado (diffDays < 0)
    return diffDays <= 5;
  });

  const handleTogglePaid = async (c: any, isPaid: boolean) => {
    try {
      setLoadingId(c.id);
      await updateCliente(c.id, {
        ultimo_mes_pago: isPaid ? null : billingMonthForCurrentPayment
      });
      toast.success(isPaid ? "Pagamento marcado como pendente!" : "Pagamento marcado como realizado!");
    } catch (err: any) {
      toast.error("Erro ao atualizar pagamento: " + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  if (proximosPagamentos.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <div className="rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-4 flex flex-col justify-between shadow-[0_4px_20px_-4px_rgba(16,185,129,0.08)]">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
              {proximosPagamentos.length} Pagamento{proximosPagamentos.length > 1 ? "s" : ""} Próximo{proximosPagamentos.length > 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            A vencer / Em atraso
          </span>
        </div>
        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
          {proximosPagamentos.map((c) => {
            const isPaid = c.ultimo_mes_pago === billingMonthForCurrentPayment;
            
            const diasStr = typeof c.dias_pagamento === 'string' ? c.dias_pagamento : String(c.dias_pagamento);
            const diasArray = diasStr.split(",").map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d));
            let closestDiffDays = Infinity;
            let currentDia = diasArray[0] || 10;
            
            for (const dia of diasArray) {
              const proxPagamento = new Date(hoje.getFullYear(), hoje.getMonth(), dia, 0,0,0,0);
              const diffTime = proxPagamento.getTime() - hoje.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (Math.abs(diffDays) < Math.abs(closestDiffDays)) {
                closestDiffDays = diffDays;
                currentDia = dia;
              }
            }
            const diffDays = closestDiffDays;

            let statusText = "";
            let badgeClass = "";
            if (isPaid) {
              statusText = "Pago";
              badgeClass = "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
            } else if (diffDays < 0) {
              statusText = `Atrasado (${Math.abs(diffDays)}d)`;
              badgeClass = "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";
            } else if (diffDays === 0) {
              statusText = "Vence hoje!";
              badgeClass = "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
            } else {
              statusText = `Vence em ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
              badgeClass = "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50";
            }

            return (
              <div
                key={c.id}
                className="text-xs bg-card p-2.5 rounded-2xl border border-border/50 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate text-foreground">{c.nome}</p>
                  <p className="text-muted-foreground text-[10px] truncate">
                    Vence dia {currentDia} (Faturamento: {billingMonthForCurrentPayment.split("-")[1]}/{billingMonthForCurrentPayment.split("-")[0]})
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${badgeClass}`}>
                    {statusText}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 rounded-lg shrink-0 ${isPaid ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : 'text-muted-foreground hover:text-foreground'}`}
                    disabled={loadingId === c.id}
                    onClick={() => handleTogglePaid(c, isPaid)}
                  >
                    {loadingId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isPaid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PendingAlertsCard({
  ordens,
  isLoading,
  onEdit,
}: {
  ordens: any[];
  isLoading: boolean;
  onEdit: (os: any) => void;
}) {
  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-2xl mb-6" />;
  }

  if (ordens.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600 flex items-center gap-1.5 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-ping"></span>
        Gestão de Pendências (Requer Atenção)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Array.isArray(ordens) ? ordens : []).map((o) => (
          <div
            key={o.id}
            onClick={() => onEdit(o)}
            className="cursor-pointer rounded-3xl bg-amber-50/70 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/80 p-4 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)] flex flex-col justify-between hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-amber-600 tracking-wider">
                  {o.numero}
                </span>
                <h4 className="font-bold text-sm text-foreground truncate mt-0.5">{o.titulo}</h4>
                <p className="text-muted-foreground text-[10px]">
                  Cliente: {o.clientes?.nome || "Não informado"}
                </p>
              </div>
            </div>
            <div className="mt-2 bg-amber-100 dark:bg-amber-500/20 p-2.5 rounded-xl border border-amber-200 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <span className="font-bold shrink-0 text-amber-700 dark:text-amber-400">
                Pendente:
              </span>
              <span className="italic leading-normal">{o.pendencias_detalhes}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const { profile } = useAuth();
  
  if (profile?.role === "tecnico") {
    return <Navigate to="/tecnico/dashboard" />;
  }

  if (profile?.role === "analista") {
    return <Navigate to="/analista-dashboard" />;
  }
  const { allClientes: clientes, allTecnicos: tecnicos, loadingOS, loadingClientes, osMonth, osYear, os, updateOS } =
    useStore();
  const [editingOS, setEditingOS] = useState<OS | null>(null);
  const [dialogMode, setDialogMode] = useState<"edit" | "view">("edit");

  // Gera dataInicio/dataFim com base no filtro de mês/ano
  const hasMonthFilter = osMonth > 0 && osYear > 0;
  const dataInicio = hasMonthFilter ? `${osYear}-${String(osMonth).padStart(2, "0")}-01` : null;
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
      receitaBruta: number;
      custoTotal: number;
      resultadoLiquido: number;
      comissaoTotal: number;
      resultadoEmpresa: number;
    }> => {
      const eid = profile?.empresa_id;
      if (!eid)
        return {
          faturamentoPrevisto: 0,
          receitaMes: 0,
          pendenciasPagamento: 0,
          abertas: 0,
          concluidas: 0,
          emCampo: 0,
          receitaBruta: 0,
          custoTotal: 0,
          resultadoLiquido: 0,
          comissaoTotal: 0,
          resultadoEmpresa: 0,
        };

      // O faturamento do mês selecionado (M) é referente às OSs concluídas do mês anterior (M-1)
      let serviceMonth = osMonth - 1;
      let serviceYear = osYear;
      if (serviceMonth < 1) {
        serviceMonth = 12;
        serviceYear -= 1;
      }
      
      const lastDayOfServiceMonth = new Date(serviceYear, serviceMonth, 0).getDate();
      const serviceInicio = `${serviceYear}-${String(serviceMonth).padStart(2, "0")}-01`;
      const serviceFim = `${serviceYear}-${String(serviceMonth).padStart(2, "0")}-${String(lastDayOfServiceMonth).padStart(2, "0")}`;

      // Busca todas as OS da empresa (sem paginação, pois é para KPIs)
      let query = supabase
        .from("ordens_servico")
        .select("status, valor, km_viagem, custo_viagem, despesas, data_agendamento, tecnico_id, tecnico:tecnicos(comissao, tipo_comissao), cliente:clientes(id, dias_pagamento, ultimo_mes_pago)")
        .eq("empresa_id", eid);

      if (serviceInicio && serviceFim) {
        query = query.gte("data_agendamento", serviceInicio).lte("data_agendamento", serviceFim);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const hoje = new Date();

      const totalFinanceiro = (r: any) => {
        const valorServico = Number(r.valor ?? 0);
        const custoViagem = Number(r.custo_viagem ?? 0);
        const despesas = Array.isArray(r.despesas)
          ? r.despesas.reduce((sum: number, item: any) => sum + Number(item?.valor ?? 0), 0)
          : 0;
        return valorServico + custoViagem + despesas;
      };

      const billingMonthStr = `${serviceYear}-${String(serviceMonth).padStart(2, "0")}`;

      // Faturamento previsto do mês selecionado é o total de OS concluídas do mês anterior
      const faturamentoPrevisto = rows
        .filter((r: any) => r.status === "concluido")
        .reduce((s: number, r: any) => s + totalFinanceiro(r), 0);

      // Receita do mês são os pagamentos recebidos (OSs concluídas do mês anterior que já foram pagas)
      const receitaMes = rows
        .filter((r: any) => {
          if (r.status !== "concluido") return false;
          const c = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente;
          if (!c) return true; // Fallback se não houver cadastro ou dados do cliente
          return c.ultimo_mes_pago === billingMonthStr;
        })
        .reduce((s: number, r: any) => s + totalFinanceiro(r), 0);

      const receitaBruta = rows
        .filter((r: any) => {
          if (r.status !== "concluido") return false;
          const c = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente;
          if (!c) return true;
          return c.ultimo_mes_pago === billingMonthStr;
        })
        .reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);

      const custoTotal = rows
        .filter((r: any) => {
          if (r.status !== "concluido") return false;
          const c = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente;
          if (!c) return true;
          return c.ultimo_mes_pago === billingMonthStr;
        })
        .reduce((s: number, r: any) => {
          const custoViagem = Number(r.custo_viagem ?? 0);
          const despesas = Array.isArray(r.despesas)
            ? r.despesas.reduce((sum: number, item: any) => sum + Number(item?.valor ?? 0), 0)
            : 0;
          return s + custoViagem + despesas;
        }, 0);

      const resultadoLiquido = receitaBruta - custoTotal;

      const comissaoTotal = rows
        .filter((r: any) => {
          if (r.status !== "concluido" || !r.tecnico_id) return false;
          const c = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente;
          if (!c) return true;
          return c.ultimo_mes_pago === billingMonthStr;
        })
        .reduce((s: number, r: any) => {
          const tecnico = Array.isArray(r.tecnico) ? r.tecnico[0] : r.tecnico;
          const comissaoVal = Number(tecnico?.comissao ?? 0);
          const tipoComissao = tecnico?.tipo_comissao ?? "fixo";
          const valorServico = Number(r.valor ?? 0);

          const valorComissao = tipoComissao === "fixo"
            ? comissaoVal
            : (valorServico * comissaoVal) / 100;
          return s + valorComissao;
        }, 0);

      const resultadoEmpresa = resultadoLiquido - comissaoTotal;

      const pendenciasPagamento = (Array.isArray(rows) ? rows : []).filter((r: any) => {
        if (r.status !== "concluido") return false;
        const c = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente;
        if (!c) return false;

        // Se já está pago, não é pendência
        if (c.ultimo_mes_pago === billingMonthStr) return false;

        // Caso contrário, verifica se já passou do dia de vencimento (vence no mês selecionado)
        const diasStr = typeof c.dias_pagamento === 'string' ? c.dias_pagamento : String(c.dias_pagamento);
        const diasArray = diasStr.split(",").map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d));
        const diaPag = diasArray[0] || 10;
        const paymentDueDate = new Date(osYear, osMonth - 1, diaPag, 23, 59, 59, 999);
        const isOverdue = new Date() > paymentDueDate;
        return isOverdue;
      }).length;

      const abertas = (Array.isArray(rows) ? rows : []).filter((r: any) =>
        ["agendamento", "em_andamento", "concluido_tecnico", "pendencia"].includes(r.status),
      ).length;

      const concluidas = (Array.isArray(rows) ? rows : []).filter(
        (r: any) => r.status === "concluido",
      ).length;

      const emCampo = (Array.isArray(rows) ? rows : []).filter(
        (r: any) => r.status === "em_andamento",
      ).length;

      return {
        faturamentoPrevisto,
        receitaMes,
        pendenciasPagamento,
        abertas,
        concluidas,
        emCampo,
        receitaBruta,
        custoTotal,
        resultadoLiquido,
        comissaoTotal,
        resultadoEmpresa,
      };
    },
  });

  const kpis = kpisFinanceirosQ.data ?? {
    faturamentoPrevisto: 0,
    receitaMes: 0,
    pendenciasPagamento: 0,
    abertas: 0,
    concluidas: 0,
    emCampo: 0,
    receitaBruta: 0,
    custoTotal: 0,
    resultadoLiquido: 0,
    comissaoTotal: 0,
    resultadoEmpresa: 0,
  };

  // ============================================================
  // Atividades Recentes (Logs)
  // ============================================================
  const recentLogsQ = useQuery({
    queryKey: ["logs_administrativos_recentes", profile?.empresa_id],
    enabled: !!profile?.empresa_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs_administrativos")
        .select("id, tipo, descricao, created_at, usuario_nome")
        .eq("empresa_id", profile?.empresa_id ?? "")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []).map((log: any) => ({
        id: log.id,
        created_at: log.created_at,
        tipo: log.tipo,
        descricao: log.descricao,
        usuario_nome: log.usuario_nome || "Usuário",
      }));
    },
  });

  // Alertas de OS (Atrasadas e Prioridades)
  const alertasOSQ = useQuery({
    queryKey: ["alertas_os", profile?.empresa_id],
    enabled: !!profile && profile.role !== "tecnico",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, clientes(nome, endereco_completo), tecnico:tecnicos(id, nome, perfil, telefone, ativo)")
        .neq("status", "concluido")
        .neq("status", "cancelado")
        .eq("empresa_id", profile?.empresa_id || "");

      if (error) throw error;

      const parseDespesas = (value: any): Array<{ tipo: string; valor: number }> => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return [];
          }
        }
        return [];
      };

      const dbToUiStatus: Record<string, OSStatus> = {
        agendamento: "Agendamento",
        em_andamento: "Em Andamento",
        em_deslocamento: "Em Deslocamento",
        concluido_tecnico: "Concluído Técnico",
        pendencia: "Pendência",
        concluido: "Concluído",
        cancelado: "Cancelado",
      };

      return (data || []).map((r: any) => ({
        id: r.id,
        numero: r.numero ?? "OS-?",
        clienteId: r.cliente_id,
        tecnicoId: r.tecnico_id ?? "",
        analistaId: r.analista_id ?? "",
        titulo: r.titulo || r.descricao_problema || "",
        descricao_problema: r.descricao_problema ?? "",
        status: dbToUiStatus[r.status] || r.status,
        criadaEm: r.created_at,
        data_agendamento: r.data_agendamento || "",
        horario_atendimento: r.horario_atendimento || "",
        valor: Number(r.valor ?? 0),
        custo_viagem: Number(r.custo_viagem ?? 0),
        km_viagem: Number(r.km_viagem ?? 0),
        despesas: parseDespesas(r.despesas),
        rat: r.rat ? (typeof r.rat === "string" ? JSON.parse(r.rat) : r.rat) : { itens: [], evidencias: [] },
        dados_adicionais: r.dados_adicionais || {},
        clientes: r.clientes,
        tecnico: r.tecnico,
        endereco_servico: r.endereco_servico || "",
        pendencias_detalhes: r.pendencias_detalhes || "",
      })) as any[];
    },
  });

  useEffect(() => {
    if (alertasOSQ.data) {
      const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const hojeStr = getLocalDateString(new Date());
      const proximas = (Array.isArray(alertasOSQ.data) ? alertasOSQ.data : []).filter((o) => {
        if (!o.data_agendamento || !o.horario_atendimento) return false;
        if (o.data_agendamento !== hojeStr) return false;

        try {
          const [h, m] = o.horario_atendimento.split(":").map(Number);
          const agendado = new Date();
          agendado.setHours(h, m, 0, 0);
          const agora = new Date();
          const diffMs = agendado.getTime() - agora.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          return diffHours > 0 && diffHours <= 2;
        } catch {
          return false;
        }
      });

      if (proximas.length > 0) {
        proximas.forEach((o) => {
          toast.warning(
            `Atenção: OS ${o.numero} ("${o.titulo}") está agendada para hoje às ${o.horario_atendimento} (expira em breve!)`,
            {
              duration: 8000,
              id: `vencimento-${o.id}`,
            },
          );
        });
      }
    }
  }, [alertasOSQ.data]);

  // Alertas de Pendências
  const pendenciasOSQ = useQuery({
    queryKey: ["pendencias_os_ativas", profile?.empresa_id],
    enabled: !!profile && profile.role !== "tecnico",
    queryFn: async (): Promise<OS[]> => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, clientes(nome, endereco_completo), tecnico:tecnicos(id, nome, perfil, telefone, ativo)")
        .eq("empresa_id", profile?.empresa_id || "")
        .or("and(pendencias_detalhes.not.is.null,pendencias_detalhes.neq.)")
        .order("data_agendamento", { ascending: true });

      if (error) throw error;

      const parseDespesas = (value: any): Array<{ tipo: string; valor: number }> => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return [];
          }
        }
        return [];
      };

      const dbToUiStatus: Record<string, OSStatus> = {
        pendente: "Orçamento",
        aprovado: "Aprovado",
        em_andamento: "Em Execução",
        concluido: "Concluído",
        cancelado: "Cancelado",
      };

      return (data || []).map((r: any) => ({
        id: r.id,
        numero: r.numero ?? "OS-?",
        clienteId: r.cliente_id,
        tecnicoId: r.tecnico_id ?? "",
        analistaId: r.analista_id ?? "",
        titulo: r.titulo || r.descricao_problema || "",
        descricao_problema: r.descricao_problema ?? "",
        status: dbToUiStatus[r.status] ?? "Orçamento",
        criadaEm: (r.created_at ?? "").slice(0, 10),
        data_atendimento:
          r.data_agendamento ?? r.data_atendimento ?? r.dados_adicionais?.Data ?? undefined,
        data_agendamento:
          r.data_agendamento ?? r.data_atendimento ?? r.dados_adicionais?.Data ?? undefined,
        horario_atendimento: r.horario_atendimento ?? r.dados_adicionais?.Horario ?? undefined,
        valor: Number(r.valor ?? 0),
        custo_viagem: Number(r.custo_viagem ?? 0),
        km_viagem: Number(r.km_viagem ?? 0),
        despesas: parseDespesas(r.despesas),
        rat: { itens: [], evidencias: [] },
        dados_adicionais: r.dados_adicionais ?? {},
        pendencias_detalhes: r.pendencias_detalhes ?? "",
        endereco_servico: r.endereco_servico ?? "",
        tecnico: r.tecnico
          ? {
              id: r.tecnico.id,
              nome: r.tecnico.nome,
              perfil: r.tecnico.perfil ?? "",
              telefone: r.tecnico.telefone ?? "",
              ativo: r.tecnico.ativo ?? true,
            }
          : undefined,
        clientes: r.clientes,
      })) as OS[];
    },
  });

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
      const { data: tecData } = await supabase
        .from("tecnicos")
        .select("id")
        .or(`id.eq.${profile?.id},user_id.eq.${profile?.id}`)
        .maybeSingle();
      const realTecnicoId = tecData?.id || profile?.id;

      let q = (supabase.from("ordens_servico") as any)
        .select("id", { count: "exact", head: true })
        .eq("tecnico_id", realTecnicoId || "")
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
        .select(
          "tecnico_id, status, valor, custo_viagem, km_viagem, despesas, tecnico:tecnicos(id, nome)",
        )
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
        .limit(40);
      if (error) throw error;
      return (data ?? []) as LogEntry[];
    },
  });

  if (profile?.role === "tecnico") {
    return <Navigate to="/tecnico/os" replace />;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = profile?.nome_completo?.split(" ")[0] || "Usuário";

  const [loadingOSLog, setLoadingOSLog] = useState(false);

  const handleOSLogClick = async (log: any) => {
    const match = log.descricao.match(/OS\s+"?(.*?)"/);
    if (!match) {
       toast.error("Não foi possível identificar a OS neste log.");
       return;
    }
    const tituloOS = match[1];

    setLoadingOSLog(true);
    try {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, clientes(nome, endereco_completo), tecnico:tecnicos(id, nome, perfil, telefone, ativo)")
        .eq("empresa_id", profile?.empresa_id || "")
        .or(`titulo.eq."${tituloOS}",numero.eq."${tituloOS}"`)
        .limit(1);
      
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error(`OS não encontrada.`);
        return;
      }

      const matchingOS = data[0];

      const dbToUiStatus: Record<string, OSStatus> = {
        pendente: "Orçamento",
        aprovado: "Aprovado",
        em_andamento: "Em Execução",
        concluido: "Concluído",
        concluido_tecnico: "Concluído Técnico",
        cancelado: "Cancelado",
      };

      const osUi = {
        id: matchingOS.id,
        numero: matchingOS.numero,
        clienteId: matchingOS.cliente_id,
        tecnicoId: matchingOS.tecnico_id ?? "",
        analistaId: matchingOS.analista_id ?? "",
        titulo: matchingOS.titulo || matchingOS.descricao_problema || "",
        status: dbToUiStatus[matchingOS.status] ?? "Orçamento",
        criadaEm: (matchingOS.created_at ?? "").slice(0, 10),
        data_atendimento: matchingOS.data_agendamento ?? matchingOS.data_atendimento ?? (matchingOS.dados_adicionais as any)?.Data,
        data_agendamento: matchingOS.data_agendamento ?? matchingOS.data_atendimento ?? (matchingOS.dados_adicionais as any)?.Data,
        horario_atendimento: matchingOS.horario_atendimento ?? (matchingOS.dados_adicionais as any)?.Horario,
        valor: Number(matchingOS.valor ?? 0),
        custo_viagem: Number(matchingOS.custo_viagem ?? 0),
        km_viagem: Number(matchingOS.km_viagem ?? 0),
        despesas: typeof matchingOS.despesas === "string" ? JSON.parse(matchingOS.despesas) : (matchingOS.despesas || []),
        rat: (matchingOS as any).rat ? (typeof (matchingOS as any).rat === "string" ? JSON.parse((matchingOS as any).rat) : (matchingOS as any).rat) : { itens: [], evidencias: [] },
        dados_adicionais: matchingOS.dados_adicionais ?? {},
        pendencias_detalhes: matchingOS.pendencias_detalhes ?? "",
        endereco_servico: matchingOS.endereco_servico ?? "",
        tecnico: matchingOS.tecnico ? { ...matchingOS.tecnico } : undefined,
        clientes: matchingOS.clientes ? { ...matchingOS.clientes } : undefined,
      };
      setDialogMode("view");
      setEditingOS(osUi as any);
    } catch (e: any) {
      toast.error("Erro ao buscar a OS: " + e.message);
    } finally {
      setLoadingOSLog(false);
    }
  };

  const osLogs = (logsQ.data || []).filter((l: any) => l.tipo?.toLowerCase().includes("os") || l.descricao?.toLowerCase().includes("os")).slice(0, 5);
  const systemLogs = (logsQ.data || []).slice(0, 10);

  return (
    <GestorLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 bg-white/50 dark:bg-card/50 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 dark:border-border/60 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-foreground tracking-tight flex items-center gap-2">
            {getGreeting()}, <span className="text-primary">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Aqui está o resumo e indicadores da <strong className="text-slate-700 dark:text-foreground font-semibold">{profile?.empresaNome || "sua empresa"}</strong>
          </p>
        </div>
        <div className="shrink-0 bg-white dark:bg-background rounded-2xl shadow-sm border border-slate-100 dark:border-border p-1">
          <MesAnoFilter />
        </div>
      </div>

      <PriorityAlerts ordens={alertasOSQ.data ?? []} isLoading={alertasOSQ.isLoading} onEdit={(os) => { setDialogMode("edit"); setEditingOS(os); }} logs={logsQ.data ?? []} />
      <EnvioPlanilhaAlerts clientes={clientes} />
      <PagamentoAlerts clientes={clientes} />
      <PendingAlertsCard
        ordens={pendenciasOSQ.data ?? []}
        isLoading={pendenciasOSQ.isLoading}
        onEdit={(os) => { setDialogMode("edit"); setEditingOS(os); }}
      />

      {/* Cards Estratégicos */}
      {profile?.role !== "analista" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
            <p className="text-xs text-muted-foreground mt-1">Total Concluído (Ref. Mês Anterior)</p>
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
            <p className="text-xs text-muted-foreground mt-1">Pagamentos recebidos (Ref. Mês Anterior)</p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-info/10 to-info/5 p-5 border border-info/20">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-info" />
              <span className="text-xs font-medium text-muted-foreground">Resultado Líquido</span>
            </div>
            <div className="text-2xl font-bold">
              {kpisFinanceirosQ.isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                `R$ ${kpis.resultadoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Bruta R$ {kpis.receitaBruta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} -
              Custo R$ {kpis.custoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-violet/10 to-violet/5 p-5 border border-violet/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-violet" />
              <span className="text-xs font-medium text-muted-foreground">Ganho Real (Empresa)</span>
            </div>
            <div className="text-2xl font-bold">
              {kpisFinanceirosQ.isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                `R$ ${kpis.resultadoEmpresa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Líq. R$ {kpis.resultadoLiquido.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} -
              Comissão R$ {kpis.comissaoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-warning/10 to-warning/5 p-5 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span className="text-xs font-medium text-muted-foreground">
                Pendências de Pagamento
              </span>
            </div>
            <div className="text-2xl font-bold">
              {kpisFinanceirosQ.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                kpis.pendenciasPagamento
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Faturamentos vencidos e não pagos</p>
          </div>
        </div>
      )}

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
              trend={
                (profile?.role as string) === "tecnico"
                  ? "Suas atribuições"
                  : `${(Array.isArray(tecnicos) ? tecnicos : []).filter((t) => t.ativo).length} técnicos`
              }
              tone="warning"
            />
          </div>

          {/* Atualizações de OS (Substituindo Atividades Recentes) */}
          <div className="rounded-3xl bg-card p-4 md:p-6 shadow-[var(--shadow-card)] border border-border/60">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Atualizações de OS
                  {loadingOSLog && <Activity className="w-4 h-4 animate-spin text-primary" />}
                </h3>
                <p className="text-xs text-muted-foreground">Últimas alterações em ordens de serviço</p>
              </div>
              <Link
                to="/logs"
                className="text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all"
              >
                Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {recentLogsQ.isLoading && (
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
              {!logsQ.isLoading && osLogs.length > 0 ? (
                <div className="space-y-2">
                  {osLogs.map((log: any) => {
                    const numMatch = log.descricao.match(/OS\s+"?(\d+)/i);
                    const osNum = numMatch ? numMatch[1] : "OS";
                    const cleanDesc = log.descricao.replace(/OS "(.*?)"/, "").trim();

                    return (
                      <div
                        key={log.id}
                        onClick={() => handleOSLogClick(log)}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-background hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground leading-tight flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              #{osNum}
                            </span>
                            {cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 truncate">
                            Atualizado por: {log.usuario_nome}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground font-medium mb-1">
                            {formatDate(log.created_at)}
                          </p>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-muted text-muted-foreground border border-border">
                            {log.tipo}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !logsQ.isLoading && (
                  <div className="text-sm text-muted-foreground text-center py-10">
                    Nenhuma atualização de OS recente.
                  </div>
                )
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
                      const eficiencia =
                        p.os_total > 0 ? Math.round((p.os_concluidas / p.os_total) * 100) : 0;
                      return (
                        <tr key={p.tecnico_id} className="hover:bg-muted/30">
                          <td className="px-2 py-2.5 font-medium text-xs">
                            {p.nome.split(" ")[0]}
                          </td>
                          <td className="px-2 py-2.5 text-right text-xs">
                            <span
                              className={`font-semibold ${eficiencia >= 70 ? "text-success" : eficiencia >= 40 ? "text-warning" : "text-destructive"}`}
                            >
                              {eficiencia}%
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right text-xs font-semibold">
                            R${" "}
                            {p.faturamento.toLocaleString("pt-BR", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
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
                  {systemLogs.map((log) => (
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

      <EditOSDialog
        mode={dialogMode}
        ordem={editingOS}
        clientes={clientes}
        tecnicos={tecnicos}
        addCliente={async (c) => ""}
        addTecnico={async (t) => ""}
        onClose={() => setEditingOS(null)}
        onSave={async (patch) => {
          if (!editingOS) return;
          try {
            await updateOS(editingOS.id, patch);
            
            if (profile?.empresa_id) {
              await logActivity(
                "os_atualizada",
                `OS "${editingOS.titulo}" atualizada rapidamente pelo Dashboard por ${profile?.nome_completo || profile?.email || "Gestor"}`,
                profile.empresa_id,
                profile?.nome_completo,
              );
            }

            toast.success("OS atualizada com sucesso");
            setEditingOS(null);
            pendenciasOSQ.refetch();
            recentLogsQ.refetch();
          } catch (e: any) {
            toast.error(e?.message ?? "Erro ao atualizar");
          }
        }}
      />
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
