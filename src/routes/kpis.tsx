import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { useAuth } from "@/lib/auth-context";
import { useKpisData, brl } from "@/lib/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, DollarSign, Clock, UserMinus } from "lucide-react";
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
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
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
    return { concluidas, valorAPagar, tempoMedio };
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
              hint={`no período de ${meses} meses`}
              icon={CheckCircle2}
            />
            <KpiCard
              title="Valor a pagar (equipe)"
              value={brl(totais.valorAPagar)}
              hint="comissões, fixo, bônus, hora extra e lançamentos"
              icon={DollarSign}
            />
            <KpiCard
              title="Tempo médio de atendimento"
              value={totais.tempoMedio ? `${totais.tempoMedio.toFixed(1)} h` : "—"}
              hint="baseado em início/fim registrados na OS"
              icon={Clock}
            />
            <KpiCard
              title="Taxa de inativação de técnicos"
              value={`${(data?.taxaInativacao ?? 0).toFixed(1)}%`}
              hint={`${data?.tecnicosInativos ?? 0} de ${data?.totalTecnicos ?? 0} técnicos inativos`}
              icon={UserMinus}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">OS concluídas x Valor a pagar</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data?.meses ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip
                    formatter={(v: number, n: string) =>
                      n === "Valor a pagar" ? brl(Number(v)) : v
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="concluidas" name="OS concluídas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="valorAPagar" name="Valor a pagar" stroke="hsl(var(--destructive))" strokeWidth={2} />
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
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => `${Number(v).toFixed(1)} h`} />
                    <Area type="monotone" dataKey="tempoMedioHoras" name="Tempo médio" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
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
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="criadas" name="Criadas" fill="hsl(var(--muted-foreground) / 0.5)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="concluidas" name="Concluídas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
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
