import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Button } from "@/components/ui/button";
import { useStore, OS } from "@/lib/useData";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { logActivity } from "@/lib/logger";
import { Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ImportarOSDialog } from "@/components/ImportarOSDialog";
import { MesAnoFilter } from "@/components/MesAnoFilter";
import type { OSStatus } from "@/lib/useData";
import {
  isValidExpenseAmount,
  OS_ALLOWED_ROLES,
} from "./os/os.rules";
import { useAnalistasByCliente } from "./os/use-analistas-by-cliente";
import { useOSTableDrag } from "./os/use-os-table-drag";
import { useOSUrlId } from "./os/use-os-url-id";
import { useOSListInvalidation } from "./os/use-os-list-invalidation";
import {
  useOSQuickRegistrationActions,
  useOSQuickRegistrationState,
} from "./os/use-os-quick-registrations";
import { useOSDeletion } from "./os/use-os-deletion";
import { useOSCreationActions, useOSCreationRequestId } from "./os/use-os-creation";
import { useOSEditSave } from "./os/use-os-edit-save";
import { EditOSDialog } from "./os/EditOSDialog";
import { OSListView } from "./os/OSListView";
import { OSCreationDialog } from "./os/OSCreationDialog";
export { EditOSDialog } from "./os/EditOSDialog";

export const Route = createFileRoute("/os")({
  component: () => (
    <ProtectedRoute allowedRoles={OS_ALLOWED_ROLES}>
      <OSPage />
    </ProtectedRoute>
  ),
});

