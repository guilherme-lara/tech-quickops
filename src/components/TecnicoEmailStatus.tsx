import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MailCheck, MailWarning, Clock } from "lucide-react";

type EmailRow = {
  id: string;
  destinatario: string;
  assunto: string;
  status: string | null;
  tipo: string | null;
  erro_mensagem: string | null;
  created_at: string | null;
  enviado_at: string | null;
};

const FILA_PARADA_MIN = 15;

function statusBadge(status: string | null) {
  const s = (status || "pendente").toLowerCase();
  if (s === "enviado") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Enviado</Badge>;
  if (s === "erro" || s === "falha") return <Badge variant="destructive">Falhou</Badge>;
  return <Badge variant="secondary">Na fila</Badge>;
}

/**
 * Mostra o status dos e-mails de gestão e do técnico.
 * Observação: o provedor não devolve confirmação de abertura, então
 * sinalizamos "entrega não confirmada" quando o e-mail continua na fila.
 */
export function TecnicoEmailStatus({
  empresaId,
  emails,
}: {
  empresaId?: string;
  emails: string[];
}) {
  const alvos = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);

  const { data, isLoading } = useQuery({
    queryKey: ["tecnico_emails", empresaId, alvos.join("|")],
    enabled: !!empresaId,
    queryFn: async () => {
      const base = supabase
        .from("email_queue")
        .select("id, destinatario, assunto, status, tipo, erro_mensagem, created_at, enviado_at")
        .eq("empresa_id", empresaId!)
        .order("created_at", { ascending: false })
        .limit(200);

      const { data: rows, error } = await base;
      if (error) throw error;
      const all = (rows ?? []) as EmailRow[];
      const doTecnico = alvos.length
        ? all.filter((r) => alvos.includes((r.destinatario || "").toLowerCase()))
        : [];
      const pendentesFila = all.filter((r) => (r.status || "pendente") === "pendente");
      const maisAntigoPendente = pendentesFila.length
        ? Math.min(...pendentesFila.map((r) => new Date(r.created_at || Date.now()).getTime()))
        : null;
      return {
        doTecnico: doTecnico.slice(0, 10),
        totalPendentes: pendentesFila.length,
        filaParada:
          maisAntigoPendente !== null &&
          Date.now() - maisAntigoPendente > FILA_PARADA_MIN * 60_000,
      };
    },
  });

  if (!alvos.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Cadastre um e-mail de notificações para acompanhar os envios deste técnico.
      </p>
    );
  }

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;

  return (
    <div className="space-y-3">
      {data?.filaParada && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            A fila de e-mails parece parada: existem {data.totalPendentes} mensagens aguardando há mais
            de {FILA_PARADA_MIN} minutos. O processamento automático roda a cada hora.
          </span>
        </div>
      )}

      {!data?.doTecnico.length ? (
        <p className="text-xs text-muted-foreground">
          Nenhum e-mail registrado para {alvos.join(", ")} ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.doTecnico.map((e) => {
            const pendente = (e.status || "pendente") === "pendente";
            const falhou = ["erro", "falha"].includes((e.status || "").toLowerCase());
            return (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.assunto}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.destinatario} ·{" "}
                    {new Date(e.enviado_at || e.created_at || Date.now()).toLocaleString("pt-BR")}
                  </p>
                  {falhou && e.erro_mensagem && (
                    <p className="text-xs text-destructive mt-0.5">{e.erro_mensagem}</p>
                  )}
                  {pendente && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="w-3 h-3" /> Entrega ainda não confirmada
                    </p>
                  )}
                  {!pendente && !falhou && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-600">
                      <MailCheck className="w-3 h-3" /> Entregue ao provedor
                    </p>
                  )}
                  {falhou && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                      <MailWarning className="w-3 h-3" /> Não foi possível entregar
                    </p>
                  )}
                </div>
                {statusBadge(e.status)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
