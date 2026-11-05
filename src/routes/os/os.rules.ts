import type { OS, OSStatus, Role } from "@/lib/useData";
import { PlanLimits, type PlanType } from "@/lib/planLimits";

export const OS_ALLOWED_ROLES: Role[] = ["gestor", "analista", "admin", "superadmin"];
export const OS_STATUSES: OSStatus[] = [
  "Aguardando Confirmação",
  "Agendamento",
  "Em Andamento",
  "Em Deslocamento",
  "Concluído Técnico",
  "Pendência",
  "Concluído",
  "Cancelado",
];

export function getOSMonthlyLimit(plan: PlanType): number {
  return PlanLimits[plan].maxOsMes;
}

export function buildEditOSPatch(input: {
  ordem: OS;
  form: {
    titulo: string;
    clienteId: string;
    tecnicoId: string;
    analistaId: string;
    valor: string;
    custo_viagem: string;
    km_viagem: string;
    status: OSStatus;
    pendencias_detalhes: string;
    endereco_servico: string;
    valor_adiantado: string;
    descricao_adiantamento: string;
    equipamentosIds: string[];
  };
  descricaoProblema: string;
  dataAgendamento: string;
  horarioAtendimento: string;
  dadosExtras: NonNullable<OS["dados_adicionais"]>;
  despesasEdit: Array<{ tipo: string; valor: number }>;
  lancamentosEdit: Array<{ tipo: string; valor: number; descricao?: string }>;
  recebidoCliente: boolean;
  overrideStatus?: unknown;
}): Partial<OS> {
  const { ordem, form, overrideStatus } = input;
  const status = typeof overrideStatus === "string" ? overrideStatus : form.status;

  return {
    titulo: form.titulo,
    clienteId: form.clienteId,
    tecnicoId: form.tecnicoId,
    analistaId: form.analistaId || undefined,
    valor: Number(form.valor) || 0,
    custo_viagem: Number(form.custo_viagem) || 0,
    km_viagem: Number(form.km_viagem) || 0,
    despesas: input.despesasEdit,
    data_agendamento: input.dataAgendamento || ordem.data_agendamento || undefined,
    horario_atendimento: input.horarioAtendimento || ordem.horario_atendimento || undefined,
    descricao_problema: input.descricaoProblema,
    status,
    dados_adicionais: input.dadosExtras,
    pendencias_detalhes: isOSFinalizada(status) ? null : form.pendencias_detalhes || null,
    endereco_servico: form.endereco_servico || undefined,
    valor_adiantado: form.valor_adiantado ? parseFloat(form.valor_adiantado) : 0,
    descricao_adiantamento: form.descricao_adiantamento || undefined,
    equipamentosClienteIds: form.equipamentosIds,
    lancamentos_adicionais: input.lancamentosEdit,
    recebido_cliente: input.recebidoCliente,
  } as Partial<OS>;
}

export function detectOSEditChanges(ordem: OS, patch: Partial<OS>) {
  return {
    statusChanged: patch.status !== undefined && patch.status !== ordem.status,
    technicianChanged: patch.tecnicoId !== undefined && patch.tecnicoId !== ordem.tecnicoId,
    equipmentChanged: patch.equipamentosClienteIds !== undefined,
  };
}

export function hasRequiredOSFields(titulo: string, clienteId: string, tecnicoId: string): boolean {
  return Boolean(titulo && clienteId && tecnicoId);
}

export function isValidExpenseAmount(input: string): boolean {
  return (Number(input) || 0) > 0;
}

export function isValidTechnicianEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isNegativeNumericInput(value: string): boolean {
  return Number(value) < 0;
}

export function getOSPagination(total: number, page: number, pageSize: number): {
  totalPages: number;
  start: number;
  end: number;
} {
  return {
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    start: page * pageSize + 1,
    end: Math.min((page + 1) * pageSize, total),
  };
}

export function calculateTravelCost(kilometers: number | string, valuePerKilometer: number | string): string {
  return String(Number(kilometers) * Number(valuePerKilometer));
}

export function sumOSExpenses(expenses: readonly { valor: number }[]): number {
  return expenses.reduce((sum, item) => sum + Number(item.valor || 0), 0);
}

export function calculateInvoicedTotal(serviceValue: number, extraCosts: number): number {
  return serviceValue + extraCosts;
}

export function formatOSCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export function isOSFinalizada(status?: string): boolean {
  return (
    status === "Concluído" ||
    status === "Concluído Técnico" ||
    status === "concluido" ||
    status === "concluido_tecnico"
  );
}
