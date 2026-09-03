import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eraser, Loader2, PenLine } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  osId: string;
  onSaved?: () => void;
}

/** Captura a assinatura do responsável no local e salva como imagem PNG anexa à OS. */
export function AssinaturaDialog({ open, onOpenChange, osId, onSaved }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [salvando, setSalvando] = useState(false);

  const limpar = () => sigRef.current?.clear();

  const salvar = async () => {
    if (!nome.trim()) return toast.error("Informe o nome do responsável.");
    if (!sigRef.current || sigRef.current.isEmpty()) return toast.error("Peça a assinatura no quadro.");

    try {
      setSalvando(true);
      const dataUrl = sigRef.current.getCanvas().toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${osId}/assinatura_${Date.now()}.png`;

      const { error: upErr } = await supabase.storage
        .from("rats")
        .upload(path, blob, { contentType: "image/png" });
      if (upErr) throw upErr;

      const nomeArquivo = `Assinatura - ${nome.trim()}${documento.trim() ? ` (${documento.trim()})` : ""}.png`;
      const { error: dbErr } = await supabase.from("rat_arquivos").insert({
        ordem_servico_id: osId,
        nome_arquivo: nomeArquivo,
        arquivo_url: path,
        tipo_arquivo: "assinatura",
        enviado_por_role: "tecnico",
      });
      if (dbErr) throw dbErr;

      toast.success("Assinatura salva! Você já pode baixá-la para anexar na RAT.");
      setNome("");
      setDocumento("");
      sigRef.current.clear();
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar assinatura: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !salvando && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-4 h-4" /> Assinatura do Responsável
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do responsável *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Quem recebeu o serviço" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Documento / matrícula (opcional)</Label>
            <Input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="CPF, RG ou matrícula" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assinatura *</Label>
            <div className="rounded-xl border-2 border-dashed border-border bg-background overflow-hidden">
              <SignatureCanvas
                ref={(r) => {
                  sigRef.current = r;
                }}
                penColor="#111"
                backgroundColor="#fff"
                canvasProps={{ className: "w-full h-40 touch-none" }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Peça para o responsável assinar com o dedo ou caneta na tela.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={limpar} disabled={salvando}>
              <Eraser className="w-4 h-4 mr-2" /> Limpar
            </Button>
            <Button className="flex-1" onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar assinatura
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
