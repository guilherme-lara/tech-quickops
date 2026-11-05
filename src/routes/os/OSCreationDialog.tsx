import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Cliente, OS, OSStatus, Tecnico } from "@/lib/useData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { maskPhoneBR } from "@/lib/utils";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SearchCombobox } from "@/components/SearchCombobox";
import { calculateInvoicedTotal, calculateTravelCost, formatOSCurrency, hasRequiredOSFields, isNegativeNumericInput, OS_STATUSES, sumOSExpenses } from "./os.rules";
import type { Dispatch, SetStateAction } from "react";
import type { OSCreateForm } from "./use-os-creation";
import { useOSQuickRegistrationActions, useOSQuickRegistrationState } from "./use-os-quick-registrations";
import type { AnalistaOpt } from "./use-analistas-by-cliente";
import { useState } from "react";

const creationSteps = ["nova_dados", "nova_financeiro", "nova_detalhes", "nova_extras"] as const;
type OSCreationStep = (typeof creationSteps)[number];

type OSQuickRegistrationState = ReturnType<typeof useOSQuickRegistrationState>;
type OSQuickRegistrationActions = ReturnType<typeof useOSQuickRegistrationActions>;

type OSCreationDialogProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  creatingOS: boolean;
  form: OSCreateForm;
  setForm: Dispatch<SetStateAction<OSCreateForm>>;
  clientes: Cliente[];
  tecnicos: Tecnico[];
  valorKmInput: string;
  setValorKmInput: Dispatch<SetStateAction<string>>;
  analistasNovaOS: AnalistaOpt[];
  novosDadosExtras: NonNullable<OS["dados_adicionais"]>;
  setNovosDadosExtras: Dispatch<SetStateAction<NonNullable<OS["dados_adicionais"]>>>;
  novoCampoNome: string;
  setNovoCampoNome: Dispatch<SetStateAction<string>>;
  novoCampoValor: string;
  setNovoCampoValor: Dispatch<SetStateAction<string>>;
  despesasSelecionadas: Array<{ tipo: string; valor: number }>;
  setDespesasSelecionadas: Dispatch<SetStateAction<Array<{ tipo: string; valor: number }>>>;
  despesaTipo: string;
  setDespesaTipo: Dispatch<SetStateAction<string>>;
  despesaValor: string;
  setDespesaValor: Dispatch<SetStateAction<string>>;
  quickRegistrationState: OSQuickRegistrationState;
  quickRegistrationActions: OSQuickRegistrationActions;
  submit: () => void;
  adicionarDespesa: () => void;
  adicionarCampoPersonalizado: () => void;
};

