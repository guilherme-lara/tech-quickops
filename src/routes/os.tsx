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
import { useStore, statusColor, OSStatus, OS, PAGE_SIZE } from "@/lib/useData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate, maskPhoneBR } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { logActivity } from "@/lib/logger";
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
import { FiltrosBarGlobal } from "@/components/FiltrosBarGlobal";

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

function OSPage() {
  const {
    os,
    allClientes: clientes,
    allTecnicos: tecnicos,
    addOS,
    updateOS,
    addCliente,
    addTecnico,
    loadingOS,
    osPage,
    osTotal,
    setOsPage,
    osSearchCliente,
    setOsSearchCliente,
    osSearchTecnico,
    setOsSearchTecnico,
    osFilterStatus,
    setOsFilterStatus,
    osMonth,
    osYear,
  } = useStore();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const empresaId = profile?.empresa_id;
  const nomeUsuario = profile?.nome_completo || "usuário";
  const registrarLog = async (tipo: string, descricao: string) => {
    if (!empresaId) return;
    await logActivity(tipo, descricao, empresaId);
  };

  // Dispara a busca quando os filtros ou página mudam
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
  }, [osPage, osSearchCliente, osSearchTecnico, osFilterStatus, osMonth, osYear, queryClient]);
  const totalPages = Math.max(1, Math.ceil(osTotal / PAGE_SIZE));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OS | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    clienteId: "",
    tecnicoId: "",
    analistaId: "",
    valor: "",
    custo_viagem: "",
    km_viagem: "",
    data_agendamento: "",
    horario_atendimento: "",
    descricao_problema: "",
    status: "Orçamento" as OSStatus,
  });
  const { analistas: analistasNovaOS } = useAnalistasByCliente(form.clienteId);
  const [novosDadosExtras, setNovosDadosExtras] = useState<Record<string, any>>({});
  const [novoCampoNome, setNovoCampoNome] = useState("");
  const [novoCampoValor, setNovoCampoValor] = useState("");
  const [despesasSelecionadas, setDespesasSelecionadas] = useState<
    Array<{ tipo: string; valor: number }>
  >([]);
  const [despesaTipo, setDespesaTipo] = useState("Pedágio");
  const [despesaValor, setDespesaValor] = useState("");

  // Fase 4 — Modais "Cadastrar Novo" dentro da OS
  const [quickCliOpen, setQuickCliOpen] = useState(false);
  const [quickCliForm, setQuickCliForm] = useState({ nome: "", telefone: "", email: "" });
  const [quickCliSaving, setQuickCliSaving] = useState(false);
  const [quickTecOpen, setQuickTecOpen] = useState(false);
  const [quickTecForm, setQuickTecForm] = useState({
    nome: "",
    perfil: "Técnico de Campo",
    telefone: "",
    comissao: "",
    tipo_comissao: "porcentagem" as "porcentagem" | "fixo",
  });
  const [quickTecSaving, setQuickTecSaving] = useState(false);

  const saveQuickCliente = async () => {
    if (!quickCliForm.nome.trim()) return toast.error("Informe o nome do cliente");
    setQuickCliSaving(true);
    try {
      const id = await addCliente({
        nome: quickCliForm.nome,
        documento: "",
        telefone: quickCliForm.telefone,
        email: quickCliForm.email,
      });
      setForm((f) => ({ ...f, clienteId: id }));
      toast.success("Cliente cadastrado e selecionado");
      setQuickCliOpen(false);
      setQuickCliForm({ nome: "", telefone: "", email: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao cadastrar cliente");
    } finally {
      setQuickCliSaving(false);
    }
  };

  const saveQuickTecnico = async () => {
    if (!quickTecForm.nome.trim()) return toast.error("Informe o nome do técnico");
    setQuickTecSaving(true);
    try {
      const id = await addTecnico({
        nome: quickTecForm.nome,
        perfil: quickTecForm.perfil,
        telefone: quickTecForm.telefone,
        ativo: true,
        comissao: Number(quickTecForm.comissao) || 0,
        tipo_comissao: quickTecForm.tipo_comissao,
        chave_pix: "",
      } as any);
      setForm((f) => ({ ...f, tecnicoId: id }));
      toast.success("Técnico cadastrado e selecionado");
      setQuickTecOpen(false);
      setQuickTecForm({
        nome: "",
        perfil: "Técnico de Campo",
        telefone: "",
        comissao: "",
        tipo_comissao: "porcentagem",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao cadastrar técnico");
    } finally {
      setQuickTecSaving(false);
    }
  };
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
      await registrarLog(
        "os_excluida",
        `OS "${osItem?.titulo || osItem?.numero || id}" excluída por ${nomeUsuario}`,
      );
      toast.success("OS excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["ordens_servico"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir OS");
    }
  };

  const submit = async () => {
    if (!form.titulo || !form.clienteId || !form.tecnicoId) {
      toast.error("Preencha todos os campos");
      return;
    }
    await addOS({
      titulo: form.titulo,
      clienteId: form.clienteId,
      tecnicoId: form.tecnicoId,
      analistaId: form.analistaId || undefined,
      valor: Number(form.valor) || 0,
      custo_viagem: Number(form.custo_viagem) || 0,
      km_viagem: Number(form.km_viagem) || 0,
      despesas: despesasSelecionadas,
      data_agendamento: form.data_agendamento || undefined,
      horario_atendimento: form.horario_atendimento || undefined,
      descricao_problema: form.descricao_problema,
      status: form.status,
      dados_adicionais: novosDadosExtras,
    });
    await registrarLog("os_criada", `OS "${form.titulo}" criada por ${nomeUsuario}`);
    toast.success("OS criada com sucesso");
    setOpen(false);
    setForm({
      titulo: "",
      clienteId: "",
      tecnicoId: "",
      analistaId: "",
      valor: "",
      custo_viagem: "",
      km_viagem: "",
      data_agendamento: "",
      horario_atendimento: "",
      descricao_problema: "",
      status: "Orçamento",
    });
    setNovosDadosExtras({});
    setDespesasSelecionadas([]);
    setDespesaValor("");
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

  const adicionarDespesa = () => {
    const valor = Number(despesaValor) || 0;
    if (valor <= 0) {
      toast.error("Informe um valor maior que zero para a despesa");
      return;
    }
    setDespesasSelecionadas((prev) => [...prev, { tipo: despesaTipo, valor }]);
    setDespesaTipo("Pedágio");
    setDespesaValor("");
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const id = e.active.id as string;
    const target = e.over?.id as OSStatus | undefined;
    if (!target) return;
    const cur = os.find((o) => o.id === id);
    if (cur && cur.status !== target) {
      await updateOS(id, { status: target });
      await registrarLog(
        "os_status_alterado",
        `OS "${cur.titulo}" alterada para status ${target} por ${nomeUsuario}`,
      );
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
                    <div className="flex items-center justify-between">
                      <Label>Cliente</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setQuickCliOpen(true)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar novo
                      </Button>
                    </div>
                    <SearchCombobox
                      options={(Array.isArray(clientes) ? clientes : []).map((c) => ({
                        value: c.id,
                        label: c.nome,
                      }))}
                      value={form.clienteId}
                      onChange={(v) => {
                        const cliente = clientes.find((c) => c.id === v);
                        const baseKm = cliente?.base_km || 0;
                        const valorPorKm = cliente?.valor_por_km || 0;
                        setForm({
                          ...form,
                          clienteId: v,
                          km_viagem: baseKm ? String(baseKm) : "",
                          custo_viagem: baseKm && valorPorKm ? String(baseKm * valorPorKm) : "",
                        });
                      }}
                      placeholder="Selecione um cliente..."
                      searchPlaceholder="Buscar cliente..."
                      emptyText="Nenhum cliente encontrado."
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Técnico</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setQuickTecOpen(true)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar novo
                      </Button>
                    </div>
                    <SearchCombobox
                      options={(Array.isArray(tecnicos) ? tecnicos : []).map((t) => ({
                        value: t.id,
                        label: t.nome,
                      }))}
                      value={form.tecnicoId}
                      onChange={(v) => setForm({ ...form, tecnicoId: v })}
                      placeholder="Selecione um técnico..."
                      searchPlaceholder="Buscar técnico..."
                      emptyText="Nenhum técnico encontrado."
                    />
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
                      {(Array.isArray(analistasNovaOS) ? analistasNovaOS : []).map((a) => (
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
                    <Label>Km viagem</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.km_viagem}
                      onChange={(e) => {
                        const cliente = clientes.find((c) => c.id === form.clienteId);
                        const valorPorKm = cliente?.valor_por_km || 0;
                        setForm({
                          ...form,
                          km_viagem: e.target.value,
                          custo_viagem: valorPorKm
                            ? String(Number(e.target.value) * valorPorKm)
                            : form.custo_viagem,
                        });
                      }}
                      placeholder="0"
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label>Adicionar despesa</Label>
                    <div className="flex gap-2">
                      <Select value={despesaTipo} onValueChange={setDespesaTipo}>
                        <SelectTrigger className="h-10 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Pedágio", "Insumos", "Alimentação", "Outros"].map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={despesaValor}
                        onChange={(e) => setDespesaValor(e.target.value)}
                        placeholder="R$"
                        className="h-10 w-24"
                      />
                      <Button
                        type="button"
                        size="icon"
                        className="h-10 w-10"
                        onClick={adicionarDespesa}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {despesasSelecionadas.length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      Despesas adicionadas
                    </div>
                    {(Array.isArray(despesasSelecionadas) ? despesasSelecionadas : []).map(
                      (despesa, index) => (
                        <div
                          key={`${despesa.tipo}-${index}`}
                          className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2 text-sm"
                        >
                          <span>{despesa.tipo}</span>
                          <span>
                            R$ {despesa.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
                {(() => {
                  const subtotal = Number(form.valor || 0);
                  const custoViagem = Number(form.custo_viagem || 0);
                  const somaDespesas = despesasSelecionadas.reduce(
                    (s, it) => s + Number(it.valor || 0),
                    0,
                  );
                  const custosExtras = custoViagem + somaDespesas;
                  const total = subtotal + custosExtras;
                  const fmt = (n: number) =>
                    n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                  return (
                    <div className="rounded-xl border border-border/60 bg-primary/5 p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal (Serviço)</span>
                        <span>R$ {fmt(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          + Custos Extras (Viagem + Despesas)
                        </span>
                        <span>R$ {fmt(custosExtras)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t border-border/60">
                        <span>= Valor Total Faturado</span>
                        <span>R$ {fmt(total)}</span>
                      </div>
                    </div>
                  );
                })()}
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

          {/* Quick-add Cliente */}
          <Dialog open={quickCliOpen} onOpenChange={setQuickCliOpen}>
            <DialogContent className="rounded-2xl w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome / Razão Social</Label>
                  <Input
                    value={quickCliForm.nome}
                    onChange={(e) => setQuickCliForm({ ...quickCliForm, nome: e.target.value })}
                    placeholder="Ex: Padaria Central"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={quickCliForm.telefone}
                      onChange={(e) =>
                        setQuickCliForm({ ...quickCliForm, telefone: maskPhoneBR(e.target.value) })
                      }
                      placeholder="(11) 99999-0000"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={quickCliForm.email}
                      onChange={(e) => setQuickCliForm({ ...quickCliForm, email: e.target.value })}
                      placeholder="contato@empresa.com"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setQuickCliOpen(false)}
                  disabled={quickCliSaving}
                >
                  Cancelar
                </Button>
                <Button onClick={saveQuickCliente} disabled={quickCliSaving}>
                  {quickCliSaving ? "Salvando..." : "Salvar e selecionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Quick-add Técnico */}
          <Dialog open={quickTecOpen} onOpenChange={setQuickTecOpen}>
            <DialogContent className="rounded-2xl w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Técnico</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={quickTecForm.nome}
                    onChange={(e) => setQuickTecForm({ ...quickTecForm, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Perfil</Label>
                    <Select
                      value={quickTecForm.perfil}
                      onValueChange={(v) => setQuickTecForm({ ...quickTecForm, perfil: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Técnico de Campo", "Instalador", "Suporte", "Manutenção"].map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={quickTecForm.telefone}
                      onChange={(e) =>
                        setQuickTecForm({
                          ...quickTecForm,
                          telefone: maskPhoneBR(e.target.value),
                        })
                      }
                      placeholder="(11) 99999-0000"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo comissão</Label>
                    <Select
                      value={quickTecForm.tipo_comissao}
                      onValueChange={(v) =>
                        setQuickTecForm({
                          ...quickTecForm,
                          tipo_comissao: v as "porcentagem" | "fixo",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="porcentagem">% sobre OS</SelectItem>
                        <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>
                      {quickTecForm.tipo_comissao === "fixo" ? "Valor (R$)" : "Comissão (%)"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={quickTecForm.comissao}
                      onChange={(e) =>
                        setQuickTecForm({ ...quickTecForm, comissao: e.target.value })
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dica: para configurar login e senha do técnico, use a tela de Equipe.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setQuickTecOpen(false)}
                  disabled={quickTecSaving}
                >
                  Cancelar
                </Button>
                <Button onClick={saveQuickTecnico} disabled={quickTecSaving}>
                  {quickTecSaving ? "Salvando..." : "Salvar e selecionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === "list" && <FiltrosBarGlobal showCliente showTecnico showStatus />}
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
                        OS / Título
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
                    {(Array.isArray(os) ? os : []).map((o) => {
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
                          <td className="px-5 py-3 whitespace-nowrap sticky left-0 z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold tracking-wider mb-0.5">
                                {o.dados_adicionais?._tecnico_nao_encontrado && (
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                )}
                                {o.numero}
                              </div>
                              <div
                                className="font-bold text-sm text-foreground truncate max-w-[250px]"
                                title={o.titulo}
                              >
                                {o.titulo}
                              </div>
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
                            {formatDate(
                              o.data_agendamento ?? o.data_atendimento ?? o.dados_adicionais?.Data,
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                            {o.horario_atendimento ?? o.dados_adicionais?.Horario ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              {cliente?.nome ?? "—"}
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
                            <div className="space-y-1">
                              <div>Serviço: R$ {Number(o.valor ?? 0).toLocaleString("pt-BR")}</div>
                              <div className="text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                  Viagem/Despesas: R${" "}
                                  {(
                                    Number(o.custo_viagem ?? 0) +
                                    (o.despesas ?? []).reduce(
                                      (sum, item) => sum + Number(item?.valor ?? 0),
                                      0,
                                    )
                                  ).toLocaleString("pt-BR")}
                                </span>
                              </div>
                            </div>
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
              const cards = (Array.isArray(os) ? os : []).filter((o) => o.status === status);
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
            Mostrando {osPage * PAGE_SIZE + 1}–{Math.min((osPage + 1) * PAGE_SIZE, osTotal)} de{" "}
            {osTotal} OS
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
        addCliente={addCliente}
        addTecnico={addTecnico}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          try {
            await updateOS(editing.id, patch);
            const mudouStatus = patch.status !== undefined && patch.status !== editing.status;
            const mudouTecnico =
              patch.tecnicoId !== undefined && patch.tecnicoId !== editing.tecnicoId;
            if (mudouStatus) {
              await registrarLog(
                "os_status_alterado",
                `OS "${editing.titulo}" alterada para status ${patch.status} por ${nomeUsuario}`,
              );
            }
            if (mudouTecnico) {
              const tecnico = tecnicos.find((t) => t.id === patch.tecnicoId);
              await registrarLog(
                "os_tecnico_alterado",
                `OS "${editing.titulo}" atribuída ao técnico ${tecnico?.nome || "sem técnico"} por ${nomeUsuario}`,
              );
            }
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
        {(Array.isArray(cards) ? cards : []).map((o) => (
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
      <div className="font-bold text-sm text-foreground mt-1.5 leading-snug">{ordem.titulo}</div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
        <User className="w-3 h-3" />
        {cliente?.nome}
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

export function EditOSDialog({
  mode,
  ordem,
  clientes,
  tecnicos,
  addCliente,
  addTecnico,
  onClose,
  onSave,
}: {
  mode: "view" | "edit";
  ordem: OS | null;
  clientes: { id: string; nome: string; base_km?: number; valor_por_km?: number }[];
  tecnicos: { id: string; nome: string }[];
  addCliente: (c: any) => Promise<string>;
  addTecnico: (t: any) => Promise<string>;
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
    km_viagem: "",
    status: "Orçamento" as OSStatus,
    pendencias_detalhes: "",
  });
  const [descricaoProblema, setDescricaoProblema] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [horarioAtendimento, setHorarioAtendimento] = useState("");
  const [dadosExtras, setDadosExtras] = useState<Record<string, any>>({});
  const [despesasEdit, setDespesasEdit] = useState<Array<{ tipo: string; valor: number }>>([]);
  const [despesaTipoEdit, setDespesaTipoEdit] = useState("Pedágio");
  const [despesaValorEdit, setDespesaValorEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickCliOpen, setQuickCliOpen] = useState(false);
  const [quickCliForm, setQuickCliForm] = useState({ nome: "", telefone: "", email: "" });
  const [quickCliSaving, setQuickCliSaving] = useState(false);
  const [quickTecOpen, setQuickTecOpen] = useState(false);
  const [quickTecForm, setQuickTecForm] = useState({
    nome: "",
    perfil: "Técnico de Campo",
    telefone: "",
    comissao: "",
    tipo_comissao: "porcentagem" as "porcentagem" | "fixo",
  });
  const [quickTecSaving, setQuickTecSaving] = useState(false);
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
        km_viagem: String(ordem.km_viagem ?? 0),
        status: ordem.status,
        pendencias_detalhes: ordem.pendencias_detalhes ?? "",
      });
      setDescricaoProblema(ordem?.descricao_problema || "");
      setDataAgendamento(ordem?.data_agendamento || "");
      setHorarioAtendimento(ordem?.horario_atendimento || "");
      setDadosExtras((ordem?.dados_adicionais as Record<string, any>) || {});
      setDespesasEdit(ordem?.despesas ?? []);
    }
  }, [ordem]);

  const handleSave = async () => {
    if (!ordem) return;
    if (!form.titulo || !form.clienteId || !form.tecnicoId) {
      toast.error("Preencha todos os campos");
      return;
    }
    const valorServico = Number(form.valor) || 0;
    const custoViagem = Number(form.custo_viagem) || 0;
    const kmViagem = Number(form.km_viagem) || 0;
    const patch: Partial<OS> = {
      titulo: form.titulo,
      clienteId: form.clienteId,
      tecnicoId: form.tecnicoId,
      analistaId: form.analistaId || undefined,
      valor: valorServico,
      custo_viagem: custoViagem,
      km_viagem: kmViagem,
      despesas: despesasEdit,
      data_agendamento: dataAgendamento || ordem?.data_agendamento || undefined,
      horario_atendimento: horarioAtendimento || ordem?.horario_atendimento || undefined,
      descricao_problema: descricaoProblema,
      status: form.status,
      dados_adicionais: dadosExtras,
      pendencias_detalhes: form.pendencias_detalhes || (null as any),
    };

    setSaving(true);
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  };

  const adicionarDespesaEdit = () => {
    const valor = Number(despesaValorEdit) || 0;
    if (valor <= 0) {
      toast.error("Informe um valor maior que zero para a despesa");
      return;
    }
    setDespesasEdit((prev) => [...prev, { tipo: despesaTipoEdit, valor }]);
    setDespesaTipoEdit("Pedágio");
    setDespesaValorEdit("");
  };

  const saveQuickCliente = async () => {
    if (!quickCliForm.nome.trim()) return toast.error("Informe o nome do cliente");
    setQuickCliSaving(true);
    try {
      const id = await addCliente({
        nome: quickCliForm.nome,
        documento: "",
        telefone: quickCliForm.telefone,
        email: quickCliForm.email,
      });
      setForm((prev) => ({ ...prev, clienteId: id }));
      toast.success("Cliente cadastrado e selecionado");
      setQuickCliOpen(false);
      setQuickCliForm({ nome: "", telefone: "", email: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao cadastrar cliente");
    } finally {
      setQuickCliSaving(false);
    }
  };

  const saveQuickTecnico = async () => {
    if (!quickTecForm.nome.trim()) return toast.error("Informe o nome do técnico");
    setQuickTecSaving(true);
    try {
      const id = await addTecnico({
        nome: quickTecForm.nome,
        perfil: quickTecForm.perfil,
        telefone: quickTecForm.telefone,
        ativo: true,
        comissao: Number(quickTecForm.comissao) || 0,
        tipo_comissao: quickTecForm.tipo_comissao,
        chave_pix: "",
      } as any);
      setForm((prev) => ({ ...prev, tecnicoId: id }));
      toast.success("Técnico cadastrado e selecionado");
      setQuickTecOpen(false);
      setQuickTecForm({
        nome: "",
        perfil: "Técnico de Campo",
        telefone: "",
        comissao: "",
        tipo_comissao: "porcentagem",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao cadastrar técnico");
    } finally {
      setQuickTecSaving(false);
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
            <Label className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1 block">
              Título da OS
            </Label>
            <Input
              disabled={isView}
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="text-lg font-bold h-12"
              placeholder="Ex: Manutenção de Equipamento"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <Label>Cliente</Label>
                {!isView && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setQuickCliOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar novo
                  </Button>
                )}
              </div>
              <SearchCombobox
                options={(Array.isArray(clientes) ? clientes : []).map((c) => ({
                  value: c.id,
                  label: c.nome,
                }))}
                value={form.clienteId}
                onChange={(v) => {
                  if (isView) return;
                  const cliente = clientes.find((c) => c.id === v);
                  const baseKm = cliente?.base_km || 0;
                  const valorPorKm = cliente?.valor_por_km || 0;
                  setForm({
                    ...form,
                    clienteId: v,
                    km_viagem: baseKm ? String(baseKm) : "",
                    custo_viagem: baseKm && valorPorKm ? String(baseKm * valorPorKm) : "",
                  });
                }}
                placeholder="Selecione um cliente..."
                searchPlaceholder="Buscar cliente..."
                emptyText="Nenhum cliente encontrado."
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <Label>Técnico</Label>
                {!isView && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setQuickTecOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar novo
                  </Button>
                )}
              </div>
              <SearchCombobox
                options={(Array.isArray(tecnicos) ? tecnicos : []).map((t) => ({
                  value: t.id,
                  label: t.nome,
                }))}
                value={form.tecnicoId}
                onChange={(v) => {
                  if (isView) return;
                  setForm({ ...form, tecnicoId: v });
                }}
                placeholder="Selecione um técnico..."
                searchPlaceholder="Buscar técnico..."
                emptyText="Nenhum técnico encontrado."
              />
            </div>
            <div>
              <Label>Analista / Suporte Responsável</Label>
              <Select
                disabled={isView || !form.clienteId}
                value={form.analistaId || undefined}
                onValueChange={(v) => setForm({ ...form, analistaId: v })}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !form.clienteId
                        ? "Selecione um cliente primeiro"
                        : analistasEdit.length === 0
                          ? "Nenhum analista cadastrado para este cliente"
                          : "Selecione um analista..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(analistasEdit) ? analistasEdit : []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                      {a.whatsapp ? ` — ${a.whatsapp}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>Valor do Serviço</Label>
              <Input
                disabled={isView}
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <div>
              <Label>Custo de Viagem</Label>
              <Input
                disabled={isView}
                type="number"
                step="0.01"
                value={form.custo_viagem}
                onChange={(e) => setForm({ ...form, custo_viagem: e.target.value })}
              />
            </div>
            <div>
              <Label>Km Viagem</Label>
              <Input
                disabled={isView}
                type="number"
                step="0.01"
                value={form.km_viagem}
                onChange={(e) => {
                  const cliente = clientes.find((c) => c.id === form.clienteId);
                  const valorPorKm = cliente?.valor_por_km || 0;
                  setForm({
                    ...form,
                    km_viagem: e.target.value,
                    custo_viagem: valorPorKm
                      ? String(Number(e.target.value) * valorPorKm)
                      : form.custo_viagem,
                  });
                }}
              />
            </div>
            <div>
              <Label>Valor Total Faturado</Label>
              <Input
                disabled
                value={`R$ ${(Number(form.valor || 0) + Number(form.custo_viagem || 0) + despesasEdit.reduce((sum, item) => sum + Number(item.valor || 0), 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
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
              <Label>Horário do Atendimento</Label>
              <Input
                disabled={isView}
                type="time"
                value={horarioAtendimento}
                onChange={(e) => setHorarioAtendimento(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Adicionar despesa</Label>
              <div className="flex gap-2">
                <Select
                  disabled={isView}
                  value={despesaTipoEdit}
                  onValueChange={setDespesaTipoEdit}
                >
                  <SelectTrigger className="h-10 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Pedágio", "Insumos", "Alimentação", "Outros"].map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  disabled={isView}
                  type="number"
                  step="0.01"
                  value={despesaValorEdit}
                  onChange={(e) => setDespesaValorEdit(e.target.value)}
                  placeholder="R$"
                  className="h-10 w-24"
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-10 w-10"
                  onClick={adicionarDespesaEdit}
                  disabled={isView}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
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
            <div>
              <Label>Pendências (Motivo de Travamento)</Label>
              <Input
                disabled={isView}
                value={form.pendencias_detalhes}
                onChange={(e) => setForm({ ...form, pendencias_detalhes: e.target.value })}
                placeholder="Ex: Aguardando peça X, falta assinatura. Deixe vazio se não houver pendência."
              />
            </div>
          </div>
          {despesasEdit.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Despesas adicionadas
              </div>
              {(Array.isArray(despesasEdit) ? despesasEdit : []).map((despesa, index) => (
                <div
                  key={`${despesa.tipo}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2 text-sm"
                >
                  <span>{despesa.tipo}</span>
                  <span>
                    R$ {despesa.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
          {(() => {
            const subtotal = Number(form.valor || 0);
            const custoViagem = Number(form.custo_viagem || 0);
            const somaDespesas = despesasEdit.reduce((s, it) => s + Number(it.valor || 0), 0);
            const custosExtras = custoViagem + somaDespesas;
            const total = subtotal + custosExtras;
            const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
            return (
              <div className="rounded-xl border border-border/60 bg-primary/5 p-3 text-sm space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                  Resumo Financeiro
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal (Serviço)</span>
                  <span>R$ {fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Custo de Viagem</span>
                  <span>R$ {fmt(custoViagem)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Despesas</span>
                  <span>R$ {fmt(somaDespesas)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t border-border/60">
                  <span>= Valor Total Faturado</span>
                  <span>R$ {fmt(total)}</span>
                </div>
              </div>
            );
          })()}
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
      <Dialog open={quickCliOpen} onOpenChange={setQuickCliOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar cliente rápido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={quickCliForm.nome}
                onChange={(e) => setQuickCliForm({ ...quickCliForm, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={quickCliForm.telefone}
                onChange={(e) => setQuickCliForm({ ...quickCliForm, telefone: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                value={quickCliForm.email}
                onChange={(e) => setQuickCliForm({ ...quickCliForm, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickCliOpen(false)}
              disabled={quickCliSaving}
            >
              Cancelar
            </Button>
            <Button onClick={saveQuickCliente} disabled={quickCliSaving}>
              {quickCliSaving ? "Salvando..." : "Salvar e selecionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={quickTecOpen} onOpenChange={setQuickTecOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar técnico rápido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={quickTecForm.nome}
                onChange={(e) => setQuickTecForm({ ...quickTecForm, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Perfil</Label>
              <Select
                value={quickTecForm.perfil}
                onValueChange={(v) => setQuickTecForm({ ...quickTecForm, perfil: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Técnico de Campo">Técnico de Campo</SelectItem>
                  <SelectItem value="Instalador">Instalador</SelectItem>
                  <SelectItem value="Suporte">Suporte</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={quickTecForm.telefone}
                onChange={(e) => setQuickTecForm({ ...quickTecForm, telefone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickTecOpen(false)}
              disabled={quickTecSaving}
            >
              Cancelar
            </Button>
            <Button onClick={saveQuickTecnico} disabled={quickTecSaving}>
              {quickTecSaving ? "Salvando..." : "Salvar e selecionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
