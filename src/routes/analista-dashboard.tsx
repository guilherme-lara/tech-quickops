import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardCheck, 
  AlertTriangle, 
  Clock, 
  Users,
  Search,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { MesAnoFilter } from "@/components/MesAnoFilter";
import { useStore } from "@/lib/useData";

export const Route = createFileRoute("/analista-dashboard")({
  component: () => (
    <ProtectedRoute allowedRoles={['analista', 'admin', 'superadmin']}>
      <AnalistaDashboard />
    </ProtectedRoute>
  ),
});

function AnalistaDashboard() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [searchTerm, setSearchTerm] = useState("");
  const { osMonth, osYear } = useStore();

  // Gera dataInicio/dataFim com base no filtro de mês/ano
  const hasMonthFilter = osMonth > 0 && osYear > 0;
  const dataInicio = hasMonthFilter ? `${osYear}-${String(osMonth).padStart(2, "0")}-01` : null;
  const dataFim = hasMonthFilter
    ? (() => {
        const lastDay = new Date(osYear, osMonth, 0).getDate();
        return `${osYear}-${String(osMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      })()
    : null;

  // Query 1: KPIs Operacionais
  const operacionaisQ = useQuery({
    queryKey: ["kpis_operacionais", empresaId, dataInicio, dataFim],
    enabled: !!empresaId,
    queryFn: async () => {
      let query = supabase
        .from("ordens_servico")
        .select("id, status, tecnico_id", { count: "exact" })
        .eq("empresa_id", empresaId);

      if (dataInicio && dataFim) {
        query = query.gte("created_at", dataInicio).lte("created_at", dataFim + "T23:59:59.999Z");
      }

      const { data, error } = await query;
      if (error) throw error;

      const emAndamento = data.filter(os => os.status === "agendamento" || os.status === "em_andamento").length;
      const aguardandoRevisao = data.filter(os => os.status === "concluido_tecnico").length;
      const pendencias = data.filter(os => os.status === "pendencia").length;
      
      const tecnicosAtivos = new Set(data.filter(os => os.status === "em_andamento").map(os => os.tecnico_id));
      const tecnicosEmCampo = tecnicosAtivos.size;

      return { emAndamento, aguardandoRevisao, pendencias, tecnicosEmCampo };
    }
  });

  // Query 2: Fila de Revisão
  const filaRevisaoQ = useQuery({
    queryKey: ["fila_revisao", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
          id, identificador, status, data_agendamento,
          clientes (nome),
          tecnicos (nome)
        `)
        .eq("empresa_id", empresaId)
        .eq("status", "concluido_tecnico")
        .order("created_at", { ascending: true });
        
      if (error) throw error;
      return data;
    }
  });

  // Query 3: Radar da Equipe
  const radarEquipeQ = useQuery({
    queryKey: ["radar_equipe", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      // Pega todos os técnicos da empresa
      const { data: tecnicosData, error: tecError } = await supabase
        .from("tecnicos")
        .select("id, nome, ativo")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");
      if (tecError) throw tecError;

      // Pega OS ativa para os técnicos
      const { data: osData, error: osError } = await supabase
        .from("ordens_servico")
        .select("id, identificador, status, tecnico_id")
        .eq("empresa_id", empresaId)
        .in("status", ["em_andamento", "agendamento", "pendencia", "concluido_tecnico"]);
      if (osError) throw osError;

      const radar = tecnicosData.map(tec => {
        const osAtual = osData.find(o => o.tecnico_id === tec.id && o.status === "em_andamento") ||
                        osData.find(o => o.tecnico_id === tec.id);
        return {
          ...tec,
          osAtual
        };
      });

      return radar;
    }
  });

  return (
    <GestorLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Torre de Controle Operacional</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão focada na operação, técnicos e revisão de RATs.</p>
          </div>
          <MesAnoFilter />
        </div>

        {/* SECTION A: CARDS OPERACIONAIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OS em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {operacionaisQ.isLoading ? <Skeleton className="h-8 w-16" /> : operacionaisQ.data?.emAndamento}
              </div>
              <p className="text-xs text-muted-foreground">Agendadas e executando</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-warning/30 bg-warning/5 shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Revisão</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {operacionaisQ.isLoading ? <Skeleton className="h-8 w-16" /> : operacionaisQ.data?.aguardandoRevisao}
              </div>
              <p className="text-xs text-muted-foreground">Concluído pelo técnico</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-destructive/20 bg-destructive/5 shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendências</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {operacionaisQ.isLoading ? <Skeleton className="h-8 w-16" /> : operacionaisQ.data?.pendencias}
              </div>
              <p className="text-xs text-muted-foreground">Com problemas reportados</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Técnicos em Campo</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {operacionaisQ.isLoading ? <Skeleton className="h-8 w-16" /> : operacionaisQ.data?.tecnicosEmCampo}
              </div>
              <p className="text-xs text-muted-foreground">Executando serviço agora</p>
            </CardContent>
          </Card>
        </div>

        {/* SECTION B: LISTAS DE AÇÃO RÁPIDA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Fila de Revisão */}
          <Card className="rounded-3xl shadow-[var(--shadow-card)] overflow-hidden flex flex-col max-h-[600px]">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Fila de Revisão (RAT)
                    {filaRevisaoQ.data && filaRevisaoQ.data.length > 0 && (
                      <Badge variant="secondary" className="bg-warning text-warning-foreground">
                        {filaRevisaoQ.data.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Revise as evidências antes de faturar.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto">
              {filaRevisaoQ.isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : filaRevisaoQ.data?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <ClipboardCheck className="h-10 w-10 mb-2 opacity-20" />
                  <p>Nenhuma OS aguardando revisão no momento.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filaRevisaoQ.data?.map(os => (
                    <div key={os.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                      <div>
                        <div className="font-semibold text-sm">#{os.identificador} • {os.clientes?.nome}</div>
                        <div className="text-xs text-muted-foreground mt-1">Téc: {os.tecnicos?.nome}</div>
                      </div>
                      <Link to="/os">
                        <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg gap-1.5">
                          Ver OS <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Radar da Equipe */}
          <Card className="rounded-3xl shadow-[var(--shadow-card)] overflow-hidden flex flex-col max-h-[600px]">
            <CardHeader className="bg-muted/30 border-b border-border/50 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Radar da Equipe</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Status atual dos técnicos cadastrados.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto">
              {radarEquipeQ.isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {radarEquipeQ.data?.map(tec => (
                    <div key={tec.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                          {tec.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{tec.nome}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {tec.osAtual ? (
                              <span className={tec.osAtual.status === "em_andamento" ? "text-primary font-medium" : ""}>
                                OS #{tec.osAtual.identificador} ({tec.osAtual.status})
                              </span>
                            ) : (
                              <span>Ocioso</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {tec.osAtual && tec.osAtual.status === "em_andamento" && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </GestorLayout>
  );
}