export function OSCreationDialog({
  open, setOpen, creatingOS, form, setForm, clientes, tecnicos, valorKmInput, setValorKmInput,
  analistasNovaOS, novosDadosExtras, setNovosDadosExtras, novoCampoNome, setNovoCampoNome,
  novoCampoValor, setNovoCampoValor, despesasSelecionadas, setDespesasSelecionadas, despesaTipo,
  setDespesaTipo, despesaValor, setDespesaValor, quickRegistrationState, quickRegistrationActions,
  submit, adicionarDespesa, adicionarCampoPersonalizado,
}: OSCreationDialogProps) {
  const [activeStep, setActiveStep] = useState<OSCreationStep>(creationSteps[0]);
  const {
    quickCliOpen, setQuickCliOpen, quickCliForm, setQuickCliForm, quickCliSaving,
    quickTecOpen, setQuickTecOpen, quickTecForm, setQuickTecForm, quickTecSaving,
    quickAnaOpen, setQuickAnaOpen, quickAnaForm, setQuickAnaForm, quickAnaSaving,
  } = quickRegistrationState;
  const { saveQuickCliente, saveQuickTecnico, saveQuickAnalista } = quickRegistrationActions;
  const activeStepIndex = creationSteps.indexOf(activeStep);
  const goToNextStep = () => {
    if (activeStepIndex === 0 && !hasRequiredOSFields(form.titulo, form.clienteId, form.tecnicoId)) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const nextStep = creationSteps[activeStepIndex + 1];
    if (nextStep) setActiveStep(nextStep);
  };
  return (<>
          <Dialog open={open} onOpenChange={(nextOpen) => {
            if (creatingOS) return;
            if (nextOpen) setActiveStep(creationSteps[0]);
            setOpen(nextOpen);
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-10 bg-gradient-to-r from-primary to-violet shadow-[var(--shadow-glow)] shrink-0">
                <Plus className="w-4 h-4" /> Nova OS
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Ordem de Serviço</DialogTitle>
              </DialogHeader>
              <Tabs
                value={activeStep}
                onValueChange={(value) => setActiveStep(value as OSCreationStep)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="nova_dados">Dados</TabsTrigger>
                  <TabsTrigger value="nova_financeiro">Financeiro</TabsTrigger>
                  <TabsTrigger value="nova_detalhes">Detalhes</TabsTrigger>
                  <TabsTrigger value="nova_extras">Extras</TabsTrigger>
                </TabsList>
                <TabsContent value="nova_dados" className="space-y-4 mt-4">
                  <div>
                    <Label>Título *</Label>
                    <Input
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      placeholder="Ex: Manutenção câmara fria"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label>Endereço do Serviço</Label>
                    <Input
                      value={form.endereco_servico}
                      onChange={(e) => setForm({ ...form, endereco_servico: e.target.value })}
                      placeholder="Av Paulista, 1000 - Bela Vista - São Paulo / SP"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Endereço onde o serviço será executado (Obrigatório).
                    </p>
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
                          label: c.ativo === false ? `${c.nome} (Inativo)` : c.nome,
                          disabled: c.ativo === false,
                        }))}
                        value={form.clienteId}
                        onChange={(v) => {
                          const cliente = clientes.find((c) => c.id === v);
                          const oldCliente = clientes.find((c) => c.id === form.clienteId);

                          const baseKm = cliente?.base_km || 0;
                          const valorPorKm = cliente?.valor_por_km || 0;
                          const novoTemplate = cliente?.template_rat_texto || "";
                          const oldTemplate = oldCliente?.template_rat_texto || "";

                          let novaDescricao = form.descricao_problema;
                          if (!novaDescricao || novaDescricao === oldTemplate) {
                            novaDescricao = novoTemplate;
                          }

                          setValorKmInput(valorPorKm ? String(valorPorKm) : "");

                          setForm({
                            ...form,
                            clienteId: v,
                            km_viagem: baseKm ? String(baseKm) : "",
                            custo_viagem: baseKm && valorPorKm ? calculateTravelCost(baseKm, valorPorKm) : "",
                            descricao_problema: novaDescricao,
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
                    <div className="flex items-center justify-between">
                      <Label>Analista / Suporte Responsável</Label>
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
                    </div>
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
                        max="9999-12-31"
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
                </TabsContent>

                <TabsContent value="nova_financeiro" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Valor estimado (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.valor}
                        onChange={(e) => {
                          if (isNegativeNumericInput(e.target.value)) return;
                          setForm({ ...form, valor: e.target.value });
                        }}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label>Km viagem</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.km_viagem}
                        onChange={(e) => {
                          if (isNegativeNumericInput(e.target.value)) return;
                          const vKm = Number(valorKmInput);
                          setForm({
                            ...form,
                            km_viagem: e.target.value,
                            custo_viagem: vKm
                              ? calculateTravelCost(e.target.value, vKm)
                              : form.custo_viagem,
                          });
                        }}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label>Valor do KM (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valorKmInput}
                        onChange={(e) => {
                          if (isNegativeNumericInput(e.target.value)) return;
                          setValorKmInput(e.target.value);
                          const vKm = Number(e.target.value);
                          setForm({
                            ...form,
                            custo_viagem: vKm
                              ? calculateTravelCost(form.km_viagem, vKm)
                              : form.custo_viagem,
                          });
                        }}
                        placeholder="0,00"
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Custo viagem (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.custo_viagem}
                        onChange={(e) => {
                          if (isNegativeNumericInput(e.target.value)) return;
                          setForm({ ...form, custo_viagem: e.target.value });
                        }}
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
                              R$ {formatOSCurrency(despesa.valor)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                  {(() => {
                    const subtotal = Number(form.valor || 0);
                    const custoViagem = Number(form.custo_viagem || 0);
                    const somaDespesas = sumOSExpenses(despesasSelecionadas);
                    const custosExtras = custoViagem + somaDespesas;
                    const total = calculateInvoicedTotal(subtotal, custosExtras);
                    const fmt = formatOSCurrency;
                    return (
                      <>
                        <div className="rounded-xl border border-border/60 bg-primary/5 p-3 text-sm space-y-1 mb-4">
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
                      </>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="nova_detalhes" className="space-y-4 mt-4">
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
                        {OS_STATUSES.map((c) => (
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
                </TabsContent>

                <TabsContent value="nova_extras" className="space-y-4 mt-4">
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
                </TabsContent>
              </Tabs>
              <DialogFooter>
                {activeStepIndex > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep(creationSteps[activeStepIndex - 1])}
                  >
                    Voltar
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                {activeStepIndex < creationSteps.length - 1 ? (
                  <Button type="button" onClick={goToNextStep}>
                    Próximo passo
                  </Button>
                ) : (
                  <Button type="button" onClick={submit} disabled={creatingOS}>
                    {creatingOS ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    {creatingOS ? "Criando..." : "Criar OS"}
                  </Button>
                )}
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
                      onChange={(e) => setQuickCliForm({ ...quickCliForm, telefone: maskPhoneBR(e.target.value) })}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text");
                        setQuickCliForm({ ...quickCliForm, telefone: maskPhoneBR(pasted) });
                      }}
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
                <Button variant="outline" onClick={() => setQuickCliOpen(false)} disabled={quickCliSaving}>
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
                    <Label>{quickTecForm.tipo_comissao === "fixo" ? "Valor (R$)" : "Comissão (%)"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={quickTecForm.comissao}
                      onChange={(e) => setQuickTecForm({ ...quickTecForm, comissao: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dica: para configurar login e senha do técnico, use a tela de Equipe.
                </p>
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

          {/* Dialog Cadastro Rápido Analista */}
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
          </Dialog>  </>);
}
