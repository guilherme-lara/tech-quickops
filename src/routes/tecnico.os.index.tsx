import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { MapPin, Calendar, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";


import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/tecnico/os/")({
  component: () => (
    <ProtectedRoute allowedRoles={['tecnico']}>
      <TecnicoOSPage />
    </ProtectedRoute>
  ),
});

const statusColor: Record<string, string> = {
  agendamento: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  em_andamento: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300",
  em_deslocamento: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  concluido_tecnico: "bg-emerald-400/20 text-emerald-600 dark:text-emerald-400",
  pendencia: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  concluido: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-500",
  cancelado: "bg-red-500/10 text-red-600 dark:text-red-300",
};

const statusLabel: Record<string, string> = {
  agendamento: "Agendamento",
  em_andamento: "Em Andamento",
  em_deslocamento: "Em Deslocamento",
  concluido_tecnico: "Concluído Técnico",
  pendencia: "Pendência",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function TecnicoOSPage() {
  const { profile } = useAuth();

  // 1. Busca REAL no Supabase: Trazendo as OS do técnico + os dados do cliente vinculado
  const { data: minhasOS, isLoading } = useQuery({
    queryKey: ["minhas-os", profile?.id],
    queryFn: async () => {
      // 1. Resolve o ID real do técnico (técnicos antigos têm id próprio e auth ID em user_id)
      const { data: tecData } = await supabase
        .from("tecnicos")
        .select("id")
        .or(`id.eq.${profile?.id},user_id.eq.${profile?.id}`)
        .maybeSingle();

      const realTecnicoId = tecData?.id || profile?.id;

      // 2. Busca as OS do técnico + os dados do cliente vinculado
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(
          `
          *,
          clientes ( id, nome )
        `,
        )
        .eq("tecnico_id", realTecnicoId || "")
        .eq("empresa_id", profile?.empresa_id || "")
        .neq("status", "cancelado") // Não mostra as canceladas
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id, // Só roda a query se o perfil estiver carregado
  });



  return (
    <TecnicoLayout>
      <div className="mb-5 px-4 pt-4">
        <h1 className="text-2xl font-bold tracking-tight">Meus Chamados</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Buscando chamados..."
            : `Você tem ${minhasOS?.length || 0} serviços atribuídos.`}
        </p>
      </div>

      <div className="space-y-4 px-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !minhasOS || minhasOS.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
            Nenhuma OS atribuída a você no momento.
          </div>
        ) : (
          minhasOS.map((ordem: any) => {
            const isConcluido = ordem.status === "concluido";
            const label = statusLabel[ordem.status] ?? ordem.status;

            return (
              <Card
                key={ordem.id}
                className={`p-4 shadow-[var(--shadow-card)] border-border/60 rounded-2xl transition hover:shadow-[var(--shadow-glow)] ${isConcluido ? "opacity-70" : ""}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold text-muted-foreground tracking-wider">
                    {ordem.id.split("-")[0].toUpperCase()}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${statusColor[ordem.status] ?? statusColor.pendente}`}
                  >
                    {label}
                  </span>
                </div>

                <h3 className="font-semibold text-base mb-1">{ordem.titulo}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                  {ordem.descricao_problema || "Sem descrição adicional."}
                </p>

                <div className="space-y-2 mb-4 bg-muted/40 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <MapPin className="w-3.5 h-3.5 text-primary" />{" "}
                    {ordem.clientes?.nome || "Cliente não informado"}
                  </div>
                  {ordem.data_agendamento && (
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />{" "}
                      {new Date(ordem.data_agendamento).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>

                <Link to={`/tecnico/os/${ordem.id}`}>
                  <Button
                    className="w-full h-10 rounded-xl font-semibold"
                    variant={isConcluido ? "outline" : "default"}
                  >
                    {isConcluido ? "Ver Detalhes do Serviço" : "Acessar Serviço"}
                  </Button>
                </Link>
              </Card>
            );
          })
        )}
      </div>


    </TecnicoLayout>
  );
}
