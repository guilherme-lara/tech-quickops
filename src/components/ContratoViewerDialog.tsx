import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Download, ExternalLink } from "lucide-react";

interface Props {
  path: string | null;
  nome?: string;
  onClose: () => void;
}

/** Visualizador de contratos (PDF/imagem) dentro do próprio sistema. */
export function ContratoViewerDialog({ path, nome, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setUrl(null);
    setErro(null);
    if (!path) return;
    (async () => {
      const { data, error } = await supabase.storage.from("contratos").createSignedUrl(path, 60 * 30);
      if (!ativo) return;
      if (error || !data?.signedUrl) {
        setErro(error?.message || "Não foi possível gerar o link do contrato.");
        return;
      }
      setUrl(data.signedUrl);
    })();
    return () => {
      ativo = false;
    };
  }, [path]);

  const ext = (path ?? "").split(".").pop()?.toLowerCase() ?? "";
  const isImagem = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
  const isPdf = ext === "pdf";

  const baixar = async () => {
    if (!path) return;
    const { data } = await supabase.storage
      .from("contratos")
      .createSignedUrl(path, 60 * 10, { download: true });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Dialog open={!!path} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{nome || "Contrato"}</DialogTitle>
        </DialogHeader>

        <div className="h-[70vh] rounded-xl overflow-hidden border border-border/60 bg-muted/20">
          {erro ? (
            <p className="p-6 text-sm text-destructive">{erro}</p>
          ) : !url ? (
            <Skeleton className="w-full h-full" />
          ) : isImagem ? (
            <div className="w-full h-full overflow-auto flex items-start justify-center">
              <img src={url} alt={nome || "Contrato"} className="max-w-full" />
            </div>
          ) : isPdf ? (
            <object data={url} type="application/pdf" className="w-full h-full">
              <iframe src={url} title={nome || "Contrato"} className="w-full h-full" />
            </object>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              Este formato não pode ser exibido aqui. Use o botão Baixar para abrir o arquivo.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {url && (
            <Button variant="outline" onClick={() => window.open(url, "_blank")}>
              <ExternalLink className="w-4 h-4 mr-2" /> Abrir em nova aba
            </Button>
          )}
          <Button onClick={baixar}>
            <Download className="w-4 h-4 mr-2" /> Baixar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
