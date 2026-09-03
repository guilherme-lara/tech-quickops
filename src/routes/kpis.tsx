import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { SectionTabs } from "@/components/SectionTabs";
import { useAuth } from "@/lib/auth-context";
import { useKpisData, brl } from "@/lib/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, DollarSign, Clock, UserMinus, TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

export const Route = createFileRoute("/kpis")({
  head: () => ({
    meta: [
      { title: "KPIs Operacionais | QuickOps" },
      { name: "description", content: "Indicadores mensais de OS concluídas, valor a pagar, tempo médio de atendimento e inativação de técnicos." },
      { property: "og:title", content: "KPIs Operacionais | QuickOps" },
      { property: "og:description", content: "Acompanhe os indicadores de operação e custo da sua equipe técnica mês a mês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["gestor", "admin", "superadmin"]}>
      <GestorLayout>
      <div className="px-4 md:px-8 pt-6"><SectionTabs group="estrategica" /></div>
        <KpisPage />
      </GestorLayout>
    </ProtectedRoute>
  ),
});

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  trend,
  colorClass = "text-primary",
  bgClass = "bg-primary/10",
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  trend?: { direction: "up" | "down" | "neutral"; value: string };
  colorClass?: string;
  bgClass?: string;
}) {
  return (
    <Card className="overflow-hidden relative transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground mt-1">{title}</CardTitle>
        <div className={`p-2.5 rounded-xl ${bgClass} ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span
              className={`text-xs font-semibold flex items-center ${
                trend.direction === "up" ? "text-emerald-600 dark:text-emerald-500" : trend.direction === "down" ? "text-red-600 dark:text-red-500" : "text-muted-foreground"
              }`}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
              ) : trend.direction === "down" ? (
                <TrendingDown className="w-3.5 h-3.5 mr-1" />
              ) : null}
              {trend.value}
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground line-clamp-1">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function calculateTrend(current: number, prev: number, invertGood = false) {
  if (!prev) return undefined;
  const perc = ((current - prev) / prev) * 100;
  if (Math.abs(perc) < 0.1) return { direction: "neutral" as const, value: "0%" };
  
  const isUp = perc > 0;
  // If invertGood is true, higher is bad (down trend), so 'up' visually is a red signal, but we handle it via direction
  let direction: "up" | "down" = isUp ? "up" : "down";
  if (invertGood) {
     direction = isUp ? "down" : "up"; // Hack to make up/down color semantic match "good/bad"
  }
  return {
    direction: (isUp && !invertGood) || (!isUp && invertGood) ? "up" : "down", // 'up' means green
    value: `${Math.abs(perc).toFixed(1)}%`
  };
}

function KpisPage() {
  const { profile } = useAuth();
  const [meses, setMeses] = useState("6");
  const { data, isLoading } = useKpisData(profile?.empresa_id, Number(meses));

  const totais = useMemo(() => {
    const m = data?.meses ?? [];
    const concluidas = m.reduce((s, x) => s + x.concluidas, 0);
    const valorAPagar = m.reduce((s, x) => s + x.valorAPagar, 0);
    const comTempo = m.filter((x) => x.tempoMedioHoras > 0);
    const tempoMedio = comTempo.length
      ? comTempo.reduce((s, x) => s + x.tempoMedioHoras, 0) / comTempo.length
      : 0;

    // Trend calculation
    let trends = { concluidas: undefined as any, valorAPagar: undefined as any, tempoMedio: undefined as any };
    if (m.length >= 2) {
      const curr = m[m.length - 1];
      const prev = m[m.length - 2];
      trends.concluidas = calculateTrend(curr.concluidas, prev.concluidas);
      trends.valorAPagar = calculateTrend(curr.valorAPagar, prev.valorAPagar, true); // Higher cost is "bad"
      trends.tempoMedio = calculateTrend(curr.tempoMedioHoras, prev.tempoMedioHoras, true); // Higher time is "bad"
    }

    return { concluidas, valorAPagar, tempoMedio, trends };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPIs Operacionais</h1>
          <p className="text-sm text-muted-foreground">
            Indicadores consolidados por mês: entrega, custo com equipe e eficiência.
          </p>
        </div>
        <Select value={meses} onValueChange={setMeses}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="OS concluídas"
              value={String(totais.concluidas)}
              hint="vs mês anterior"
              trend={totais.trends.concluidas}
              icon={CheckCircle2}
              colorClass="text-emerald-600 dark:text-emerald-500"
              bgClass="bg-emerald-500/10"
            />
            <KpiCard
              title="Valor a pagar (equipe)"
              value={brl(totais.valorAPagar)}
              hint="vs mês anterior"
              trend={totais.trends.valorAPagar}
              icon={DollarSign}
              colorClass="text-amber-600 dark:text-amber-500"
              bgClass="bg-amber-500/10"
            />
            <KpiCard
              title="Tempo médio de atendimento"
              value={totais.tempoMedio ? `${totais.tempoMedio.toFixed(1)} h` : "—"}
              hint="vs mês anterior"
              trend={totais.trends.tempoMedio}
              icon={Clock}
              colorClass="text-blue-600 dark:text-blue-500"
              bgClass="bg-blue-500/10"
            />
            <KpiCard
              title="Taxa de inativação"
              value={`${(data?.taxaInativacao ?? 0).toFixed(1)}%`}
              hint={`${data?.tecnicosInativos ?? 0} inativos`}
              icon={UserMinus}
              colorClass="text-red-600 dark:text-red-500"
              bgClass="bg-red-500/10"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">OS concluídas x Valor a pagar</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data?.meses ?? []}>
                  <defs>
                    <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number, n: string) =>
                      n === "Valor a pagar" ? brl(Number(v)) : v
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="concluidas" name="OS concluídas" fill="url(#colorConcluidas)" radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="valorAPagar" name="Valor a pagar" stroke="hsl(var(--destructive))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tempo médio de atendimento (h)</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.meses ?? []}>
                    <defs>
                      <linearGradient id="colorTempo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => `${Number(v).toFixed(1)} h`} />
                    <Area type="monotone" dataKey="tempoMedioHoras" name="Tempo médio" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTempo)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">OS criadas x concluídas</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data?.meses ?? []}>
                    <defs>
                      <linearGradient id="colorCriadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="criadas" name="Criadas" fill="url(#colorCriadas)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="concluidas" name="Concluídas" fill="url(#colorConcluidas)" radius={[6, 6, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
