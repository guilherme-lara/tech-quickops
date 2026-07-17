import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, MapPin, Receipt, Upload, Plus, FileText, Download, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrivateFileLink } from "@/components/PrivateFileLink";
import { compressImage } from "@/lib/image-compressor";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/tecnico/os/$id")({
  component: () => (
    <ProtectedRoute allowedRoles={['tecnico']}>
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
          clientes (nome, telefone, email, endereco_completo, cidade, modelo_rat_url),
          analista:analistas_cliente(nome, whatsapp)
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
    if (newStatus === "concluido_tecnico" && profile?.role === "tecnico") {
      if (!ratArquivos || ratArquivos.length < 4) {
        toast.error("É necessário enviar a RAT e pelo menos 3 fotos evidenciando o serviço para concluir.");
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

  const handleIniciarDeslocamento = async () => {
    try {
      setIsUpdatingStatus(true);
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status: "em_deslocamento" as any })
        .eq("id", id);

      if (error) throw error;
      toast.success("Deslocamento iniciado!");
      queryClient.invalidateQueries({ queryKey: ["os_detalhe", id] });
      
      if (os?.endereco_servico) {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(os.endereco_servico)}`;
        window.open(mapsUrl, "_blank");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmarChegada = async () => {
    try {
      setIsUpdatingStatus(true);
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status: "em_andamento" as any })
        .eq("id", id);

      if (error) throw error;
      toast.success("Check-in realizado! Serviço em andamento.");
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

  const handleSolicitarEndereco = async () => {
    try {
      setIsUpdatingStatus(true);
      const { error } = await supabase
        .from("ordens_servico")
        .update({ 
          status: "pendencia" as any, 
          pendencias_detalhes: "Técnico solicitou o endereço do serviço. Por favor, atualize o endereço da OS."
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Endereço solicitado! A OS foi marcada com pendência.");
      queryClient.invalidateQueries({ queryKey: ["os_detalhe", id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFileUpload = (tipo_arquivo: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      const finalFile = await compressImage(file);
      // Upload para storage
      const fileExt = finalFile.name.split('.').pop();
      const fileName = `${id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('rats')
        .upload(fileName, finalFile);
        
      if (uploadError) throw uploadError;

      // Inserir registro em rat_arquivos
      const { error: dbError } = await supabase
        .from('rat_arquivos')
        .insert({
          ordem_servico_id: id,
          nome_arquivo: file.name,
          arquivo_url: fileName,
          tipo_arquivo: tipo_arquivo,
          enviado_por_role: 'tecnico'
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

  const isConcluidoReal = os.status === "Concluído" || os.status === "concluido";
  const isConcluidoTecnico = os.status === "Concluído Técnico" || os.status === "concluido_tecnico";
  const isAnyConcluido = isConcluidoReal || isConcluidoTecnico;

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
        {/* Detalhes do Cliente e Problema */}
        <section className="space-y-3">
          <Card className="p-4 rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
            <h3 className="font-bold mb-1">{cliente?.nome || "Cliente não informado"}</h3>
            {os.endereco_servico ? (
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    {os.endereco_servico}
                  </span>
                </div>
                {os.status === "em_deslocamento" ? (
                  <div className="flex flex-col gap-2 w-full">
                    <Button 
                      className="w-full font-bold shadow-[var(--shadow-glow)] bg-emerald-600 hover:bg-emerald-700 text-white" 
                      size="lg"
                      onClick={handleConfirmarChegada}
                      disabled={isUpdatingStatus}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Confirmar Chegada (Check-in)
                    </Button>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(os.endereco_servico)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full font-semibold" size="lg">
                        <MapPin className="w-5 h-5 mr-2" />
                        Ver Rota no Mapa
                      </Button>
                    </a>
                  </div>
                ) : os.status === "agendamento" || os.status === "pendencia" ? (
                  <Button 
                    className="w-full font-bold shadow-[var(--shadow-glow)] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" 
                    size="lg"
                    onClick={handleIniciarDeslocamento}
                    disabled={isUpdatingStatus}
                  >
                    <MapPin className="w-5 h-5 mr-2" />
                    Iniciar Rota no Mapa
                  </Button>
                ) : (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(os.endereco_servico)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full font-semibold" size="lg">
                      <MapPin className="w-5 h-5 mr-2" />
                      Ver no Mapa
                    </Button>
                  </a>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>Endereço do serviço não informado</span>
                </div>
                {os.status === "em_deslocamento" ? (
                  <Button 
                    className="w-full font-bold shadow-[var(--shadow-glow)] bg-emerald-600 hover:bg-emerald-700 text-white" 
                    size="lg"
                    onClick={handleConfirmarChegada}
                    disabled={isUpdatingStatus}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirmar Chegada (Check-in)
                  </Button>
                ) : os.status === "agendamento" || os.status === "pendencia" ? (
                  <div className="flex flex-col gap-2 w-full">
                    <Button 
                      className="w-full font-bold shadow-[var(--shadow-glow)] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" 
                      size="lg"
                      onClick={handleIniciarDeslocamento}
                      disabled={isUpdatingStatus}
                    >
                      <MapPin className="w-5 h-5 mr-2" />
                      Iniciar Deslocamento (Sem Endereço)
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 font-semibold"
                      onClick={handleSolicitarEndereco}
                      disabled={isUpdatingStatus}
                    >
                      Solicitar Endereço ao Gestor
                    </Button>
                  </div>
                ) : null}
                {os.analista?.whatsapp && (
                  <a
                    href={`https://wa.me/55${os.analista.whatsapp.replace(/\D/g, "")}?text=Olá,%20sou%20técnico%20da%20OS%20${os.numero}%20e%20preciso%20de%20ajuda.`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex w-full"
                  >
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                      </svg>
                      Falar com Suporte ({os.analista.nome})
                    </Button>
                  </a>
                )}
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

        {/* Documentos (RAT / PDFs) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" /> Documentos (RAT / PDFs)
            </h2>
          </div>
          <Card className="p-4 rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
            {cliente?.modelo_rat_url && (
              <div className="mb-4">
                <PrivateFileLink urlOrPath={cliente.modelo_rat_url} bucket="rats">
                  <Button variant="outline" className="w-full border-primary/50 text-primary hover:bg-primary/5">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar RAT em Branco (Modelo do Cliente)
                  </Button>
                </PrivateFileLink>
              </div>
            )}
            <div className="mb-4 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-6 bg-muted/20 relative overflow-hidden transition-all hover:bg-muted/40">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileUpload('rat')}
                accept=".pdf,.doc,.docx"
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
              )}
              <p className="text-xs text-muted-foreground text-center">
                {isUploading ? "Enviando arquivo..." : "Toque aqui para anexar RAT preenchida ou documento."}
              </p>
            </div>

            <div className="space-y-2">
              {isLoadingRat ? (
                <div className="flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
              ) : !ratArquivos || ratArquivos.filter(a => a.tipo_arquivo === 'rat' || a.tipo_arquivo === 'rat_padrao' || (a.tipo_arquivo !== 'foto' && a.tipo_arquivo !== 'evidencia' && a.nome_arquivo.includes('.pdf'))).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">Nenhum documento anexado.</p>
              ) : (
                ratArquivos
                  .filter(a => a.tipo_arquivo === 'rat' || a.tipo_arquivo === 'rat_padrao' || (a.tipo_arquivo !== 'foto' && a.tipo_arquivo !== 'evidencia' && a.nome_arquivo.includes('.pdf')))
                  .map((arq) => (
                  <div key={arq.id} className="flex flex-col bg-background p-2 rounded-lg border border-border/50 gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-medium truncate">{arq.nome_arquivo}</span>
                      </div>
                      <PrivateFileLink urlOrPath={arq.arquivo_url} bucket="rats" className="p-2 text-muted-foreground hover:text-primary transition">
                        <Download className="w-4 h-4" />
                      </PrivateFileLink>
                    </div>
                    <span className="text-[10px] text-muted-foreground opacity-70 ml-6">
                      Enviado por: {arq.enviado_por_role === 'gestor' ? 'Gestor (Modelo Padrão)' : 'Técnico'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        {/* Galeria / Fotos e Evidências */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Upload className="w-4 h-4" /> Fotos e Evidências
            </h2>
          </div>
          <Card className="p-4 rounded-2xl border-border/60 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-6 bg-muted/20 relative overflow-hidden transition-all hover:bg-muted/40">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileUpload('foto')}
                accept="image/*"
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
              )}
              <p className="text-xs text-muted-foreground text-center">
                {isUploading ? "Enviando arquivo..." : "Toque aqui para anexar fotos."}
              </p>
            </div>

            <div className="space-y-2">
              {isLoadingRat ? (
                <div className="flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
              ) : !ratArquivos || ratArquivos.filter(a => a.tipo_arquivo === 'foto' || a.tipo_arquivo === 'evidencia' || (!a.tipo_arquivo && !a.nome_arquivo.includes('.pdf'))).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">Nenhuma foto anexada.</p>
              ) : (
                ratArquivos
                  .filter(a => a.tipo_arquivo === 'foto' || a.tipo_arquivo === 'evidencia' || (!a.tipo_arquivo && !a.nome_arquivo.includes('.pdf')))
                  .map((arq) => (
                  <div key={arq.id} className="flex items-center justify-between bg-background p-2 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-medium truncate">{arq.nome_arquivo}</span>
                    </div>
                    <PrivateFileLink urlOrPath={arq.arquivo_url} bucket="rats" className="p-2 text-muted-foreground hover:text-primary transition">
                      <Download className="w-4 h-4" />
                    </PrivateFileLink>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        {/* Status */}
        {os.status === "concluido" || os.status === "Concluído" ? (
          <section className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-glow)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-emerald-600 mb-2">Ordem de Serviço Aprovada!</h2>
            <p className="text-sm text-muted-foreground mb-6">O gestor validou e finalizou esta OS. Obrigado pelo excelente trabalho!</p>
          </section>
        ) : (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">Status da OS</h2>
            <Select value={os.status} onValueChange={handleUpdateStatus} disabled={isUpdatingStatus}>
              <SelectTrigger className="w-full h-14 rounded-xl font-bold bg-primary text-primary-foreground border-0 shadow-lg shadow-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendamento">Agendamento (Pendente)</SelectItem>
                <SelectItem value="em_deslocamento">Em Deslocamento (A caminho)</SelectItem>
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
        )}
      </div>
    </TecnicoLayout>
  );
}
