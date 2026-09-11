import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, User, Clock, AlertCircle } from "lucide-react";

type HistoricoRow = {
  id: string;
  created_at: string;
  tipo_evento: string;
  alterado_por: string | null;
  alterado_por_nome: string | null;
  tecnico_id: string | null;
  tecnico_user_id: string | null;
  tecnico_id_anterior: string | null;
  tecnico_user_id_anterior: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  alteracoes: Record<string, any> | null;
};

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  criada: { label: "Criada", color: "bg-blue-500/15 text-blue-600" },
  criada_atribuida: { label: "Criada + Atribuída", color: "bg-blue-500/15 text-blue-600" },
  atribuida: { label: "Atribuída", color: "bg-emerald-500/15 text-emerald-600" },
  reatribuida: { label: "Reatribuída", color: "bg-amber-500/15 text-amber-600" },
  desatribuida: { label: "Desatribuída", color: "bg-red-500/15 text-red-600" },
  status_alterado: { label: "Status alterado", color: "bg-purple-500/15 text-purple-600" },
  alterada: { label: "Alterada", color: "bg-muted text-muted-foreground" },
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function OSHistorico({ osId }: { osId: string | null }) {
  const [rows, setRows] = useState<HistoricoRow[]>([]);
  const [tecMap, setTecMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!osId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await (supabase.from("os_historico" as any) as any)
          .select("*")
          .eq("os_id", osId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        if (!alive) return;
        const list = (data ?? []) as HistoricoRow[];
        setRows(list);

        // Resolve nomes dos técnicos citados
        const ids = new Set<string>();
        list.forEach((r) => {
          if (r.tecnico_id) ids.add(r.tecnico_id);
          if (r.tecnico_id_anterior) ids.add(r.tecnico_id_anterior);
        });
        if (ids.size > 0) {
          const { data: tecs } = await supabase
            .from("tecnicos")
            .select("id, nome")
            .in("id", Array.from(ids));
          if (!alive) return;
          const map: Record<string, string> = {};
          (tecs ?? []).forEach((t: any) => (map[t.id] = t.nome));
          setTecMap(map);
        }
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Erro ao carregar histórico");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [osId]);

  if (!osId) return null;

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive p-3 rounded-md border border-destructive/30 bg-destructive/5">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        Nenhum evento registrado para esta OS ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const meta = EVENT_LABELS[r.tipo_evento] || {
          label: r.tipo_evento,
          color: "bg-muted text-muted-foreground",
        };
        const tecNovo = r.tecnico_id ? tecMap[r.tecnico_id] || r.tecnico_id.slice(0, 8) : null;
        const tecAnt = r.tecnico_id_anterior
          ? tecMap[r.tecnico_id_anterior] || r.tecnico_id_anterior.slice(0, 8)
          : null;

        return (
          <div
            key={r.id}
            className="rounded-lg border bg-card p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge className={meta.color + " border-0 font-medium"}>{meta.label}</Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> {fmtDate(r.created_at)}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span>
                por{" "}
                <span className="text-foreground font-medium">
                  {r.alterado_por_nome || "Sistema"}
                </span>
              </span>
            </div>

            {(tecNovo || tecAnt) && (
              <div className="text-sm flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">Técnico:</span>
                {tecAnt && (
                  <>
                    <span className="line-through text-muted-foreground">{tecAnt}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </>
                )}
                <span className="font-medium">{tecNovo || "—"}</span>
                {r.tecnico_user_id && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    user_id: {r.tecnico_user_id.slice(0, 8)}
                  </span>
                )}
              </div>
            )}

            {r.status_anterior && r.status_novo && r.status_anterior !== r.status_novo && (
              <div className="text-sm flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">Status:</span>
                <span className="line-through text-muted-foreground">{r.status_anterior}</span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{r.status_novo}</span>
              </div>
            )}

            {r.alteracoes &&
              Object.keys(r.alteracoes).length > 0 &&
              (() => {
                const CHAVES_IGNORADAS = ["empresa_id", "created_at", "updated_at", "tecnico_user_id", "id"];
                const CHAVE_LABELS: Record<string, string> = {
                  cliente_id: "Cliente",
                  tecnico_id: "Técnico",
                  analista_id: "Analista",
                  titulo: "Título",
                  descricao_problema: "Descrição do Problema",
                  valor: "Valor",
                  valor_adiantado: "Valor Adiantado",
                  custo_viagem: "Custo de Viagem",
                  km_viagem: "KM da Viagem",
                  dados_adicionais: "Dados Adicionais",
                  pendencias_detalhes: "Detalhes da Pendência",
                  endereco_servico: "Endereço do Serviço",
                  data_agendamento: "Data de Agendamento",
                  horario_atendimento: "Horário",
                  data_hora_inicio: "Início",
                  data_hora_fim: "Fim",
                  equipamentos_cliente_ids: "Equipamentos",
                  recebido_cliente: "Recebido do Cliente",
                  despesas: "Despesas",
                  descricao_adiantamento: "Descrição Adiantamento"
                };

                function fmtHistValue(k: string, val: any): string {
                  if (val === null || val === undefined) return "—";
                  if (["valor", "valor_adiantado", "custo_viagem"].includes(k)) {
                    return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                  }
                  if (typeof val === "boolean") return val ? "Sim" : "Não";
                  if (["data_agendamento", "data_hora_inicio", "data_hora_fim"].includes(k) && typeof val === "string") {
                    if (val.length === 10) {
                      const p = val.split("-");
                      if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
                    }
                    if (val.includes("T")) return fmtDate(val);
                  }
                  if (typeof val === "object") return Array.isArray(val) ? `${val.length} itens` : "Dados editados";
                  return String(val);
                }

                const outros = Object.entries(r.alteracoes).filter(
                  ([k]) => !["tecnico_id", "tecnico_user_id", "status"].includes(k) && !CHAVES_IGNORADAS.includes(k)
                );
                if (outros.length === 0) return null;
                return (
                  <div className="text-xs space-y-1 pt-1 border-t">
                    {outros.map(([k, v]: [string, any]) => {
                      const lbl = CHAVE_LABELS[k] || k.replace(/_/g, " ");
                      return (
                        <div key={k} className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-muted-foreground font-medium capitalize">{lbl}:</span>
                          {v && typeof v === "object" && "de" in v && "para" in v ? (
                            <>
                              <span className="line-through text-muted-foreground">
                                {fmtHistValue(k, v.de)}
                              </span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">{fmtHistValue(k, v.para)}</span>
                            </>
                          ) : (
                            <span className="font-medium">{fmtHistValue(k, v)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
          </div>
        );
      })}
    </div>
  );
}
