import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Search, CheckCircle2, Clock, AlertTriangle, Eye } from "lucide-react";

export const Route = createFileRoute("/emails")({
  head: () => ({
    meta: [
      { title: "E-mails Enviados | QuickOps" },
      {
        name: "description",
        content:
          "Histórico de e-mails de gestão e técnicos: data, destinatário, status de entrega e conteúdo enviado.",
      },
      { property: "og:title", content: "E-mails Enviados | QuickOps" },
      {
        property: "og:description",
        content: "Acompanhe cada e-mail disparado pelo sistema, com status e conteúdo completo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["gestor", "admin", "superadmin"]}>
      <EmailsPage />
    </ProtectedRoute>
  ),
});

interface EmailRow {
  id: string;
  destinatario: string;
  assunto: string;
  corpo: string;
  status: string | null;
  tipo: string | null;
  erro_mensagem: string | null;
  created_at: string | null;
  enviado_at: string | null;
  dados: any;
}

function statusMeta(status: string | null) {
  const s = (status ?? "pendente").toLowerCase();
  if (s === "enviado")
    return { label: "Enviado", cls: "text-success bg-success/10 border-success/20", icon: CheckCircle2 };
  if (s === "erro" || s === "falha")
    return { label: "Falhou", cls: "text-destructive bg-destructive/10 border-destructive/20", icon: AlertTriangle };
  return { label: "Pendente", cls: "text-warning bg-warning/20 border-warning/30", icon: Clock };
}

function EmailsPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [detalhe, setDetalhe] = useState<EmailRow | null>(null);

  const emailsQ = useQuery({
    queryKey: ["emails_enviados", empresaId],
    enabled: !!empresaId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<EmailRow[]> => {
      const { data, error } = await (supabase.from("email_queue" as any) as any)
        .select("id, destinatario, assunto, corpo, status, tipo, erro_mensagem, created_at, enviado_at, dados")
        .eq("empresa_id", empresaId as string)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as EmailRow[];
    },
  });

  const tipos = useMemo(() => {
    const set = new Set<string>();
    (emailsQ.data ?? []).forEach((e) => e.tipo && set.add(e.tipo));
    return Array.from(set).sort();
  }, [emailsQ.data]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (emailsQ.data ?? []).filter((e) => {
      if (filtroStatus !== "todos" && (e.status ?? "pendente") !== filtroStatus) return false;
      if (filtroTipo !== "todos" && e.tipo !== filtroTipo) return false;
      if (!termo) return true;
      return (
        e.destinatario?.toLowerCase().includes(termo) || e.assunto?.toLowerCase().includes(termo)
      );
    });
  }, [emailsQ.data, busca, filtroStatus, filtroTipo]);

  const stats = useMemo(() => {
    const list = emailsQ.data ?? [];
    return {
      total: list.length,
      enviados: list.filter((e) => e.status === "enviado").length,
      pendentes: list.filter((e) => !e.status || e.status === "pendente").length,
      erros: list.filter((e) => e.status === "erro" || e.status === "falha").length,
    };
  }, [emailsQ.data]);

  return (
    <GestorLayout>
      <div className="space-y-6">
        <div className="rounded-3xl bg-card p-5 md:p-6 border border-border/60 shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> E-mails Enviados
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Todos os disparos de gestão e técnicos: data, destinatário, status de entrega e conteúdo.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Enviados", value: stats.enviados },
            { label: "Pendentes", value: stats.pendentes },
            { label: "Com erro", value: stats.erros },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl bg-card p-5 border border-border/60 shadow-[var(--shadow-card)]">
              <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-card p-4 md:p-6 border border-border/60 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Destinatário ou assunto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 h-9 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-9 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="erro">Com erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tipo de e-mail</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-9 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {tipos.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {emailsQ.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : emailsQ.error ? (
            <p className="text-sm text-destructive py-8 text-center">
              Erro ao carregar e-mails: {(emailsQ.error as Error).message}
            </p>
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Nenhum e-mail encontrado"
              description="Assim que o sistema disparar notificações de OS, elas aparecem aqui com status de entrega."
            />
          ) : (
            <div className="space-y-2">
              {filtrados.map((e) => {
                const meta = statusMeta(e.status);
                return (
                  <div
                    key={e.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.cls}`}>
                      <meta.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{e.assunto}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {e.destinatario}
                        {e.tipo ? ` • ${e.tipo.replace(/_/g, " ")}` : ""}
                      </p>
                      {e.erro_mensagem && (
                        <p className="text-[11px] text-destructive truncate mt-0.5">{e.erro_mensagem}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                      <div>{e.created_at ? new Date(e.created_at).toLocaleString("pt-BR") : "—"}</div>
                      <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full border font-bold ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl shrink-0"
                      onClick={() => setDetalhe(e)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Conteúdo
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{detalhe?.assunto}</DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Destinatário</span>
                  <p className="font-medium break-all">{detalhe.destinatario}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium">{statusMeta(detalhe.status).label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Criado em</span>
                  <p className="font-medium">
                    {detalhe.created_at ? new Date(detalhe.created_at).toLocaleString("pt-BR") : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Enviado em</span>
                  <p className="font-medium">
                    {detalhe.enviado_at ? new Date(detalhe.enviado_at).toLocaleString("pt-BR") : "—"}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 p-4 bg-muted/20 text-sm break-words">
                <div dangerouslySetInnerHTML={{ __html: detalhe.corpo ?? "" }} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </GestorLayout>
  );
}
