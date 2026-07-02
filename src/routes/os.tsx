import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore, statusColor, OSStatus, OS, OS_PAGE_SIZE } from "@/lib/mock-store";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  User,
  HardHat,
  MoreVertical,
  Upload,
  ClipboardList,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Trash,
  Edit,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ImportarOSDialog } from "@/components/ImportarOSDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatGallery } from "@/components/RatGallery";
import { MesAnoFilter } from "@/components/MesAnoFilter";

type AnalistaOpt = { id: string; nome: string; whatsapp: string | null };

function useAnalistasByCliente(clienteId: string | undefined) {
  const [analistas, setAnalistas] = useState<AnalistaOpt[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!clienteId) {
      setAnalistas([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase.from("analistas_cliente" as any) as any)
        .select("id, nome, whatsapp")
        .eq("cliente_id", clienteId)
        .order("nome");
      if (!cancel) {
        if (!error) setAnalistas((data ?? []) as AnalistaOpt[]);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [clienteId]);
  return { analistas, loading };
}

export const Route = createFileRoute("/os")({
  component: () => (
    <ProtectedRoute>
      <OSPage />
    </ProtectedRoute>
  ),
});

const colunas: OSStatus[] = ["Orçamento", "Aprovado", "Em Execução", "Concluído", "Cancelado"];

function FiltrosBar() {
  const {
    osSearchCliente,
    setOsSearchCliente,
    osSearchTecnico,
    setOsSearchTecnico,
    osFilterStatus,
    setOsFilterStatus,
    tecnicos,
  } = useStore();
  const [searchTerm, setSearchTerm] = useState(osSearchCliente);

  // Debounce: atualiza o store apenas após 500ms de inatividade
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setOsSearchCliente(searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, setOsSearchCliente]);

  const hasFilters = osSearchCliente || osSearchTecnico || osFilterStatus;

  const limparFiltros = () => {
    setOsSearchCliente("");
    setOsSearchTecnico("");
    setOsFilterStatus("");
  };

  return (
    <div className="flex flex-col md:flex-row items-end gap-4 w-full mb-6">
      <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
        <Label className="text-xs text-muted-foreground">Cliente</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm rounded-xl"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
        <Label className="text-xs text-muted-foreground">Técnico</Label>
        <Select value={osSearchTecnico} onValueChange={setOsSearchTecnico}>
          <SelectTrigger className="h-9 text-sm rounded-xl">
            <SelectValue placeholder="Todos os técnicos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Todos os técnicos</SelectItem>
            {tecnicos.map((t) => (
              <SelectItem key={t.id} value={t.nome}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={osFilterStatus} onValueChange={setOsFilterStatus}>
          <SelectTrigger className="h-9 text-sm rounded-xl">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">Todos os status</SelectItem>
            {colunas.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={limparFiltros}
          className="h-9 rounded-xl gap-1.5"
        >
          <X className="w-4 h-4" /> Limpar filtros
        </Button>
      )}
    </div>
  );
}

function OSPage() {
  const {
    os,
    clientes,
    tecnicos,
    addOS,
    updateOS,
    loadingOS,
    osPage,
    osTotal,
    setOsPage,
    osSearchCliente,
    osSearchTecnico,
    osFilterStatus,
  } = useStore();
  const queryClient = useQueryClient();

  // Dispara a busca quando os filtros ou página mudam
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
  }, [osPage, osSearchCliente, osSearchTecnico, osFilterStatus, queryClient]);
  const totalPages = Math.max(1, Math.ceil(osTotal / OS_PAGE_SIZE));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OS | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    clienteId: "",
    tecnicoId: "",
    analistaId: "",
    valor: "",
    custo_viagem: "",
    data_agendamento: "",
    horario_atendimento: "",
    descricao_problema: "",
    status: "Orçamento" as OSStatus,
  });
  const { analistas: analistasNovaOS } = useAnalistasByCliente(form.clienteId);
  const [novosDadosExtras, setNovosDadosExtras] = useState<Record<string, any>>({});
  const [novoCampoNome, setNovoCampoNome] = useState("");
  const [novoCampoValor, setNovoCampoValor] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDown(false);
  };

  const onMouseUp = () => {
    setIsDown(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleDeleteOS = async (id: string) => {
    const osItem = os.find((o) => o.id === id);
    if (!confirm(`Tem certeza que deseja excluir a OS ${osItem?.numero || ""}?`)) return;
    try {
      const { error } = await supabase.from("ordens_servico").delete().eq("id", id);
      if (error) throw error;
      toast.success("OS excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir OS");
    }
  };

  const submit = () => {
    if (!form.titulo || !form.clienteId || !form.tecnicoId) {
      toast.error("Preencha todos os campos");
      return;
    }
    addOS({
      titulo: form.titulo,
      clienteId: form.clienteId,
      tecnicoId: form.tecnicoId,
      analistaId: form.analistaId || undefined,
      valor: Number(form.valor) || 0,
      custo_viagem: Number(form.custo_viagem) || 0,
      data_agendamento: form.data_agendamento || undefined,
      horario_atendimento: form.horario_atendimento || undefined,
      descricao_problema: form.descricao_problema,
      status: form.status,
      dados_adicionais: novosDadosExtras,
    });
    toast.success("OS criada com sucesso");
    setOpen(false);
    setForm({
      titulo: "",
      clienteId: "",
      tecnicoId: "",
      analistaId: "",
      valor: "",
      custo_viagem: "",
      data_agendamento: "",
      horario_atendimento: "",
      descricao_problema: "",
      status: "Orçamento",
    });
    setNovosDadosExtras({});
  };

  const adicionarCampoPersonalizado = () => {
    if (!novoCampoNome.trim()) return;
    setNovosDadosExtras((prev) => ({
      ...prev,
      [novoCampoNome.trim()]: novoCampoValor,
    }));
    setNovoCampoNome("");
    setNovoCampoValor("");
  };

  const onDragEnd = (e: DragEndEvent) => {
    const id = e.active.id as string;
    const target = e.over?.id as OSStatus | undefined;
    if (!target) return;
    const cur = os.find((o) => o.id === id);
    if (cur && cur.status !== target) {
      updateOS(id, { status: target });
      toast.success(`Movida para ${target}`);
    }
  };

  const fixedKeys = new Set([
    "Data",
    "status",
    "valor",
    "cliente",
    "tecnico",
    "título",
    "titulo",
    "numero",
  ]);
  const dynamicHeaders = Array.from(
    new Set(
      os.flatMap((o) =>
        Object.keys((o.dados_adicionais as Record<string, any>) || {}).filter(
          (k) => !fixedKeys.has(k.toLowerCase()),
        ),
      ),
    ),
  );

  return (
    <GestorLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">Ordens de Serviço</h2>
          {viewMode === "card" && (
            <p className="text-sm text-muted-foreground hidden md:block">
              Arraste cards entre colunas para atualizar o status
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <MesAnoFilter />
          <div className="flex items-center rounded-lg bg-muted/50 p-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-md ${viewMode === "list" ? "bg-background shadow-sm" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-md ${viewMode === "card" ? "bg-background shadow-sm" : ""}`}
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          <ImportarOSDialog
            trigger={
              <Button variant="outline" className="rounded-xl h-10 gap-1.5 shrink-0">
                <Upload className="w-4 h-4" /> Importar Planilha
              </Button>
            }
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-10 bg-gradient-to-r from-primary to-violet shadow-[var(--shadow-glow)] shrink-0">
                <Plus className="w-4 h-4" /> Nova OS
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Ordem de Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    placeholder="Ex: Manutenção câmara fria"
                    className="h-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente</Label>
                    <Select
                      value={form.clienteId}
                      onValueChange={(v) => setForm({ ...form, clienteId: v })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nomeFantasia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Técnico</Label>
                    <Select
                      value={form.tecnicoId}
                      onValueChange={(v) => setForm({ ...form, tecnicoId: v })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tecnicos.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Analista / Suporte Responsável</Label>
                  <Select
                    value={form.analistaId || undefined}
                    onValueChange={(v) => setForm({ ...form, analistaId: v })}
                    disabled={!form.clienteId}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue
                        placeholder={
                          !form.clienteId
                            ? "Selecione um cliente primeiro"
                            : analistasNovaOS.length === 0
                              ? "Nenhum analista cadastrado para este cliente"
                              : "Selecione um analista..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {analistasNovaOS.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                          {a.whatsapp ? ` — ${a.whatsapp}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data do Agendamento</Label>
                    <Input
                      type="date"
                      value={form.data_agendamento}
                      onChange={(e) => setForm({ ...form, data_agendamento: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label>Horário do Atendimento</Label>
                    <Input
                      type="time"
                      value={form.horario_atendimento}
                      onChange={(e) => setForm({ ...form, horario_atendimento: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor estimado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.valor}
                      onChange={(e) => setForm({ ...form, valor: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label>Custo viagem (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.custo_viagem}
                      onChange={(e) => setForm({ ...form, custo_viagem: e.target.value })}
                      placeholder="0,00"
                      className="h-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as OSStatus })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colunas.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição do Problema</Label>
                  <textarea
                    value={form.descricao_problema}
                    onChange={(e) => setForm({ ...form, descricao_problema: e.target.value })}
                    placeholder="Descreva o problema ou serviço a ser executado..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-3">
                    Campos Personalizados (Opcional)
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Nome do campo"
                      value={novoCampoNome}
                      onChange={(e) => setNovoCampoNome(e.target.value)}
                      className="h-9 flex-1"
                    />
                    <Input
                      placeholder="Valor"
                      value={novoCampoValor}
                      onChange={(e) => setNovoCampoValor(e.target.value)}
                      className="h-9 flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={adicionarCampoPersonalizado}
                      className="h-9 w-9 shrink-0"
                    >
                      +
                    </Button>
                  </div>
                  {Object.keys(novosDadosExtras).length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(novosDadosExtras).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-muted-foreground uppercase">{k}</div>
                            <div className="text-xs font-medium truncate">{String(v)}</div>
                          </div>
                          <button
                            onClick={() => {
                              const next = { ...novosDadosExtras };
                              delete next[k];
                              setNovosDadosExtras(next);
                            }}
                            className="ml-2 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submit}>Criar OS</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loadingOS ? (
        viewMode === "card" ? (
          <div className="flex md:grid md:grid-cols-2 xl:grid-cols-5 gap-4 overflow-x-auto pb-4 snap-x snap-mandatory w-full">
            {colunas.map((c) => (
              <div key={c} className="min-w-[280px] snap-center rounded-3xl p-3 bg-muted/40">
                <Skeleton className="h-5 w-24 mb-3" />
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </Card>
        )
      ) : viewMode === "list" ? (
        <>
          <FiltrosBar />
          {os.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma ordem de serviço encontrada"
              description="Tente ajustar os filtros ou crie uma nova OS."
              action={
                <Button onClick={() => setOpen(true)} className="rounded-xl">
                  <Plus className="w-4 h-4" /> Criar primeira OS
                </Button>
              }
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div
                ref={scrollRef}
                className="overflow-x-auto w-full pb-4 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
              >
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold sticky left-0 z-20 bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Número
                      </th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Data</th>
                      <th className="px-5 py-3 font-semibold">Horário</th>
                      <th className="px-5 py-3 font-semibold">Cliente</th>
                      <th className="px-5 py-3 font-semibold">Técnico</th>
                      <th className="px-5 py-3 font-semibold">Valor</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {os.map((o) => {
                      const cliente = clientes.find((c) => c.id === o.clienteId);
                      const tecnico = o.tecnico || tecnicos.find((t) => t.id === o.tecnicoId);
                      return (
                        <tr
                          key={o.id}
                          onClick={() => {
                            setEditing(o);
                            setDialogMode("view");
                          }}
                          className="hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/40 last:border-b-0"
                        >
                          <td className="px-5 py-3 font-medium whitespace-nowrap sticky left-0 z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-2">
                              {o.dados_adicionais?._tecnico_nao_encontrado && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              )}
                              {o.numero}
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {o.status === "Concluído" && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Orçamento" && (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200"
                              >
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Em Execução" && (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Cancelado" && (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200"
                              >
                                {o.status}
                              </Badge>
                            )}
                            {o.status === "Aprovado" && (
                              <Badge
                                variant="outline"
                                className="bg-violet-50 text-violet-700 border-violet-200"
                              >
                                {o.status}
                              </Badge>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {formatDate(o.data_agendamento || o.dados_adicionais?.Data)}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                            {o.horario_atendimento || "—"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {cliente?.nomeFantasia ?? "—"}
                            </span>
                          </td>

                          <td>
                            {o.tecnico?.nome ? (
                              <span>{o.tecnico.nome.split(" ")[0]}</span>
                            ) : (
                              <span className="text-gray-400">Sem técnico</span>
                            )}
                          </td>
                          <td className="px-5 py-3 font-semibold whitespace-nowrap">
                            R$ {o.valor.toLocaleString("pt-BR")}
                          </td>
                          <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <RatGallery osId={o.id} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditing(o);
                                  setDialogMode("edit");
                                }}
                              >
                                <Edit className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOS(o.id);
                                }}
                              >
                                <Trash className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex md:grid md:grid-cols-2 xl:grid-cols-5 gap-4 overflow-x-auto pb-4 snap-x snap-mandatory w-full">
            {colunas.map((status) => {
              const cards = os.filter((o) => o.status === status);
              return (
                <Coluna
                  key={status}
                  status={status}
                  cards={cards}
                  clientes={clientes}
                  tecnicos={tecnicos}
                />
              );
            })}
          </div>
        </DndContext>
      )}

      {os.length > 0 && viewMode === "list" && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-muted-foreground">
            Mostrando {osPage * OS_PAGE_SIZE + 1}–{Math.min((osPage + 1) * OS_PAGE_SIZE, osTotal)}{" "}
            de {osTotal} OS
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOsPage(Math.max(0, osPage - 1))}
              disabled={osPage === 0}
              className="rounded-lg gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <span className="text-xs font-medium tabular-nums px-2">
              Página {osPage + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOsPage(Math.min(totalPages - 1, osPage + 1))}
              disabled={osPage >= totalPages - 1}
              className="rounded-lg gap-1"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <EditOSDialog
        mode={dialogMode}
        ordem={editing}
        clientes={clientes}
        tecnicos={tecnicos}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          try {
            await updateOS(editing.id, patch);
            toast.success("OS atualizada");
            setEditing(null);
          } catch (e: any) {
            toast.error(e?.message ?? "Erro ao atualizar");
          }
        }}
      />
    </GestorLayout>
  );
}

function Coluna({
  status,
  cards,
  clientes,
  tecnicos,
}: {
  status: OSStatus;
  cards: OS[];
  clientes: any[];
  tecnicos: any[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const total = cards.reduce((s, c) => s + c.valor, 0);
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] snap-center rounded-3xl p-3 transition-all duration-300 ${isOver ? "bg-primary/10 ring-2 ring-primary/40" : "bg-muted/40"}`}
    >
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor[status]}`}
          >
            {status}
          </span>
          <span className="text-xs text-muted-foreground font-semibold">{cards.length}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          R$ {total.toLocaleString("pt-BR")}
        </span>
      </div>
      <div className="space-y-2 mt-2 min-h-[120px]">
        {cards.map((o) => (
          <OSCard
            key={o.id}
            ordem={o}
            cliente={clientes.find((c) => c.id === o.clienteId)}
            tecnico={tecnicos.find((t) => t.id === o.tecnicoId)}
          />
        ))}
        {cards.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">—</div>
        )}
      </div>
    </div>
  );
}

function OSCard({ ordem, cliente, tecnico }: { ordem: OS; cliente: any; tecnico: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ordem.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`rounded-2xl bg-card p-3.5 shadow-[var(--shadow-card)] border border-border/60 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 ${isDragging ? "opacity-50 rotate-2" : ""}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] text-muted-foreground font-bold tracking-wider">
          {ordem.numero}
        </span>
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="font-semibold text-sm mt-1.5 leading-snug">{ordem.titulo}</div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
        <User className="w-3 h-3" />
        {cliente?.nomeFantasia}
      </div>
      <div className="mt-3">
        <RatGallery osId={ordem.id} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <HardHat className="w-3 h-3" />
          {tecnico?.nome?.split(" ")[0] ?? <span className="text-gray-400">Sem técnico</span>}
        </div>
        <span className="text-xs font-bold">R$ {ordem.valor.toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

function EditOSDialog({
  mode,
  ordem,
  clientes,
  tecnicos,
  onClose,
  onSave,
}: {
  mode: "view" | "edit";
  ordem: OS | null;
  clientes: { id: string; nomeFantasia: string }[];
  tecnicos: { id: string; nome: string }[];
  onClose: () => void;
  onSave: (patch: Partial<OS>) => Promise<void>;
}) {
  const isView = mode === "view";
  const [form, setForm] = useState({
    titulo: "",
    clienteId: "",
    tecnicoId: "",
    analistaId: "",
    valor: "",
    custo_viagem: "",
    status: "Orçamento" as OSStatus,
  });
  const [descricaoProblema, setDescricaoProblema] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [dadosExtras, setDadosExtras] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const { analistas: analistasEdit } = useAnalistasByCliente(form.clienteId);

  useEffect(() => {
    if (ordem) {
      setForm({
        titulo: ordem.titulo ?? "",
        clienteId: ordem.clienteId ?? "",
        tecnicoId: ordem.tecnicoId ?? "",
        analistaId: ordem.analistaId ?? "",
        valor: String(ordem.valor ?? 0),
        custo_viagem: String(ordem.custo_viagem ?? 0),
        status: ordem.status,
      });
      setDescricaoProblema(ordem?.descricao_problema || "");
      setDataAgendamento(ordem?.data_agendamento || "");
      setDadosExtras((ordem?.dados_adicionais as Record<string, any>) || {});
    }
  }, [ordem]);

  const handleSave = async () => {
    if (!ordem) return;
    if (!form.titulo || !form.clienteId || !form.tecnicoId) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        titulo: form.titulo,
        clienteId: form.clienteId,
        tecnicoId: form.tecnicoId,
        valor: Number(form.valor) || 0,
        custo_viagem: Number(form.custo_viagem) || 0,
        data_agendamento: dataAgendamento,
        descricao_problema: descricaoProblema,
        status: form.status,
        dados_adicionais: dadosExtras,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!ordem} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "view" ? "Visualizar OS" : "Editar OS"} {ordem?.numero}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input
              disabled={isView}
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <Select
                disabled={isView}
                value={form.clienteId}
                onValueChange={(v) => setForm({ ...form, clienteId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nomeFantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Técnico</Label>
              <Select
                disabled={isView}
                value={form.tecnicoId}
                onValueChange={(v) => setForm({ ...form, tecnicoId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Valor</Label>
              <Input
                disabled={isView}
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <div>
              <Label>Custo viagem</Label>
              <Input
                disabled={isView}
                type="number"
                step="0.01"
                value={form.custo_viagem}
                onChange={(e) => setForm({ ...form, custo_viagem: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                disabled={isView}
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as OSStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colunas.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data do Agendamento</Label>
              <Input
                disabled={isView}
                type="date"
                value={dataAgendamento}
                onChange={(e) => setDataAgendamento(e.target.value)}
              />
            </div>
            <div>
              <Label>Descrição do Problema</Label>
              <textarea
                disabled={isView}
                value={descricaoProblema}
                onChange={(e) => setDescricaoProblema(e.target.value)}
                placeholder="Descreva o problema ou serviço a ser executado..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          {Object.keys(dadosExtras).length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                Informações adicionais (importadas)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(dadosExtras).map(([k, v]) => (
                  <div key={k}>
                    <Label>{k}</Label>
                    <Input
                      disabled={isView}
                      value={String(v ?? "")}
                      onChange={(e) => setDadosExtras((prev) => ({ ...prev, [k]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Fechar
          </Button>
          {!isView && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}