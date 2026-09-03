import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PrivateFileLink } from "@/components/PrivateFileLink";
import { ArrowLeft, ClipboardList, Download, FileText, Mail, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Histórico do Cliente | QuickOps" },
      { name: "description", content: "Acompanhe ordens de serviço, RATs e financeiro de cada cliente em um só lugar." },
      { property: "og:title", content: "Histórico do Cliente | QuickOps" },
      { property: "og:description", content: "OS, RATs e financeiro consolidados por cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["gestor", "analista", "admin", "superadmin"]}>
      <GestorLayout>
        <ClienteDetalhe />
      </GestorLayout>
    </ProtectedRoute>
  ),
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const somaJson = (v: unknown) =>
  Array.isArray(v) ? v.reduce((s: number, d: any) => s + (Number(d?.valor) || 0), 0) : 0;

const isConcluida = (status: string) =>
  ["concluido", "Concluído", "concluido_tecnico", "Concluído Técnico"].includes(status);

function ClienteDetalhe() {
  const { id } = Route.useParams();

  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ["cliente_detalhe", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: ordens, isLoading: loadingOS } = useQuery({
    queryKey: ["cliente_os", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(
          "id, numero, titulo, status, valor, custo_viagem, despesas, lancamentos_adicionais, created_at, data_agendamento, data_hora_inicio, data_hora_fim, tecnicos(nome)",
        )
        .eq("cliente_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const osIds = useMemo(() => (ordens ?? []).map((o: any) => o.id), [ordens]);

  const { data: rats, isLoading: loadingRats } = useQuery({
    queryKey: ["cliente_rats", id, osIds.length],
    enabled: osIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rat_arquivos")
        .select("*")
        .in("ordem_servico_id", osIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const numeroPorOs = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of ordens ?? []) m.set((o as any).id, (o as any).numero ?? "OS");
    return m;
  }, [ordens]);

  const resumo = useMemo(() => {
    const list = ordens ?? [];
    const concluidas = list.filter((o: any) => isConcluida(o.status));
    const faturamento = list.reduce((s: number, o: any) => s + (Number(o.valor) || 0), 0);
    const custos = list.reduce(
      (s: number, o: any) =>
        s + (Number(o.custo_viagem) || 0) + somaJson(o.despesas) + somaJson(o.lancamentos_adicionais),
      0,
    );
    const duracoes = list
      .filter((o: any) => o.data_hora_inicio && o.data_hora_fim)
      .map(
        (o: any) =>
          (new Date(o.data_hora_fim).getTime() - new Date(o.data_hora_inicio).getTime()) / 3600000,
      )
      .filter((h) => h > 0 && h < 24 * 7);
    return {
      total: list.length,
      concluidas: concluidas.length,
      abertas: list.length - concluidas.length,
      faturamento,
      custos,
      margem: faturamento - custos,
      ticket: concluidas.length ? faturamento / concluidas.length : 0,
      tempoMedio: duracoes.length ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length : 0,
    };
  }, [ordens]);

  if (loadingCliente) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Cliente não encontrado"
        description="Este cliente pode ter sido removido ou pertence a outra empresa."
      />
    );
  }

  const c = cliente as any;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/clientes">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{c.nome}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {c.documento && <span>{c.documento}</span>}
              {c.telefone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {c.telefone}
                </span>
              )}
              {c.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {c.email}
                </span>
              )}
              {c.endereco_completo && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {c.endereco_completo}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="OS totais" valor={String(resumo.total)} sub={`${resumo.abertas} em aberto`} />
        <KpiCard titulo="OS concluídas" valor={String(resumo.concluidas)} sub={`Ticket médio ${brl(resumo.ticket)}`} />
        <KpiCard titulo="Faturamento" valor={brl(resumo.faturamento)} sub={`Custos ${brl(resumo.custos)}`} />
        <KpiCard
          titulo="Margem"
          valor={brl(resumo.margem)}
          sub={resumo.tempoMedio ? `Tempo médio ${resumo.tempoMedio.toFixed(1)} h` : "Tempo médio —"}
        />
      </div>

      <Tabs defaultValue="os">
        <TabsList>
          <TabsTrigger value="os">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="rats">RATs e anexos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="os" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingOS ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (ordens ?? []).length === 0 ? (
                <div className="p-6">
                  <EmptyState icon={ClipboardList} title="Nenhuma OS" description="Este cliente ainda não possui ordens de serviço." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">OS</th>
                        <th className="px-4 py-3 font-semibold">Título</th>
                        <th className="px-4 py-3 font-semibold">Técnico</th>
                        <th className="px-4 py-3 font-semibold">Data</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(ordens ?? []).map((o: any) => (
                        <tr key={o.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{o.numero}</td>
                          <td className="px-4 py-3">{o.titulo}</td>
                          <td className="px-4 py-3 text-muted-foreground">{o.tecnicos?.nome ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(o.data_agendamento ?? o.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={isConcluida(o.status) ? "default" : "outline"}>{o.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{brl(Number(o.valor) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rats" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {loadingRats || loadingOS ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (rats ?? []).length === 0 ? (
                <EmptyState icon={FileText} title="Nenhum documento" description="Ainda não há RATs, fotos ou assinaturas enviadas para este cliente." />
              ) : (
                <div className="space-y-2">
                  {(rats ?? []).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.nome_arquivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {numeroPorOs.get(a.ordem_servico_id) ?? "OS"} · {a.tipo_arquivo} ·{" "}
                          {new Date(a.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <PrivateFileLink urlOrPath={a.arquivo_url} bucket="rats">
                        <Button variant="outline" size="sm">
                          <Download className="w-3.5 h-3.5 mr-1" /> Abrir
                        </Button>
                      </PrivateFileLink>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard titulo="Faturamento total" valor={brl(resumo.faturamento)} sub="Soma dos valores das OS" />
            <KpiCard titulo="Custos lançados" valor={brl(resumo.custos)} sub="Viagem, despesas e lançamentos" />
            <KpiCard titulo="Margem" valor={brl(resumo.margem)} sub="Faturamento menos custos" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento por OS</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">OS</th>
                      <th className="px-4 py-3 font-semibold text-right">Valor</th>
                      <th className="px-4 py-3 font-semibold text-right">Viagem</th>
                      <th className="px-4 py-3 font-semibold text-right">Despesas</th>
                      <th className="px-4 py-3 font-semibold text-right">Lançamentos</th>
                      <th className="px-4 py-3 font-semibold text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(ordens ?? []).map((o: any) => {
                      const viagem = Number(o.custo_viagem) || 0;
                      const desp = somaJson(o.despesas);
                      const lanc = somaJson(o.lancamentos_adicionais);
                      const margem = (Number(o.valor) || 0) - viagem - desp - lanc;
                      return (
                        <tr key={o.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{o.numero}</td>
                          <td className="px-4 py-3 text-right">{brl(Number(o.valor) || 0)}</td>
                          <td className="px-4 py-3 text-right">{brl(viagem)}</td>
                          <td className="px-4 py-3 text-right">{brl(desp)}</td>
                          <td className="px-4 py-3 text-right">{brl(lanc)}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${margem < 0 ? "text-destructive" : ""}`}>
                            {brl(margem)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="mt-1 text-xl font-bold">{valor}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
