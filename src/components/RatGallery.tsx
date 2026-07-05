import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Paperclip,
  Loader2,
  UploadCloud,
  Trash2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStore } from "@/lib/useData";

interface RatArquivo {
  id: string;
  ordem_servico_id: string;
  nome_arquivo: string;
  arquivo_url: string;
  created_at: string;
}

export function RatGallery({ osId, trigger }: { osId: string; trigger?: React.ReactNode }) {
  const { user } = useStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: arquivos = [], isLoading } = useQuery({
    queryKey: ["rat_arquivos", osId],
    enabled: open && !!user,
    queryFn: async (): Promise<RatArquivo[]> => {
      const { data, error } = await supabase
        .from("rat_arquivos")
        .select("*")
        .eq("ordem_servico_id", osId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const uploadFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${osId}/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("rats").upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("rats").getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("rat_arquivos").insert({
        ordem_servico_id: osId,
        nome_arquivo: file.name,
        arquivo_url: publicUrlData.publicUrl,
      });

      if (insertError) throw insertError;

      toast.success("Arquivo enviado com sucesso!");
      qc.invalidateQueries({ queryKey: ["rat_arquivos", osId] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const deleteM = useMutation({
    mutationFn: async (arq: RatArquivo) => {
      // Tentar deletar do storage extraindo o path da URL pública
      try {
        const urlObj = new URL(arq.arquivo_url);
        // Exemplo: https://.../storage/v1/object/public/rats/osId/fileName
        const pathParts = urlObj.pathname.split("/rats/");
        if (pathParts.length > 1) {
          const filePath = decodeURIComponent(pathParts[1]);
          await supabase.storage.from("rats").remove([filePath]);
        }
      } catch (err) {
        console.error("Erro ao remover do storage", err);
      }

      // Deletar o registro
      const { error: deleteDbError } = await supabase
        .from("rat_arquivos")
        .delete()
        .eq("id", arq.id);
      if (deleteDbError) throw deleteDbError;
    },
    onSuccess: () => {
      toast.success("Arquivo excluído!");
      qc.invalidateQueries({ queryKey: ["rat_arquivos", osId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir arquivo"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
            <Paperclip className="w-3.5 h-3.5" /> Galeria RAT
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Galeria RAT (Anexos)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Dropzone Area */}
          <div className="border-2 border-dashed border-border/60 rounded-2xl p-6 text-center hover:bg-muted/40 transition-colors flex flex-col items-center justify-center relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept="image/*,.pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  uploadFile(e.target.files[0]);
                }
              }}
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex flex-col items-center text-muted-foreground">
                <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                <span className="text-sm font-medium">Enviando arquivo...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground pointer-events-none">
                <UploadCloud className="w-8 h-8 mb-2 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Clique ou arraste arquivos aqui
                </span>
                <span className="text-xs mt-1">Imagens e PDFs são suportados</span>
              </div>
            )}
          </div>

          {/* Gallery List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : arquivos.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhum arquivo anexado a esta OS.
              </p>
            ) : (
              arquivos.map((arq) => {
                const isImage = arq.nome_arquivo.match(/\.(jpeg|jpg|gif|png)$/i) != null;
                return (
                  <div
                    key={arq.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <div className="w-10 h-10 shrink-0 rounded-lg bg-background flex items-center justify-center border border-border/60">
                        {isImage ? (
                          <ImageIcon className="w-5 h-5 text-violet" />
                        ) : (
                          <FileText className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <a
                        href={arq.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline truncate"
                      >
                        {arq.nome_arquivo}
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (window.confirm("Excluir este arquivo?")) {
                          deleteM.mutate(arq);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
