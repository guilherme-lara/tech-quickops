import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { useAuth } from "@/lib/auth-context";
import { useKpisData, brl } from "@/lib/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { Trophy, UsersRound } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/desempenho")({
  head: () => ({
    meta: [
      { title: "Desempenho dos Técnicos | QuickOps" },
      { name: "description", content: "Ranking de técnicos por valor a pagar, OS concluídas e produtividade, com evolução mensal." },
      { property: "og:title", content: "Desempenho dos Técnicos | QuickOps" },
      { property: "og:description", content: "Compare a produtividade e o custo de cada técnico da sua operação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["gestor", "admin", "superadmin"]}>
      <GestorLayout>
        <DesempenhoPage />
      </GestorLayout>
    </ProtectedRoute>
  ),
});

type Criterio = "valorAPagar" | "concluidas" | "produtividade";

const CORES = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
];

function DesempenhoPage() {
  const { profile } = useAuth();
  const [meses, setMeses] = useState("6");
  const [criterio, setCriterio] = useState<Criterio>("valorAPagar");
  const [metrica, setMetrica] = useState<"concluidas" | "valorAPagar">("concluidas");
  const { data, isLoading } = useKpisData(profile?.empresa_id, Number(meses));

  const ranking = useMemo(() => {
    const arr = [...(data?.tecnicos ?? [])];
    arr.sort((a, b) => b[criterio] - a[criterio]);
    return arr;
  }, [data, criterio]);

  const chartData = useMemo(() => {
    const top = ranking.slice(0, 5);
    const labels = top[0]?.porMes.map((m) => m.label) ?? [];
    return labels.map((label, i) => {
      const row: Record<string, string | number> = { label };
      for (const t of top) row[t.nome] = t.porMes[i]?.[metrica] ?? 0;
      return row;
    });
  }, [ranking, metrica]);

  const maxCriterio = ranking[0]?.[criterio] || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Desempenho dos Técnicos</h1>
          <p className="text-sm text-muted-foreground">
            Ranking por valor a pagar, OS concluídas e produtividade em relação à meta.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={criterio} onValueChange={(v) => setCriterio(v as Criterio)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="valorAPagar">Ranking: valor a pagar</SelectItem>
              <SelectItem value="concluidas">Ranking: OS concluídas</SelectItem>
              <SelectItem value="produtividade">Ranking: produtividade</SelectItem>
            </SelectContent>
          </Select>
          <Select value={meses} onValueChange={setMeses}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : ranking.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Sem dados de desempenho"
          description="Ainda não há ordens de serviço concluídas com técnico atribuído no período selecionado."
        />
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Evolução mensal (Top 5)</CardTitle>
              <Select value={metrica} onValueChange={(v) => setMetrica(v as "concluidas" | "valorAPagar")}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concluidas">OS concluídas</SelectItem>
                  <SelectItem value="valorAPagar">Valor a pagar</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => (metrica === "valorAPagar" ? brl(Number(v)) : v)} />
                  <Legend />
                  {ranking.slice(0, 5).map((t, i) => (
                    <Line
                      key={t.id}
                      type="monotone"
                      dataKey={t.nome}
                      stroke={CORES[i % CORES.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {ranking.map((t, i) => (
              <Card key={t.id} className={t.ativo ? "" : "opacity-60"}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-bold">
                      {i === 0 ? <Trophy className="w-5 h-5 text-amber-500" /> : i + 1}
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${t.ativo ? "" : "line-through text-muted-foreground"}`}>
                          {t.nome}
                        </span>
                        {!t.ativo && <Badge variant="outline">Inativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tempo médio: {t.tempoMedioHoras ? `${t.tempoMedioHoras.toFixed(1)} h` : "—"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 flex-1">
                      <div>
                        <p className="text-xs text-muted-foreground">OS concluídas</p>
                        <p className="font-semibold">{t.concluidas}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Valor a pagar</p>
                        <p className="font-semibold">{brl(t.valorAPagar)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Faturamento gerado</p>
                        <p className="font-semibold">{brl(t.faturamento)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t.metaChamados > 0 ? "Produtividade (meta)" : "OS/mês"}
                        </p>
                        <p className="font-semibold">
                          {t.metaChamados > 0
                            ? `${t.produtividade.toFixed(0)}%`
                            : t.produtividade.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Progress
                    className="mt-3 h-2"
                    value={Math.min(100, (t[criterio] / maxCriterio) * 100)}
                  />
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Comissão: {brl(t.comissaoTotal)}</span>
                    <span>Hora extra: {brl(t.horaExtraTotal)}</span>
                    <span>Bônus: {brl(t.bonusTotal)}</span>
                    <span>Lançamentos: {brl(t.lancamentosTotal)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
