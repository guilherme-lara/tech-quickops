import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente, Tecnico } from "@/lib/useData";
import { isValidTechnicianEmail } from "./os.rules";
import type { AnalistaOpt } from "./use-analistas-by-cliente";

export function useOSQuickRegistrationState() {
  const [quickCliOpen, setQuickCliOpen] = useState(false);
  const [quickCliForm, setQuickCliForm] = useState({ nome: "", telefone: "", email: "" });
  const [quickCliSaving, setQuickCliSaving] = useState(false);
  const [quickTecOpen, setQuickTecOpen] = useState(false);
  const [quickTecForm, setQuickTecForm] = useState({
    nome: "",
    perfil: "Técnico de Campo",
    telefone: "",
    email: "",
    comissao: "",
    tipo_comissao: "porcentagem" as "porcentagem" | "fixo",
  });
  const [quickTecSaving, setQuickTecSaving] = useState(false);
  const [quickAnaOpen, setQuickAnaOpen] = useState(false);
  const [quickAnaForm, setQuickAnaForm] = useState({ nome: "", whatsapp: "" });
  const [quickAnaSaving, setQuickAnaSaving] = useState(false);

  return {
    quickCliOpen,
    setQuickCliOpen,
    quickCliForm,
    setQuickCliForm,
    quickCliSaving,
    setQuickCliSaving,
    quickTecOpen,
    setQuickTecOpen,
    quickTecForm,
    setQuickTecForm,
    quickTecSaving,
    setQuickTecSaving,
    quickAnaOpen,
    setQuickAnaOpen,
    quickAnaForm,
    setQuickAnaForm,
    quickAnaSaving,
    setQuickAnaSaving,
  };
}

type QuickRegistrationState = ReturnType<typeof useOSQuickRegistrationState>;

export function useOSQuickRegistrationActions(input: {
  state: QuickRegistrationState;
  empresaId: string | undefined;
  clienteId: string;
  addCliente: (cliente: Omit<Cliente, "id">) => Promise<string>;
  addTecnico: (tecnico: Omit<Tecnico, "id">) => Promise<string>;
  onClienteCreated: (id: string) => void;
  onTecnicoCreated: (id: string) => void;
  onAnalistaCreated: (analista: AnalistaOpt) => void;
}) {
  const { state } = input;

  const saveQuickCliente = async () => {
    if (!state.quickCliForm.nome.trim()) return toast.error("Informe o nome do cliente");
    state.setQuickCliSaving(true);
    try {
      const id = await input.addCliente({
        nome: state.quickCliForm.nome,
        documento: "",
        telefone: state.quickCliForm.telefone,
        email: state.quickCliForm.email,
      });
      input.onClienteCreated(id);
      toast.success("Cliente cadastrado e selecionado");
      state.setQuickCliOpen(false);
      state.setQuickCliForm({ nome: "", telefone: "", email: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao cadastrar cliente");
    } finally {
      state.setQuickCliSaving(false);
    }
  };

  const saveQuickTecnico = async () => {
    if (!state.quickTecForm.nome.trim()) return toast.error("Informe o nome do técnico");
    const email = state.quickTecForm.email.trim();
    if (!email) return toast.error("Informe o e-mail do técnico (obrigatório para notificações)");
    if (!isValidTechnicianEmail(email)) return toast.error("E-mail do técnico inválido");
    state.setQuickTecSaving(true);
    try {
      const id = await input.addTecnico({
        nome: state.quickTecForm.nome,
        perfil: state.quickTecForm.perfil,
        telefone: state.quickTecForm.telefone,
        ativo: true,
        comissao: Number(state.quickTecForm.comissao) || 0,
        tipo_comissao: state.quickTecForm.tipo_comissao,
        chave_pix: "",
        email_notificacoes: email,
      } as any);
      input.onTecnicoCreated(id);
      toast.success("Técnico cadastrado e selecionado");
      state.setQuickTecOpen(false);
      state.setQuickTecForm({
        nome: "",
        perfil: "Técnico de Campo",
        telefone: "",
        email: "",
        comissao: "",
        tipo_comissao: "porcentagem",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao cadastrar técnico");
    } finally {
      state.setQuickTecSaving(false);
    }
  };

  const saveQuickAnalista = async () => {
    if (!input.clienteId) return toast.error("Selecione um cliente primeiro para cadastrar o analista");
    if (!state.quickAnaForm.nome.trim()) return toast.error("Informe o nome do analista");
    state.setQuickAnaSaving(true);
    try {
      const { data, error } = await (supabase.from("analistas_cliente" as any) as any)
        .insert([
          {
            empresa_id: input.empresaId,
            nome: state.quickAnaForm.nome,
            whatsapp: state.quickAnaForm.whatsapp,
            cliente_id: input.clienteId,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      input.onAnalistaCreated(data);
      toast.success("Analista cadastrado e selecionado");
      state.setQuickAnaOpen(false);
      state.setQuickAnaForm({ nome: "", whatsapp: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao cadastrar analista");
    } finally {
      state.setQuickAnaSaving(false);
    }
  };

  return { saveQuickCliente, saveQuickTecnico, saveQuickAnalista };
}
