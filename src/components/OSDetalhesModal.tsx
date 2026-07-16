import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, User, ClipboardList, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface Props {
  osId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  agendamento: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  em_andamento: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  em_deslocamento: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  concluido_tecnico: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  faturado: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pendencia: "bg-destructive/10 text-destructive border-destructive/20",
  cancelado: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  agendamento: "Agendado",
  em_andamento: "Em Andamento",
  em_deslocamento: "Em Deslocamento",
  concluido_tecnico: "Aguardando Revisão",
  faturado: "Faturado",
  pendencia: "Pendência",
  cancelado: "Cancelado",
};

export function OSDetalhesModal({ osId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;

  const { data: os, isLoading } = useQuery({
    queryKey: ["os_detalhes", osId],
    enabled: !!osId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
          *,
          clientes (nome),
          tecnicos (id, nome),
          os_historico (created_at, status_novo)
        `)
        .eq("id", osId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tecnicos } = useQuery({
    queryKey: ["tecnicos_ativos", empresaId],
    enabled: !!empresaId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tecnicos")
        .select("id, nome")
        .eq("empresa_id", empresaId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("ordens_servico")
        .update(updates)
        .eq("id", osId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordem de serviço atualizada com sucesso");
      qc.invalidateQueries({ queryKey: ["os_detalhes", osId] });
      qc.invalidateQueries({ queryKey: ["fila_revisao"] });
      qc.invalidateQueries({ queryKey: ["radar_equipe"] });
      qc.invalidateQueries({ queryKey: ["kpis_operacionais"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Erro ao atualizar OS");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalhes da OS {os?.numero ? `#${os.numero}` : ""}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !os ? (
          <div className="py-8 text-center text-muted-foreground">OS não encontrada.</div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" /> Cliente
                </span>
                <p className="font-medium">{os.clientes?.nome || "Não informado"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Criada em
                </span>
                <p className="font-medium">
                  {new Date(os.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Descrição do Problema
              </span>
              <p className="text-sm bg-muted/50 p-3 rounded-lg border border-border/50 min-h-[60px] whitespace-pre-wrap">
                {os.descricao_problema || "Sem descrição"}
              </p>
            </div>

            {/* Alerta de Deslocamento */}
            {os.status === "em_deslocamento" && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-orange-600">Técnico em Trânsito</h4>
                    <p className="text-xs text-orange-600/80">
                      Iniciado em: {(() => {
                        const logs = os.os_historico || [];
                        const logDeslocamento = logs
                          .filter((l: any) => l.status_novo === 'em_deslocamento')
                          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                        if (!logDeslocamento) return "Desconhecido";
                        const d = new Date(logDeslocamento.created_at);
                        return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ações Rápidas */}
            <div className="bg-card border border-border/50 rounded-xl p-4 space-y-4 shadow-sm">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Ações Rápidas
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status Atual</Label>
                  <Select
                    value={os.status}
                    onValueChange={(val) => updateMutation.mutate({ status: val })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o status">
                        <Badge className={`font-normal ${statusColors[os.status] || ""}`}>
                          {statusLabels[os.status] || os.status}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <Badge className={`font-normal ${statusColors[key] || ""}`}>
                            {label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Técnico Responsável</Label>
                  <Select
                    value={os.tecnico_id || "none"}
                    onValueChange={(val) => updateMutation.mutate({ tecnico_id: val === "none" ? null : val })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Atribuir Técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem técnico</SelectItem>
                      {tecnicos?.map((tec) => (
                        <SelectItem key={tec.id} value={tec.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-[10px]">
                              {tec.nome.substring(0, 2).toUpperCase()}
                            </div>
                            {tec.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
