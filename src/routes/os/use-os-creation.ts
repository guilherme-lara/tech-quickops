import { useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { toast } from "sonner";
import { withSingleFlight } from "@/lib/single-flight";
import type { AuthProfile } from "@/lib/auth-context";
import type { EquipamentoCliente, OS, OSStatus } from "@/lib/useData";
import { PlanType } from "@/lib/planLimits";
import { supabase } from "@/integrations/supabase/client";
import { getOSMonthlyLimit, hasRequiredOSFields } from "./os.rules";

export type OSCreateForm = {
  titulo: string;
  clienteId: string;
  tecnicoId: string;
  analistaId: string;
  valor: string;
  custo_viagem: string;
  km_viagem: string;
  data_agendamento: string;
  horario_atendimento: string;
  descricao_problema: string;
  status: OSStatus;
  endereco_servico: string;
  valor_adiantado: string;
  descricao_adiantamento: string;
  equipamentosIds: string[];
};

type AddOSInput = Omit<OS, "id" | "numero" | "criadaEm" | "rat"> & {
  equipamentosIds?: string[];
  idempotencyKey?: string;
};

export function useOSCreationRequestId(): MutableRefObject<string | null> {
  return useRef<string | null>(null);
}

export function useOSCreationActions(input: {
  empresaId: string | undefined;
  profile: AuthProfile | null;
  nomeUsuario: string;
  form: OSCreateForm;
  setForm: Dispatch<SetStateAction<OSCreateForm>>;
  createOSRequestId: MutableRefObject<string | null>;
  setCreatingOS: Dispatch<SetStateAction<boolean>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  addOS: (os: AddOSInput) => Promise<void>;
  equipamentos: EquipamentoCliente[];
  novosDadosExtras: NonNullable<OS["dados_adicionais"]>;
  setNovosDadosExtras: Dispatch<SetStateAction<NonNullable<OS["dados_adicionais"]>>>;
  despesasSelecionadas: Array<{ tipo: string; valor: number }>;
  setDespesasSelecionadas: Dispatch<SetStateAction<Array<{ tipo: string; valor: number }>>>;
  setDespesaValor: Dispatch<SetStateAction<string>>;
  registrarLog: (tipo: string, descricao: string) => Promise<void>;
}) {
  const submit = () =>
    withSingleFlight(`ordens-servico:create:${input.empresaId}`, async () => {
      input.setCreatingOS(true);
      try {
        if (!hasRequiredOSFields(input.form.titulo, input.form.clienteId, input.form.tecnicoId)) {
          toast.error("Preencha todos os campos obrigatórios");
          return;
        }

        if (!(input.form as any).id) {
          const planoAtual = (input.profile?.empresaPlano as PlanType) || "free";
          const limiteOs = getOSMonthlyLimit(planoAtual);

          const { count, error } = await supabase
            .from("ordens_servico")
            .select("id", { count: "exact", head: true })
            .eq("empresa_id", input.profile?.empresa_id as string)
            .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

          if (!error && count !== null && count >= limiteOs) {
            toast.error(`Limite atingido! Seu plano atual permite no máximo ${limiteOs} OS por mês.`);
            return;
          }
        }

        await input.addOS({
          titulo: input.form.titulo,
          clienteId: input.form.clienteId,
          tecnicoId: input.form.tecnicoId,
          idempotencyKey: (input.createOSRequestId.current ??= crypto.randomUUID()),
          analistaId: input.form.analistaId || undefined,
          valor: Number(input.form.valor) || 0,
          custo_viagem: Number(input.form.custo_viagem) || 0,
          km_viagem: Number(input.form.km_viagem) || 0,
          despesas: input.despesasSelecionadas,
          data_agendamento: input.form.data_agendamento || undefined,
          horario_atendimento: input.form.horario_atendimento || undefined,
          descricao_problema: input.form.descricao_problema,
          status: input.form.status,
          dados_adicionais: input.novosDadosExtras,
          endereco_servico: input.form.endereco_servico,
          equipamentosIds: input.form.equipamentosIds,
        });

        let logMsg = `OS "${input.form.titulo}" criada por ${input.nomeUsuario}`;
        if (input.form.equipamentosIds && input.form.equipamentosIds.length > 0) {
          const equipNames = input.equipamentos
            .filter((e) => input.form.equipamentosIds.includes(e.id))
            .map((e) => e.nome)
            .join(", ");
          logMsg += ` e vinculada aos equipamentos: ${equipNames}`;
        }
        await input.registrarLog("os_criada", logMsg);

        toast.success("OS criada com sucesso");
        input.createOSRequestId.current = null;
        input.setOpen(false);
        input.setForm({
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
          endereco_servico: "",
          valor_adiantado: "",
          descricao_adiantamento: "",
          equipamentosIds: [],
        });
        input.setNovosDadosExtras({});
        input.setDespesasSelecionadas([]);
        input.setDespesaValor("");
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao criar OS");
      } finally {
        input.setCreatingOS(false);
      }
    });

  return { submit };
}
