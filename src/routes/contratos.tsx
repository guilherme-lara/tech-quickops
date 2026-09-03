import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { FileSignature, Download, Search, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contratos")({
  head: () => ({
    meta: [
      { title: "Contratos da Equipe | QuickOps" },
      {
        name: "description",
        content:
          "Central de contratos dos técnicos: veja todos os documentos enviados, com data de upload e download direto.",
      },
      { property: "og:title", content: "Contratos da Equipe | QuickOps" },
      {
        property: "og:description",
        content: "Todos os contratos dos técnicos em um só lugar, com data de envio e download seguro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedRoute allowedRoles={["gestor", "admin", "superadmin"]}>
      <ContratosPage />
    </ProtectedRoute>
  ),
});

interface ContratoRow {
  tecnicoId: string;
  tecnicoNome: string;
  path: string;
  nomeArquivo: string;
  uploadedAt: string | null;
  tamanho: number | null;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function ContratosPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [busca, setBusca] = useState("");

  const contratosQ = useQuery({
    queryKey: ["contratos_equipe", empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<ContratoRow[]> => {
      const { data: tecnicos, error } = await supabase
        .from("tecnicos")
        .select("id, nome, dados_adicionais")
        .eq("empresa_id", empresaId as string)
        .order("nome");
      if (error) throw error;

      // Metadados de upload vindos do Storage (data real do envio)
      const { data: arquivos } = await supabase.storage
        .from("contratos")
        .list(empresaId as string, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });

      const metaPorNome = new Map<string, { created_at?: string; size?: number }>();
      (arquivos ?? []).forEach((f: any) => {
        metaPorNome.set(f.name, { created_at: f.created_at, size: f.metadata?.size });
      });

      const rows: ContratoRow[] = [];
      (tecnicos ?? []).forEach((t: any) => {
        const dados = (t.dados_adicionais ?? {}) as Record<string, any>;
        const path: string | undefined = dados.contrato_arquivo;
        if (!path) return;
        const fileName = path.split("/").pop() ?? path;
        const meta = metaPorNome.get(fileName);
        // Fallback: o nome do arquivo carrega o timestamp do upload (contrato_<ms>.ext)
        const tsMatch = fileName.match(/contrato_(\d{10,})\./);
        const fallback = tsMatch ? new Date(Number(tsMatch[1])).toISOString() : null;
        rows.push({
          tecnicoId: t.id,
          tecnicoNome: t.nome,
          path,
          nomeArquivo: dados.contrato_nome || fileName,
          uploadedAt: meta?.created_at ?? fallback,
          tamanho: meta?.size ?? null,
        });
      });

      return rows.sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
    },
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const list = contratosQ.data ?? [];
    if (!termo) return list;
    return list.filter(
      (c) => c.tecnicoNome.toLowerCase().includes(termo) || c.nomeArquivo.toLowerCase().includes(termo),
    );
  }, [contratosQ.data, busca]);

  const abrir = async (path: string, download = false) => {
    const { data, error } = await supabase.storage
      .from("contratos")
      .createSignedUrl(path, 60 * 10, download ? { download: true } : undefined);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível gerar o link do contrato");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <GestorLayout>
      <div className="space-y-6">
        <div className="rounded-3xl bg-card p-5 md:p-6 border border-border/60 shadow-[var(--shadow-card)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" /> Contratos da Equipe
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os contratos enviados, com data de upload e download direto — sem precisar abrir o
              cadastro do técnico.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por técnico ou arquivo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>
        </div>

        <div className="rounded-3xl bg-card p-4 md:p-6 border border-border/60 shadow-[var(--shadow-card)]">
          {contratosQ.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : contratosQ.error ? (
            <p className="text-sm text-destructive py-8 text-center">
              Erro ao carregar contratos: {(contratosQ.error as Error).message}
            </p>
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={FileSignature}
              title="Nenhum contrato encontrado"
              description="Anexe contratos na aba 'Contrato' do cadastro de cada técnico para vê-los listados aqui."
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                {filtrados.length} contrato(s) encontrado(s)
              </p>
              <div className="space-y-2">
                {filtrados.map((c) => (
                  <div
                    key={c.tecnicoId + c.path}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileSignature className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.tecnicoNome}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.nomeArquivo}</p>
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                      <div>
                        {c.uploadedAt ? new Date(c.uploadedAt).toLocaleString("pt-BR") : "Data indisponível"}
                      </div>
                      <div className="text-[10px]">{formatBytes(c.tamanho)}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => abrir(c.path)}>
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver
                      </Button>
                      <Button size="sm" className="h-9 rounded-xl" onClick={() => abrir(c.path, true)}>
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </GestorLayout>
  );
}
