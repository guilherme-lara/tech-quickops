import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { SectionTabs } from "@/components/SectionTabs";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Activity,
  ClipboardList,
  CheckCircle2,
  MapPin,
  Wallet,
  UsersRound,
  Users,
  Radio,
  Pause,
  Play,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/tempo-real")({
  head: () => ({
    meta: [
      { title: "Tempo Real | QuickOps" },
      {
        name: "description",
        content:
          "Acompanhe ao vivo novas OS, check-ins, conclusões, lançamentos financeiros e atualizações de técnicos e clientes.",
      },
      { property: "og:title", content: "Tempo Real | QuickOps" },
      {
        property: "og:description",
        content: "Feed ao vivo da operação: OS, check-ins, conclusões e lançamentos financeiros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["gestor", "admin", "superadmin", "analista"]}>
      <TempoRealPage />
    </ProtectedRoute>
  ),
});

type EventoTipo = "os_nova" | "os_checkin" | "os_concluida" | "financeiro" | "tecnico" | "cliente" | "os_update";

interface Evento {
  id: string;
  tipo: EventoTipo;
  titulo: string;
  detalhe: string;
  at: string;
}

const META: Record<EventoTipo, { label: string; icon: any; color: string }> = {
  os_nova: { label: "Nova OS", icon: ClipboardList, color: "text-primary bg-primary/10 border-primary/20" },
  os_checkin: { label: "Check-in", icon: MapPin, color: "text-info bg-info/10 border-info/20" },
  os_concluida: {
    label: "Conclusão",
    icon: CheckCircle2,
    color: "text-success bg-success/10 border-success/20",
  },
  financeiro: { label: "Financeiro", icon: Wallet, color: "text-violet bg-violet/10 border-violet/20" },
  tecnico: { label: "Técnico", icon: UsersRound, color: "text-warning bg-warning/20 border-warning/30" },
  cliente: { label: "Cliente", icon: Users, color: "text-foreground bg-muted border-border" },
  os_update: { label: "Atualização", icon: Activity, color: "text-muted-foreground bg-muted border-border" },
};

const FILTROS: { value: EventoTipo | "todos"; label: string }[] = [
  { value: "todos", label: "Tudo" },
  { value: "os_nova", label: "Novas OS" },
  { value: "os_checkin", label: "Check-ins" },
  { value: "os_concluida", label: "Conclusões" },
  { value: "financeiro", label: "Financeiro" },
  { value: "tecnico", label: "Técnicos" },
  { value: "cliente", label: "Clientes" },
];

const EM_CAMPO = ["em_andamento", "em_deslocamento"];

function TempoRealPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pausado, setPausado] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [filtro, setFiltro] = useState<EventoTipo | "todos">("todos");
  const pausadoRef = useRef(pausado);
  pausadoRef.current = pausado;

  const historicoQ = useQuery({
    queryKey: ["tempo_real_historico", empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<Evento[]> => {
      const { data, error } = await supabase
        .from("os_historico")
        .select("id, tipo_evento, status_anterior, status_novo, alterado_por_nome, created_at, os_id")
        .eq("empresa_id", empresaId as string)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []).map((h: any) => {
        let tipo: EventoTipo = "os_update";
        if (h.tipo_evento?.startsWith("criada")) tipo = "os_nova";
        else if (EM_CAMPO.includes(h.status_novo)) tipo = "os_checkin";
        else if (h.status_novo === "concluido" || h.status_novo === "concluido_tecnico")
          tipo = "os_concluida";
        return {
          id: `hist-${h.id}`,
          tipo,
          titulo:
            tipo === "os_nova"
              ? "Ordem de serviço criada"
              : `Status: ${h.status_anterior ?? "—"} → ${h.status_novo ?? "—"}`,
          detalhe: `Por ${h.alterado_por_nome ?? "Sistema"}`,
          at: h.created_at,
        };
      });
    },
  });

  useEffect(() => {
    if (historicoQ.data && eventos.length === 0) setEventos(historicoQ.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historicoQ.data]);

  const push = (e: Evento) => {
    if (pausadoRef.current) return;
    setEventos((prev) => [e, ...prev].slice(0, 200));
  };

  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`tempo-real-${empresaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ordens_servico", filter: `empresa_id=eq.${empresaId}` },
        (payload: any) => {
          const novo = payload.new ?? {};
          const antigo = payload.old ?? {};
          const numero = novo.numero ?? antigo.numero ?? "OS";
          if (payload.eventType === "INSERT") {
            push({
              id: `os-${novo.id}-${Date.now()}`,
              tipo: "os_nova",
              titulo: `Nova OS ${numero}`,
              detalhe: novo.titulo ?? "Ordem de serviço criada",
              at: new Date().toISOString(),
            });
            return;
          }
          if (payload.eventType === "UPDATE") {
            if (antigo.status !== novo.status) {
              const tipo: EventoTipo = EM_CAMPO.includes(novo.status)
                ? "os_checkin"
                : novo.status === "concluido" || novo.status === "concluido_tecnico"
                  ? "os_concluida"
                  : "os_update";
              push({
                id: `os-st-${novo.id}-${Date.now()}`,
                tipo,
                titulo: `OS ${numero}: ${antigo.status} → ${novo.status}`,
                detalhe: novo.titulo ?? "",
                at: new Date().toISOString(),
              });
            }
            const mudouFinanceiro =
              antigo.valor !== novo.valor ||
              antigo.custo_viagem !== novo.custo_viagem ||
              antigo.valor_adiantado !== novo.valor_adiantado ||
              JSON.stringify(antigo.despesas) !== JSON.stringify(novo.despesas) ||
              JSON.stringify(antigo.lancamentos_adicionais) !== JSON.stringify(novo.lancamentos_adicionais);
            if (mudouFinanceiro) {
              push({
                id: `os-fin-${novo.id}-${Date.now()}`,
                tipo: "financeiro",
                titulo: `Lançamento financeiro na OS ${numero}`,
                detalhe: `Valor: R$ ${Number(novo.valor ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                at: new Date().toISOString(),
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tecnicos", filter: `empresa_id=eq.${empresaId}` },
        (payload: any) => {
          const t = payload.new ?? payload.old ?? {};
          push({
            id: `tec-${t.id}-${Date.now()}`,
            tipo: "tecnico",
            titulo:
              payload.eventType === "INSERT"
                ? `Novo técnico: ${t.nome}`
                : `Técnico atualizado: ${t.nome}`,
            detalhe: t.ativo === false ? "Inativo" : "Ativo",
            at: new Date().toISOString(),
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes", filter: `empresa_id=eq.${empresaId}` },
        (payload: any) => {
          const c = payload.new ?? payload.old ?? {};
          push({
            id: `cli-${c.id}-${Date.now()}`,
            tipo: "cliente",
            titulo:
              payload.eventType === "INSERT" ? `Novo cliente: ${c.nome}` : `Cliente atualizado: ${c.nome}`,
            detalhe: c.cidade ?? c.email ?? "",
            at: new Date().toISOString(),
          });
        },
      )
      .subscribe((status) => setConectado(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  const filtrados = useMemo(
    () => (filtro === "todos" ? eventos : eventos.filter((e) => e.tipo === filtro)),
    [eventos, filtro],
  );

  const resumo = useMemo(() => {
    const conta = (t: EventoTipo) => eventos.filter((e) => e.tipo === t).length;
    return [
      { label: "Novas OS", value: conta("os_nova"), icon: ClipboardList },
      { label: "Check-ins", value: conta("os_checkin"), icon: MapPin },
      { label: "Conclusões", value: conta("os_concluida"), icon: CheckCircle2 },
      { label: "Financeiro", value: conta("financeiro"), icon: Wallet },
    ];
  }, [eventos]);

  return (
    <GestorLayout>
      <SectionTabs group="estrategica" />
      <div className="space-y-6">
        <div className="rounded-3xl bg-card p-5 md:p-6 border border-border/60 shadow-[var(--shadow-card)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Radio className="w-5 h-5 text-primary" /> Tempo Real
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Novas OS, check-ins, conclusões, lançamentos financeiros e atualizações de técnicos e clientes —
              ao vivo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`rounded-full gap-1.5 ${conectado ? "text-success border-success/30" : "text-muted-foreground"}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${conectado ? "bg-success animate-pulse" : "bg-muted-foreground"}`}
              />
              {conectado ? "Conectado" : "Conectando..."}
            </Badge>
            <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setPausado((p) => !p)}>
              {pausado ? <Play className="w-3.5 h-3.5 mr-1.5" /> : <Pause className="w-3.5 h-3.5 mr-1.5" />}
              {pausado ? "Retomar" : "Pausar"}
            </Button>
            <Button variant="ghost" size="sm" className="rounded-xl h-9" onClick={() => setEventos([])}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Limpar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {resumo.map((r) => (
            <div key={r.label} className="rounded-3xl bg-card p-5 border border-border/60 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <r.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{r.label}</span>
              </div>
              <div className="text-2xl font-bold">{r.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-card p-4 md:p-6 border border-border/60 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap gap-2 mb-5">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                  filtro === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {historicoQ.isLoading && eventos.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="Aguardando movimentações"
              description="Assim que algo acontecer na operação, o evento aparece aqui automaticamente."
            />
          ) : (
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {filtrados.map((e) => {
                const meta = META[e.tipo];
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.color}`}>
                      <meta.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{e.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.detalhe}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(e.at).toLocaleString("pt-BR")}
                      </p>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-muted text-muted-foreground border border-border">
                        {meta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </GestorLayout>
  );
}
