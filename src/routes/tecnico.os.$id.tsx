import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, MapPin, Receipt, Upload, Plus, FileText, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/tecnico/os/$id")({
  component: () => (
    <ProtectedRoute requireRole="tecnico">
      <TecnicoOSDetail />
    </ProtectedRoute>
  ),
});

function TecnicoOSDetail() {
  const { id } = Route.useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingDespesa, setIsAddingDespesa] = useState(false);
  const [descDespesa, setDescDespesa] = useState("");
  const [valorDespesa, setValorDespesa] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // 1. Fetch OS Details
  const { data: os, isLoading } = useQuery({
    queryKey: ["os_detalhe", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
          *,
          clientes (nome, telefone, email, endereco_completo, cidade)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch RAT / Galeria
  const { data: ratArquivos, isLoading: isLoadingRat } = useQuery({
    queryKey: ["os_rat_arquivos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rat_arquivos")
        .select("*")
        .eq("ordem_servico_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const despesasArray = Array.isArray(os?.despesas) ? os.despesas : [];

  const handleUpdateStatus = async (newStatus: string) => {
    if (newStatus === "concluido_tecnico") {
      if (!ratArquivos || ratArquivos.length === 0) {
        toast.error("É obrigatório preencher o RAT antes de concluir o serviço");
        return;
      }
    }
    try {
      setIsUpdatingStatus(true);
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status: newStatus as any })
        .eq("id", id);

      if (error) throw error;
      toast.success("Status atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["os_detalhe", id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddDespesa = async () => {
    if (!descDespesa || !valorDespesa) return toast.error("Preencha descrição e valor.");
    const novoValor = parseFloat(valorDespesa.replace(",", "."));
    if (isNaN(novoValor)) return toast.error("Valor inválido.");

    try {
      setIsAddingDespesa(true);
      const novaDespesa = {
        id: crypto.randomUUID(),
        descricao: descDespesa,
        valor: novoValor,
        data: new Date().toISOString()
      };
      
      const novasDespesas = [...despesasArray, novaDespesa];
      
      const { error } = await supabase
        .from("ordens_servico")
        .update({ despesas: novasDespesas as any })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Despesa adicionada!");
      setDescDespesa("");
      setValorDespesa("");
      queryClient.invalidateQueries({ queryKey: ["os_detalhe", id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsAddingDespesa(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      // Upload para storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('rats')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      // Pegar URL pública (ou apenas salvar o path se o bucket for privado, usaremos publicURL para simplicidade)
      const { data: publicUrlData } = supabase.storage
        .from('rats')
        .getPublicUrl(fileName);

      // Inserir registro em rat_arquivos
      const { error: dbError } = await supabase
        .from('rat_arquivos')
        .insert({
          ordem_servico_id: id,
          nome_arquivo: file.name,
          arquivo_url: publicUrlData.publicUrl
        });

      if (dbError) throw dbError;
      
      toast.success("Arquivo enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["os_rat_arquivos", id] });
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao enviar arquivo: " + error.message);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  if (isLoading) {
    return (
      <TecnicoLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </TecnicoLayout>
    );
  }

  if (!os) {
    return (
      <TecnicoLayout>
        <div className="p-6 text-center text-muted-foreground">OS não encontrada.</div>
      </TecnicoLayout>
    );
  }

  const cliente = os.clientes as any;

  return (
    <TecnicoLayout>
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl px-4 py-3 flex items-center gap-3 border-b border-border/50 shadow-sm">
        <Link
          to="/tecnico/os"
          className="w-10 h-10 rounded-xl glass flex items-center justify-center active:scale-95 transition text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="text-[10px] text-muted-foreground font-semibold tracking-wider">
            {os.id.split('-')[0].toUpperCase()}
          </div>
          <div className="font-bold text-sm leading-tight line-clamp-1">{os.titulo}</div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Status */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Status da OS</h2>
          <Select value={os.status} onValueChange={handleUpdateStatus} disabled={isUpdatingStatus}>
            <SelectTrigger className="w-full h-12 rounded-xl font-medium bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agendamento">Agendamento (Pendente)</SelectItem>
              <SelectItem value="em_andamento">Em Andamento (No local)</SelectItem>
              <SelectItem value="concluido_tecnico">Concluído Técnico (Aguardando Aprovação)</SelectItem>
              <SelectItem value="pendencia">Pendência (Falta algo)</SelectItem>
              {profile?.role !== "tecnico" && (
                <SelectItem value="concluido">Concluído</SelectItem>
              )}
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Detalhes do Cliente e Problema */}
        <section className="space-y-3">
          <Card className="p-4 rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
            <h3 className="font-bold mb-1">{cliente?.nome || "Cliente não informado"}</h3>
            {cliente?.endereco_completo ? (
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    {cliente.endereco_completo}{cliente.cidade ? ` - ${cliente.cidade}` : ""}
                  </span>
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cliente.endereco_completo}${cliente.cidade ? `, ${cliente.cidade}` : ""}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button className="w-full font-bold shadow-[var(--shadow-glow)] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" size="lg">
                    <MapPin className="w-5 h-5 mr-2" />
                    Iniciar Rota no Mapa
                  </Button>
                </a>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2 bg-muted/30 p-2 rounded-lg">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>Endereço não cadastrado</span>
              </div>
            )}
            {(cliente?.telefone || cliente?.email) && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                {cliente?.telefone && <div>📞 {cliente.telefone}</div>}
                {cliente?.email && <div>✉️ {cliente.email}</div>}
              </div>
            )}
            
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Problema Relatado</h4>
              <p className="text-sm">{os.descricao_problema}</p>
            </div>
          </Card>
        </section>

        {/* Despesas */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Despesas Reembolsáveis
            </h2>
            <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
              Total: R$ {despesasArray.reduce((acc: number, d: any) => acc + Number(d?.valor || 0), 0).toFixed(2).replace('.', ',')}
            </div>
          </div>
          <Card className="p-4 rounded-2xl border-border/60 shadow-[var(--shadow-card)] space-y-4">
            {despesasArray.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhuma despesa lançada.</p>
            ) : (
              <div className="space-y-2">
                {despesasArray.map((d: any) => (
                  <div key={d.id} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <span>{d.descricao}</span>
                    <span className="font-bold text-emerald-500">R$ {Number(d.valor).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="pt-2 border-t border-border/50 flex gap-2 items-center">
              <Input 
                placeholder="Ex: Pedágio" 
                className="h-9 text-xs" 
                value={descDespesa} 
                onChange={(e) => setDescDespesa(e.target.value)} 
              />
              <Input 
                placeholder="0,00" 
                type="number" 
                className="h-9 w-20 text-xs" 
                value={valorDespesa} 
                onChange={(e) => setValorDespesa(e.target.value)} 
              />
              <Button 
                size="icon" 
                className="h-9 w-9 shrink-0" 
                onClick={handleAddDespesa} 
                disabled={isAddingDespesa}
              >
                {isAddingDespesa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        </section>

        {/* Galeria / RAT */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Upload className="w-4 h-4" /> Galeria de Evidências (RAT)
            </h2>
          </div>
          <Card className="p-4 rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-6 bg-muted/20 relative overflow-hidden transition-all hover:bg-muted/40">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
              )}
              <p className="text-xs text-muted-foreground text-center">
                {isUploading ? "Enviando arquivo..." : "Toque aqui para anexar fotos ou RAT."}
              </p>
            </div>

            <div className="space-y-2">
              {isLoadingRat ? (
                <div className="flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
              ) : !ratArquivos || ratArquivos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">Nenhum arquivo anexado.</p>
              ) : (
                ratArquivos.map((arq) => (
                  <div key={arq.id} className="flex items-center justify-between bg-background p-2 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-medium truncate">{arq.nome_arquivo}</span>
                    </div>
                    <a href={arq.arquivo_url} target="_blank" rel="noreferrer" className="p-2 text-muted-foreground hover:text-primary transition">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>
      </div>
    </TecnicoLayout>
  );
}
