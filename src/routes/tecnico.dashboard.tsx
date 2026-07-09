import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Loader2, ClipboardList, Clock, CheckCircle2, Wallet, CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/tecnico/dashboard")({
  component: () => (
    <ProtectedRoute requireRole="tecnico">
      <DashboardTecnico />
    </ProtectedRoute>
  ),
});

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DashboardTecnico() {
  const { profile } = useAuth();
  const tecnicoId = profile?.id;

  const mesInicio = new Date();
  mesInicio.setDate(1);
  mesInicio.setHours(0, 0, 0, 0);
  const mesIsoDate = mesInicio.toISOString().slice(0, 10);

  const [filtroPeriodo, setFiltroPeriodo] = useState<"mes_atual" | "todo_periodo">("mes_atual");

  const { data: allStats, isLoading } = useQuery({
    queryKey: ["dashboard_tecnico_all", tecnicoId],
    enabled: !!tecnicoId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("view_dashboard_tecnico")
        .select("mes, total_mes, pendentes, concluidas, valor_recebido")
        .eq("tecnico_id", tecnicoId);
      if (error) throw error;
      return data || [];
    },
  });

  const stats = allStats?.reduce(
    (acc: any, row: any) => {
      if (filtroPeriodo === "mes_atual" && row.mes !== mesIsoDate) return acc;
      return {
        total_mes: acc.total_mes + (row.total_mes || 0),
        pendentes: acc.pendentes + (row.pendentes || 0),
        concluidas: acc.concluidas + (row.concluidas || 0),
        valor_recebido: acc.valor_recebido + Number(row.valor_recebido || 0),
      };
    },
    { total_mes: 0, pendentes: 0, concluidas: 0, valor_recebido: 0 }
  );

  const { data: ultimasOs, isLoading: isLoadingOs } = useQuery({
    queryKey: ["ultimas_os_tecnico", tecnicoId],
    enabled: !!tecnicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("id, clientes(nome), created_at, status, valor")
        .eq("tecnico_id", tecnicoId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const cards = [
    {
      label: filtroPeriodo === "mes_atual" ? "OS no mês" : "Total de OS",
      value: stats?.total_mes ?? 0,
      icon: ClipboardList,
      color: "from-primary to-violet",
    },
    {
      label: "Pendentes",
      value: stats?.pendentes ?? 0,
      icon: Clock,
      color: "from-amber-500 to-orange-500",
    },
    {
      label: "Concluídas",
      value: stats?.concluidas ?? 0,
      icon: CheckCircle2,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Recebido",
      value: fmtBRL(Number(stats?.valor_recebido ?? 0)),
      icon: Wallet,
      color: "from-blue-500 to-cyan-500",
    },
  ];

  return (
    <TecnicoLayout>
      <div className="px-4 pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Olá, {profile?.nome_completo?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Seu resumo de desempenho</p>
        </div>
        <Select value={filtroPeriodo} onValueChange={(v: any) => setFiltroPeriodo(v)}>
          <SelectTrigger className="w-[140px] h-9 text-xs font-medium bg-background/50 backdrop-blur-md border-border/60 rounded-xl">
            <CalendarDays className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/60">
            <SelectItem value="mes_atual" className="text-xs">Mês Atual</SelectItem>
            <SelectItem value="todo_periodo" className="text-xs">Todo o Período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {cards.map((c) => (
            <Card key={c.label} className="p-4 rounded-2xl border-border/60">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-3 shadow-[var(--shadow-glow)]`}
              >
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-2xl font-bold leading-tight">{c.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Lista de OSs Recentes */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-bold mb-3">Últimas OS Atribuídas</h2>
        {isLoadingOs ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : !ultimasOs || ultimasOs.length === 0 ? (
          <Card className="p-6 text-center rounded-2xl border-dashed">
            <p className="text-muted-foreground text-sm">Nenhuma OS atribuída a você no momento.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {ultimasOs.map((os) => (
              <Card key={os.id} className="p-4 rounded-2xl border-border/60 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-sm">{(os.clientes as any)?.nome || 'Cliente não informado'}</div>
                  <div className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {os.status}
                  </div>
                </div>
                <div className="flex justify-between items-end mt-1">
                  <div className="text-xs text-muted-foreground">
                    {new Date(os.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-sm font-bold">
                    {fmtBRL(Number(os.valor || 0))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-24">
        <Link
          to="/tecnico/os"
          className="block w-full rounded-2xl p-4 bg-gradient-to-br from-primary to-violet text-primary-foreground font-semibold text-center shadow-[var(--shadow-glow)]"
        >
          Ver meus chamados
        </Link>
      </div>
    </TecnicoLayout>
  );
}