function OSPage() {
  const {
    os,
    allClientes: clientes,
    allTecnicos: tecnicos,
    addOS,
    updateOS,
    addCliente,
    addTecnico,
    equipamentos,
    loadingOS,
    osPage,
    osTotal,
    osPageSize,
    setOsPageSize,
    setOsPage,
    osSearchCliente,
    setOsSearchCliente,
    osSearchTecnico,
    setOsSearchTecnico,
    osFilterStatus,
    setOsFilterStatus,
    osSortField,
    setOsSortField,
    osSortDirection,
    setOsSortDirection,
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

  useOSListInvalidation(
    queryClient,
    osPage,
    osSearchCliente,
    osSearchTecnico,
    osFilterStatus,
    osMonth,
    osYear,
    osSortField,
    osSortDirection,
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OS | null>(null);
  const [creatingOS, setCreatingOS] = useState(false);
  const { deletingOSIds, handleDeleteOS } = useOSDeletion({
    os,
    nomeUsuario,
    queryClient,
    registrarLog,
  });
  const createOSRequestId = useOSCreationRequestId();

  function handleOSFoundFromUrl(data: unknown) {
    setEditing(data as any);
    setDialogMode("view");
  }
  useOSUrlId(handleOSFoundFromUrl);
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
    endereco_servico: "",
    valor_adiantado: "",
    descricao_adiantamento: "",
    equipamentosIds: [] as string[],
  });
  const [valorKmInput, setValorKmInput] = useState("");
  const { analistas: analistasNovaOS, setAnalistas: setAnalistasNovaOS } = useAnalistasByCliente(form.clienteId);
  const [novosDadosExtras, setNovosDadosExtras] = useState<NonNullable<OS["dados_adicionais"]>>({});
  const [novoCampoNome, setNovoCampoNome] = useState("");
  const [novoCampoValor, setNovoCampoValor] = useState("");
  const [despesasSelecionadas, setDespesasSelecionadas] = useState<Array<{ tipo: string; valor: number }>>([]);
  const [despesaTipo, setDespesaTipo] = useState("Pedágio");
  const [despesaValor, setDespesaValor] = useState("");

  // Fase 4 — Modais "Cadastrar Novo" dentro da OS
  const quickRegistrationState = useOSQuickRegistrationState();
  const quickRegistrationActions = useOSQuickRegistrationActions({
    state: quickRegistrationState,
    empresaId,
    clienteId: form.clienteId,
    addCliente,
    addTecnico,
    onClienteCreated: (id) => setForm((f) => ({ ...f, clienteId: id })),
    onTecnicoCreated: (id) => setForm((f) => ({ ...f, tecnicoId: id })),
    onAnalistaCreated: (data) => {
      setAnalistasNovaOS((prev) => [...prev, data]);
      setForm((f) => ({ ...f, analistaId: data.id }));
    },
  });
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const tableDrag = useOSTableDrag();

  const { submit } = useOSCreationActions({
    empresaId,
    profile,
    nomeUsuario,
    form,
    setForm,
    createOSRequestId,
    setCreatingOS,
    setOpen,
    addOS,
    equipamentos,
    novosDadosExtras,
    setNovosDadosExtras,
    despesasSelecionadas,
    setDespesasSelecionadas,
    setDespesaValor,
    registrarLog,
  });

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
    if (!isValidExpenseAmount(despesaValor)) {
      toast.error("Informe um valor maior que zero para a despesa");
      return;
    }
    setDespesasSelecionadas((prev) => [...prev, { tipo: despesaTipo, valor }]);
    setDespesaTipo("Pedágio");
    setDespesaValor("");
  };

  const { onSave } = useOSEditSave({
    editing,
    updateOS,
    tecnicos,
    registrarLog,
    nomeUsuario,
    setEditing,
  });

  return (
    <GestorLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">Ordens de Serviço</h2>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <MesAnoFilter />
          <ImportarOSDialog
            trigger={
              <Button variant="outline" className="rounded-xl h-10 gap-1.5 shrink-0">
                <Upload className="w-4 h-4" /> Importar Planilha
              </Button>
            }
          />
          <OSCreationDialog
            open={open}
            setOpen={setOpen}
            creatingOS={creatingOS}
            form={form}
            setForm={setForm}
            clientes={clientes}
            tecnicos={tecnicos}
            valorKmInput={valorKmInput}
            setValorKmInput={setValorKmInput}
            analistasNovaOS={analistasNovaOS}
            novosDadosExtras={novosDadosExtras}
            setNovosDadosExtras={setNovosDadosExtras}
            novoCampoNome={novoCampoNome}
            setNovoCampoNome={setNovoCampoNome}
            novoCampoValor={novoCampoValor}
            setNovoCampoValor={setNovoCampoValor}
            despesasSelecionadas={despesasSelecionadas}
            setDespesasSelecionadas={setDespesasSelecionadas}
            despesaTipo={despesaTipo}
            setDespesaTipo={setDespesaTipo}
            despesaValor={despesaValor}
            setDespesaValor={setDespesaValor}
            quickRegistrationState={quickRegistrationState}
            quickRegistrationActions={quickRegistrationActions}
            submit={submit}
            adicionarDespesa={adicionarDespesa}
            adicionarCampoPersonalizado={adicionarCampoPersonalizado}
          />
        </div>
      </div>

      <OSListView
        os={os}
        clientes={clientes}
        tecnicos={tecnicos}
        loadingOS={loadingOS}
        osTotal={osTotal}
        osPage={osPage}
        osPageSize={osPageSize}
        setOsPage={setOsPage}
        setOsPageSize={setOsPageSize}
        osSortField={osSortField}
        setOsSortField={setOsSortField}
        osSortDirection={osSortDirection}
        setOsSortDirection={setOsSortDirection}
        setOpen={setOpen}
        editingSetter={setEditing}
        setDialogMode={setDialogMode}
        deletingOSIds={deletingOSIds}
        handleDeleteOS={handleDeleteOS}
        drag={tableDrag}
      />

      <EditOSDialog
        mode={dialogMode}
        ordem={editing}
        clientes={clientes}
        tecnicos={tecnicos}
        addCliente={addCliente}
        addTecnico={addTecnico}
        onClose={() => setEditing(null)}
        onEdit={() => setDialogMode("edit")}
        onSave={onSave}
      />
    </GestorLayout>
  );
}
