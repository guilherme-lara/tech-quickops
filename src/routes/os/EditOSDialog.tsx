import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, OSStatus, OS } from "@/lib/useData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OSHistorico } from "@/components/OSHistorico";
import { maskPhoneBR } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Plus, X, Trash, CheckCircle, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { RatGallery } from "@/components/RatGallery";
import { SearchCombobox } from "@/components/SearchCombobox";
import { buildEditOSPatch, calculateInvoicedTotal, calculateTravelCost, formatOSCurrency, hasRequiredOSFields, isNegativeNumericInput, isOSFinalizada, isValidExpenseAmount, OS_STATUSES, sumOSExpenses } from "./os.rules";
import { useAnalistasByCliente } from "./use-analistas-by-cliente";
import { useOSQuickRegistrationActions, useOSQuickRegistrationState } from "./use-os-quick-registrations";
export function EditOSDialog({
  mode,
  ordem,
  clientes,
  tecnicos,
  addCliente,
  addTecnico,
  onClose,
  onEdit,
  onSave,
}: {
  mode: "view" | "edit";
  ordem: OS | null;
  clientes: { id: string; nome: string; base_km?: number; valor_por_km?: number }[];
  tecnicos: { id: string; nome: string }[];
  addCliente: (c: any) => Promise<string>;
  addTecnico: (t: any) => Promise<string>;
  onClose: () => void;
  onEdit?: () => void;
  onSave: (patch: Partial<OS>) => Promise<void>;
}) {
  const isView = mode === "view";
  const { profile } = useAuth();
  const { equipamentos } = useStore();
  const empresaId = profile?.empresa_id;
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
    endereco_servico: "",
    valor_adiantado: "",
    descricao_adiantamento: "",
    equipamentosIds: [] as string[],
  });
  const [descricaoProblema, setDescricaoProblema] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [horarioAtendimento, setHorarioAtendimento] = useState("");
  const [dadosExtras, setDadosExtras] = useState<Record<string, any>>({});
  const [despesasEdit, setDespesasEdit] = useState<Array<{ tipo: string; valor: number }>>([]);
  const [despesaTipoEdit, setDespesaTipoEdit] = useState("Pedágio");
  const [despesaValorEdit, setDespesaValorEdit] = useState("");
  const [lancamentosEdit, setLancamentosEdit] = useState<Array<{ tipo: string; valor: number; descricao?: string }>>(
    [],
  );
  const [lancTipo, setLancTipo] = useState("Hora extra");
  const [lancValor, setLancValor] = useState("");
  const [lancDescricao, setLancDescricao] = useState("");
  const [recebidoCliente, setRecebidoCliente] = useState(false);
  const [saving, setSaving] = useState(false);
  const quickRegistrationState = useOSQuickRegistrationState();
  const {
    quickCliOpen,
    setQuickCliOpen,
    quickCliForm,
    setQuickCliForm,
    quickCliSaving,
    quickTecOpen,
    setQuickTecOpen,
    quickTecForm,
    setQuickTecForm,
    quickTecSaving,
    quickAnaOpen,
    setQuickAnaOpen,
    quickAnaForm,
    setQuickAnaForm,
    quickAnaSaving,
  } = quickRegistrationState;

  const { analistas: analistasEdit, setAnalistas: setAnalistasEdit } = useAnalistasByCliente(form.clienteId);
  const { saveQuickCliente, saveQuickTecnico, saveQuickAnalista } = useOSQuickRegistrationActions({
    state: quickRegistrationState,
    empresaId,
    clienteId: form.clienteId,
    addCliente,
    addTecnico,
    onClienteCreated: (id) => setForm((prev) => ({ ...prev, clienteId: id })),
    onTecnicoCreated: (id) => setForm((prev) => ({ ...prev, tecnicoId: id })),
    onAnalistaCreated: (data) => {
      setAnalistasEdit((prev) => [...prev, data]);
      setForm((f) => ({ ...f, analistaId: data.id }));
    },
  });

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
        endereco_servico: ordem.endereco_servico ?? "",
        valor_adiantado: (ordem.valor_adiantado ?? 0).toString(),
        descricao_adiantamento: ordem.descricao_adiantamento ?? "",
        equipamentosIds: ordem.equipamentosClienteIds || [],
      });
      setDescricaoProblema(ordem?.descricao_problema || "");
      setDataAgendamento(ordem?.data_agendamento || "");
      setHorarioAtendimento(ordem?.horario_atendimento || "");
      setDadosExtras((ordem?.dados_adicionais as Record<string, any>) || {});
      setDespesasEdit(ordem?.despesas ?? []);
      setLancamentosEdit(ordem?.lancamentos_adicionais ?? []);
      setRecebidoCliente(!!ordem?.recebido_cliente);
    }
  }, [ordem]);

  const handleSave = async (overrideStatus?: OSStatus | any) => {
    if (!ordem) return;
    if (!hasRequiredOSFields(form.titulo, form.clienteId, form.tecnicoId)) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const patch = buildEditOSPatch({
      ordem,
      form,
      descricaoProblema,
      dataAgendamento,
      horarioAtendimento,
      dadosExtras,
      despesasEdit,
      lancamentosEdit,
      recebidoCliente,
      overrideStatus,
    });

    setSaving(true);
    try {
      if (patch.status === "Concluído" && ordem?.status !== "Concluído") {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 9999,
        });
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3");
        audio.play().catch(() => { });
        toast("🎉 CONCLUÍDO!", {
          description: "A Ordem de Serviço foi finalizada e faturada com sucesso.",
          position: "top-center",
          style: {
            background: "#10b981",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.1rem",
            border: "none",
            textAlign: "center",
          },
        });
      }
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  };

  const adicionarDespesaEdit = () => {
    const valor = Number(despesaValorEdit) || 0;
    if (!isValidExpenseAmount(despesaValorEdit)) {
      toast.error("Informe um valor maior que zero para a despesa");
      return;
    }
    setDespesasEdit((prev) => [...prev, { tipo: despesaTipoEdit, valor }]);
    setDespesaTipoEdit("Pedágio");
    setDespesaValorEdit("");
  };

  return (
    <Dialog open={!!ordem} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "view" ? "Visualizar OS" : "Editar OS"} {ordem?.numero}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="dados" className="space-y-3 mt-4">
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
            <div>
              <Label className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1 block">
                Endereço do Serviço *
              </Label>
              <Input
                disabled={isView}
                value={form.endereco_servico}
                onChange={(e) => setForm({ ...form, endereco_servico: e.target.value })}
                className="text-md h-10"
                placeholder="Ex: Av Paulista, 1000 - Bela Vista - São Paulo / SP"
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
                {isView ? (
                  <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/40 text-sm">
                    {clientes.find((c) => c.id === form.clienteId)?.nome || "—"}
                  </div>
                ) : (
                  <SearchCombobox
                    options={(Array.isArray(clientes) ? clientes : []).map((c) => ({
                      value: c.id,
                      label: (c as any).ativo === false ? `${c.nome} (Inativo)` : c.nome,
                      disabled: (c as any).ativo === false,
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
                        custo_viagem: baseKm && valorPorKm ? calculateTravelCost(baseKm, valorPorKm) : "",
                      });
                    }}
                    placeholder="Selecione um cliente..."
                    searchPlaceholder="Buscar cliente..."
                    emptyText="Nenhum cliente encontrado."
                  />
                )}
              </div>
              {form.clienteId && (
                <div>
                  <Label className="mb-1 block">Equipamento(s) a Instalar</Label>
                  {isView ? (
                    <div className="min-h-[40px] px-3 py-2 flex flex-wrap gap-2 items-center rounded-md border border-input bg-muted/40 text-sm">
                      {form.equipamentosIds.length > 0
                        ? form.equipamentosIds.map(id => {
                          const eq = equipamentos.find(e => e.id === id);
                          return <Badge key={id} variant="secondary">{eq?.nome}</Badge>;
                        })
                        : "—"}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {form.equipamentosIds.map((eqId, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="h-10 px-3 flex-1 flex items-center rounded-md border border-input bg-muted/20 text-sm">
                            {equipamentos.find(e => e.id === eqId)?.nome || "Desconhecido"}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setForm(f => ({
                                ...f,
                                equipamentosIds: f.equipamentosIds.filter((_, i) => i !== idx)
                              }));
                            }}
                          >
                            <Trash className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Select
                          value="none"
                          onValueChange={(v) => {
                            if (v !== "none" && !form.equipamentosIds.includes(v)) {
                              setForm(f => ({ ...f, equipamentosIds: [...f.equipamentosIds, v] }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 flex-1">
                            <SelectValue placeholder="Adicionar equipamento..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Selecione para adicionar...</SelectItem>
                            {equipamentos
                              .filter(e => e.cliente_id === form.clienteId && e.status === 'em_estoque' && !form.equipamentosIds.includes(e.id))
                              .map(e => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.nome} {e.numero_serie ? `(SN: ${e.numero_serie})` : ''}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" size="icon" variant="secondary" className="h-10 w-10 shrink-0 pointer-events-none">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                {isView ? (
                  <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/40 text-sm">
                    {tecnicos.find((t) => t.id === form.tecnicoId)?.nome || "—"}
                  </div>
                ) : (
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
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Analista / Suporte Responsável</Label>
                  {!isView && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        if (!form.clienteId) return toast.error("Selecione um cliente primeiro");
                        setQuickAnaOpen(true);
                      }}
                      disabled={!form.clienteId}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar novo
                    </Button>
                  )}
                </div>
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
                  min="0"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => {
                    if (isNegativeNumericInput(e.target.value)) return;
                    setForm({ ...form, valor: e.target.value });
                  }}
                />
              </div>
              <div>
                <Label>Custo de Viagem</Label>
                <Input
                  disabled={isView}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.custo_viagem}
                  onChange={(e) => {
                    if (isNegativeNumericInput(e.target.value)) return;
                    setForm({ ...form, custo_viagem: e.target.value });
                  }}
                />
              </div>
              <div>
                <Label>Km Viagem</Label>
                <Input
                  disabled={isView}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.km_viagem}
                  onChange={(e) => {
                    if (isNegativeNumericInput(e.target.value)) return;
                    const cliente = clientes.find((c) => c.id === form.clienteId);
                    const valorPorKm = cliente?.valor_por_km || 0;
                    setForm({
                      ...form,
                      km_viagem: e.target.value,
                      custo_viagem: valorPorKm
                        ? calculateTravelCost(e.target.value, valorPorKm)
                        : form.custo_viagem,
                    });
                  }}
                />
              </div>
              <div>
                <Label>Valor Total Faturado</Label>
                <Input
                  disabled
                  value={`R$ ${formatOSCurrency(
                    calculateInvoicedTotal(
                      Number(form.valor || 0) + Number(form.custo_viagem || 0),
                      sumOSExpenses(despesasEdit),
                    ),
                  )}`}
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
                    {OS_STATUSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isView && (() => {
                const total = calculateInvoicedTotal(
                  Number(form.valor || 0) + Number(form.custo_viagem || 0),
                  sumOSExpenses(despesasEdit),
                );
                return (
                  <div className="col-span-full border-t border-border/50 pt-4 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        Valores Recebidos Antecipadamente
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-700"
                        onClick={(e) => {
                          e.preventDefault();
                          setForm({ ...form, valor_adiantado: String(total), descricao_adiantamento: "Pagamento Total" });
                        }}
                      >
                        Pagamento Total
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor Adiantado (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.valor_adiantado}
                          onChange={(e) => setForm({ ...form, valor_adiantado: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Descrição do Adiantamento</Label>
                        <Input
                          placeholder="ex: Sinal de viagem, Pagamento Total..."
                          value={form.descricao_adiantamento}
                          onChange={(e) => setForm({ ...form, descricao_adiantamento: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data do Agendamento</Label>
                <Input
                  disabled={isView}
                  type="date"
                  max="9999-12-31"
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
              {!isOSFinalizada(form.status) && (
                <div>
                  <Label>Pendências (Motivo de Travamento)</Label>
                  <Input
                    disabled={isView}
                    value={form.pendencias_detalhes}
                    onChange={(e) => setForm({ ...form, pendencias_detalhes: e.target.value })}
                    placeholder="Ex: Aguardando peça X, falta assinatura. Deixe vazio se não houver pendência."
                  />
                </div>
              )}
            </div>

            {/* Lançamentos adicionais do técnico */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Valores adicionais do técnico
              </div>
              {!isView && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={lancTipo} onValueChange={setLancTipo}>
                    <SelectTrigger className="h-10 sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Hora extra", "Reembolso", "Ajuda de custo", "Bônus", "Outro"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={lancDescricao}
                    onChange={(e) => setLancDescricao(e.target.value)}
                    placeholder="Descrição (ex: jantar)"
                    className="h-10 flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={lancValor}
                    onChange={(e) => setLancValor(e.target.value)}
                    placeholder="R$"
                    className="h-10 w-28"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => {
                      const valor = Number(lancValor) || 0;
                      if (valor <= 0) return toast.error("Informe um valor maior que zero");
                      setLancamentosEdit((prev) => [
                        ...prev,
                        { tipo: lancTipo, valor, descricao: lancDescricao || undefined },
                      ]);
                      setLancValor("");
                      setLancDescricao("");
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {lancamentosEdit.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum valor adicional lançado.</p>
              ) : (
                <div className="space-y-2">
                  {lancamentosEdit.map((l, index) => (
                    <div
                      key={`${l.tipo}-${index}`}
                      className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2 text-sm"
                    >
                      <span>
                        {l.tipo}
                        {l.descricao ? ` — ${l.descricao}` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>R$ {formatOSCurrency(Number(l.valor))}</span>
                        {!isView && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() =>
                              setLancamentosEdit((prev) => prev.filter((_, i) => i !== index))
                            }
                          >
                            <Trash className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border/60">
                    <span>Total adicional do técnico</span>
                    <span>
                      R${" "}
                      {formatOSCurrency(
                        lancamentosEdit.reduce((s, l) => s + Number(l.valor || 0), 0),
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Baixa de recebimento individual */}
            <div className="rounded-xl border border-border/60 bg-emerald-500/5 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Valor recebido do cliente</div>
                <p className="text-xs text-muted-foreground">
                  {recebidoCliente
                    ? "Esta OS está marcada como paga pelo cliente."
                    : "Marque quando o pagamento desta OS for confirmado."}
                </p>
              </div>
              <Button
                type="button"
                variant={recebidoCliente ? "default" : "outline"}
                size="sm"
                disabled={isView}
                onClick={() => setRecebidoCliente((v) => !v)}
                className={recebidoCliente ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                {recebidoCliente ? "Recebido" : "Dar baixa"}
              </Button>
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
                      R$ {formatOSCurrency(despesa.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(() => {
              const subtotal = Number(form.valor || 0);
              const custoViagem = Number(form.custo_viagem || 0);
              const somaDespesas = sumOSExpenses(despesasEdit);
              const custosExtras = custoViagem + somaDespesas;
              const total = calculateInvoicedTotal(subtotal, custosExtras);
              const fmt = formatOSCurrency;
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
          </TabsContent>
          <TabsContent value="historico" className="mt-4">
            <OSHistorico osId={ordem?.id ?? null} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-between items-center w-full">
          <div className="flex gap-2">
            {(ordem?.status === "Concluído Técnico" || form.status === "Concluído Técnico" || ordem?.status === "concluido_tecnico" || form.status === "concluido_tecnico" as any) && ordem && (
              <>
                <RatGallery
                  osId={ordem.id}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blue-500 text-blue-600 bg-blue-50/50 hover:bg-blue-100 dark:border-blue-800/50 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Revisar Evidências
                    </Button>
                  }
                />

                {!isView && (
                  <Button
                    type="button"
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      setForm({ ...form, status: "Concluído" });
                      handleSave("Concluído");
                    }}
                    disabled={saving}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar e Finalizar
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            {isView && onEdit && (
              <Button type="button" onClick={onEdit}>
                Editar
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Fechar
            </Button>
            {!isView && (
              <Button onClick={handleSave} disabled={saving} id="btn-salvar-os">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
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
                onChange={(e) => setQuickCliForm({ ...quickCliForm, telefone: maskPhoneBR(e.target.value) })}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData("text");
                  setQuickCliForm({ ...quickCliForm, telefone: maskPhoneBR(pasted) });
                }}
                placeholder="(11) 99999-0000"
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
            <Button variant="outline" onClick={() => setQuickCliOpen(false)} disabled={quickCliSaving}>
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
              <Label>
                E-mail para notificações <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={quickTecForm.email}
                onChange={(e) => setQuickTecForm({ ...quickTecForm, email: e.target.value.trim() })}
                placeholder="tecnico@email.com"
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
                onChange={(e) => setQuickTecForm({ ...quickTecForm, telefone: maskPhoneBR(e.target.value) })}
                placeholder="(11) 99999-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickTecOpen(false)} disabled={quickTecSaving}>
              Cancelar
            </Button>
            <Button onClick={saveQuickTecnico} disabled={quickTecSaving}>
              {quickTecSaving ? "Salvando..." : "Salvar e selecionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cadastro Rápido Analista EditOS */}
      <Dialog open={quickAnaOpen} onOpenChange={setQuickAnaOpen}>
        <DialogContent className="rounded-2xl w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastro Rápido - Analista</DialogTitle>
            <DialogDescription>Adicione um analista de suporte para o cliente selecionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome Completo</Label>
              <Input
                value={quickAnaForm.nome}
                onChange={(e) => setQuickAnaForm({ ...quickAnaForm, nome: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <Label>WhatsApp (Opcional)</Label>
              <Input
                value={quickAnaForm.whatsapp}
                onChange={(e) => setQuickAnaForm({ ...quickAnaForm, whatsapp: maskPhoneBR(e.target.value) })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAnaOpen(false)} disabled={quickAnaSaving}>
              Cancelar
            </Button>
            <Button onClick={saveQuickAnalista} disabled={quickAnaSaving}>
              {quickAnaSaving ? "Salvando..." : "Salvar e selecionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
