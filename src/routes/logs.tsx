import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { useStore } from "@/lib/mock-store";
import { useAuth } from "@/lib/auth-context";
import { MesAnoFilter } from "@/components/MesAnoFilter";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Clock, Filter } from "lucide-react";

export const Route = createFileRoute("/logs")({
  component: () => (
    <ProtectedRoute>
      <LogsPage />
    </ProtectedRoute>
  ),
});

interface LogEntry {
  id: string;
  created_at: string;
  tipo: string;
  descricao: string;
  usuario_nome: string;
}

function LogsPage() {
  const { profile } = useAuth();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [termoBusca, setTermoBusca] = useState<string>("");
  const [termoBuscaDebounced, setTermoBuscaDebounced] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setTermoBuscaDebounced(termoBusca);
    }, 300);
    return () => clearTimeout(timer);
  }, [termoBusca]);

  const logsQ = useQuery({
    queryKey: ["logs_administrativos", profile?.empresa_id, filtroTipo, dataInicio, dataFim, termoBuscaDebounced],
    enabled: !!profile && profile.role !== "tecnico",
    queryFn: async (): Promise<LogEntry[]> => {
      let query = (supabase.from("logs_administrativos" as any) as any)
        .select("*")
        .eq("empresa_id", profile?.empresa_id)
        .order("created_at", { ascending: false });

      if (filtroTipo !== "todos") {
        query = query.eq("tipo", filtroTipo);
      }

      if (dataInicio) {
        query = query.gte("created_at", dataInicio);
      }

      if (dataFim) {
        query = query.lte("created_at", dataFim + "T23:59:59");
      }

      if (termoBuscaDebounced) {
        query = query.ilike("descricao", `%${termoBuscaDebounced}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as LogEntry[];
    },
  });

  const limparFiltros = () => {
    setFiltroTipo("todos");
    setDataInicio("");
    setDataFim("");
    setTermoBusca("");
    setTermoBuscaDebounced("");
  };

  return (
    <GestorLayout>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Logs Administrativos</h1>
            <p className="text-xs text-muted-foreground">Histórico completo de ações do sistema</p>
          </div>
        </div>
        <MesAnoFilter />
      </div>

      {/* Filtros */}
      <div className="rounded-3xl bg-card p-4 md:p-6 shadow-[var(--shadow-card)] border border-border/60 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Buscar nos logs</Label>
            <Input
              placeholder="Pesquisar por descrição..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tipo de Evento</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="os_criada">OS Criada</SelectItem>
                <SelectItem value="os_status_alterado">Status Alterado</SelectItem>
                <SelectItem value="os_tecnico_alterado">Técnico Alterado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={limparFiltros}
              className="h-9 text-sm w-full"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="rounded-3xl bg-card p-4 md:p-6 shadow-[var(--shadow-card)] border border-border/60">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Histórico de Ações
            </h3>
            <p className="text-xs text-muted-foreground">
              {logsQ.data?.length ?? 0} registro(s) encontrado(s)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {logsQ.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : logsQ.error ? (
            <div className="text-sm text-destructive py-8 text-center">
              Erro ao carregar logs: {(logsQ.error as Error).message}
            </div>
          ) : (logsQ.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              Nenhum log encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-2">
              {(logsQ.data ?? []).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-2xl hover:bg-muted/40 transition-colors border border-border/40"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-relaxed mb-1">
                      {log.descricao}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{log.usuario_nome}</span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-muted text-muted-foreground">
                      {log.tipo.replace("os_", "").replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GestorLayout>
  );
}