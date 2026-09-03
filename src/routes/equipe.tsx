import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type TipoComissao, PAGE_SIZE, useStore } from "@/lib/useData";
import { useTecnicos, useUpdateTecnico, useDeleteTecnico, useActiveOSCount } from "@/hooks/useTecnicos";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import {
  Phone,
  BadgeCheck,
  Plus,
  Users,
  List,
  LayoutGrid,
  MoreVertical,
  Edit2,
  Ban,
  Eye,
  EyeOff,
  Copy,
  ChevronLeft,
  ChevronRight,
  Check,
  KeyRound,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Wrench,
  Trash2
} from "lucide-react";
import { GerarAcessoDialog } from "@/components/GerarAcessoDialog";
import { TecnicoEmailStatus } from "@/components/TecnicoEmailStatus";
import { useConfirm } from "@/components/ConfirmDialogProvider";

function UsernameField({ userId, initialUsername, empresaId, nomeCompleto }: { userId: string, initialUsername?: string, empresaId?: string, nomeCompleto?: string }) {
  const qc = useQueryClient();
  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil_username', userId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('perfis') as any).select('username').eq('id', userId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  const updateUsername = useMutation({
    mutationFn: async (newUsername: string) => {
      if (!newUsername.trim()) throw new Error("Usuário não pode ser vazio");
      if (!/^[a-z0-9._-]+$/i.test(newUsername)) throw new Error("Usuário inválido (use letras, números, . _ -)");
      
      const { data, error } = await (supabase.from('perfis') as any).upsert({ 
        id: userId,
        empresa_id: empresaId!,
        nome_completo: nomeCompleto || 'Técnico',
        role: 'tecnico',
        username: newUsername 
      }).select();
      
      if (error) {
        if (error.code === '23505' || /duplicate key/.test(error.message)) {
          throw new Error("Este usuário já está em uso");
        }
        if (error.code === '23503' && /auth\.users/.test(error.message)) {
          throw new Error("Técnico não possui conta de acesso (auth.users).");
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil_username', userId] });
      toast.success("Login salvo com sucesso!");
    },
    onError: (e: any) => {
      toast.error(e.message || "Erro ao salvar username");
    }
  });

  const [localUsername, setLocalUsername] = useState("");

  const currentUsername = perfil?.username || initialUsername;

  if (isLoading) {
    return (
      <div>
        <Label>Login do Técnico</Label>
        <Input disabled placeholder="Carregando..." className="bg-muted/50" />
      </div>
    );
  }

  if (currentUsername) {
    return (
      <div>
        <Label>Login do Técnico</Label>
        <Input value={currentUsername} disabled className="bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <Label>Usuário (login)</Label>
      </div>
      <div className="flex gap-2">
        <Input 
          value={localUsername} 
          onChange={e => setLocalUsername(e.target.value.toLowerCase())} 
          placeholder="ex: joao.adami" 
          disabled={updateUsername.isPending}
        />
        <Button 
          type="button" 
          onClick={() => updateUsername.mutateAsync(localUsername)}
          disabled={!localUsername || updateUsername.isPending}
        >
          {updateUsername.isPending ? "..." : <Check className="w-4 h-4 mr-1" />}
          Salvar
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Crie um nome de usuário para o técnico fazer login
      </p>
    </div>
  );
}
import { FiltrosBarGlobal } from "@/components/FiltrosBarGlobal";
import { useState } from "react";
import { toast } from "sonner";
import { maskPhoneBR, formatComissao } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { PlanLimits, PlanType } from "@/lib/planLimits";
import { logActivity } from "@/lib/logger";

const PERFIS_TECNICO = ["Técnico de Campo", "Instalador", "Suporte", "Manutenção"];

export const Route = createFileRoute("/equipe")({
  component: () => (
    <ProtectedRoute allowedRoles={['gestor', 'analista', 'admin', 'superadmin']}>
      <EquipePage />
    </ProtectedRoute>
  ),
});


function EquipePage() {
  const [tecnicosPage, setTecnicosPage] = useState(0);
  const [tecnicosSearch, setTecnicosSearch] = useState("");
  const [tecnicosSortField, setTecnicosSortField] = useState<"nome" | "comissao" | "telefone">("nome");
  const [tecnicosSortDirection, setTecnicosSortDirection] = useState<"asc" | "desc">("asc");
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const confirm = useConfirm();
  
  const { tecnicoFerramentas, itens, deleteTecnicoFerramenta } = useStore();
  
  const { data: empresaData } = useQuery({
    queryKey: ["empresa_codigo", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("codigo_empresa").eq("id", empresaId as string).single();
      return data;
    }
  });
  const codigoEmpresa = empresaData?.codigo_empresa || "default";
  
  const { data: activeOS } = useActiveOSCount(empresaId);

  const { data: tecnicosData, isPending: loadingTecnicos } = useTecnicos(
    empresaId,
    tecnicosPage,
    tecnicosSearch,
    tecnicosSortField,
    tecnicosSortDirection
  );
  const tecnicos = tecnicosData?.data || [];
  const tecnicosTotal = tecnicosData?.count || 0;

  const { mutateAsync: updateTecnico } = useUpdateTecnico();
  const { mutateAsync: deleteTecnico } = useDeleteTecnico();
  const nomeUsuario = profile?.nome_completo || "usuário";
  const registrarLog = async (tipo: string, descricao: string) => {
    if (!empresaId) return;
    await logActivity(tipo, descricao, empresaId);
  };
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emptyForm = {
    id: "",
    nome: "",
    perfil: "Técnico de Campo",
    telefone: "",
    username: "",
    comissao: "",
    tipo_comissao: "fixo" as TipoComissao,
    valor_fixo: "",
    meta_chamados: "",
    bonus_excedente: "",
    horas_limite: "",
    valor_hora_extra: "",
    chave_pix: "",
    email_notificacoes: "",
    cidade_atendimento: "",
    raio_atendimento: "",
    contrato_arquivo: "",
    contrato_nome: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [uploadingContrato, setUploadingContrato] = useState(false);

  const handleUploadContrato = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingContrato(true);
      const ext = file.name.split(".").pop();
      const path = `${empresaId || "sem-empresa"}/contrato_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("contratos").upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (error) throw error;
      setForm((prev) => ({ ...prev, contrato_arquivo: path, contrato_nome: file.name }));

      // Em edição, persiste na hora (sem depender de clicar em Salvar)
      if (form.id) {
        const atual = tecnicos.find((t) => t.id === form.id)?.dados_adicionais || {};
        await updateTecnico({
          id: form.id,
          patch: {
            dados_adicionais: { ...atual, contrato_arquivo: path, contrato_nome: file.name },
          },
        });
        toast.success("Contrato salvo!");
      } else {
        toast.success("Contrato anexado! Salve para confirmar.");
      }
    } catch (err: any) {
      toast.error("Erro ao enviar contrato: " + (err?.message ?? ""));
    } finally {
      setUploadingContrato(false);
    }
  };

  const removerContrato = async () => {
    if (!form.contrato_arquivo) return;
    try {
      if (form.id) {
        const atual: Record<string, any> = {
          ...(tecnicos.find((t) => t.id === form.id)?.dados_adicionais || {}),
        };
        delete atual.contrato_arquivo;
        delete atual.contrato_nome;
        await updateTecnico({ id: form.id, patch: { dados_adicionais: atual } });
      }
      setForm((prev) => ({ ...prev, contrato_arquivo: "", contrato_nome: "" }));
      toast.success("Contrato removido.");
    } catch (err: any) {
      toast.error("Erro ao remover contrato: " + (err?.message ?? ""));
    }
  };

  const abrirContrato = async () => {
    if (!form.contrato_arquivo) return;
    const { data, error } = await supabase.storage
      .from("contratos")
      .createSignedUrl(form.contrato_arquivo, 60 * 10);
    if (error || !data?.signedUrl) return toast.error("Não foi possível abrir o contrato");
    window.open(data.signedUrl, "_blank");
  };


  const [gerarAcessoFor, setGerarAcessoFor] = useState<any>(null);
  const [viewFerramentasFor, setViewFerramentasFor] = useState<any>(null);
  const [resetSenhaResult, setResetSenhaResult] = useState<{ texto: string; nome: string } | null>(null);
  const [successCreds, setSuccessCreds] = useState<{ texto: string; nome: string } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  const totalTecnicosPages = Math.max(1, Math.ceil(tecnicosTotal / PAGE_SIZE));

  const openNew = () => {
    setForm(emptyForm);
    setShowPassword(false);
    setOpen(true);
  };

  const openEdit = (t: any) => {
    const dadosAdicionais = t.dados_adicionais || {};
    setForm({
      id: t.id,
      nome: t.nome,
      perfil: t.perfil,
      telefone: t.telefone,
      username: t.username || "",
      comissao: t.comissao != null ? String(t.comissao) : "",
      tipo_comissao: (t.tipo_comissao || "fixo") as TipoComissao,
      valor_fixo: t.valor_fixo ? String(t.valor_fixo) : "",
      meta_chamados: t.meta_chamados ? String(t.meta_chamados) : "",
      bonus_excedente: t.bonus_excedente ? String(t.bonus_excedente) : "",
      horas_limite: t.horas_limite ? String(t.horas_limite) : "",
      valor_hora_extra: t.valor_hora_extra ? String(t.valor_hora_extra) : "",
      chave_pix: t.chave_pix || "",
      email_notificacoes: t.email_notificacoes || "",
      cidade_atendimento: dadosAdicionais.cidade_atendimento || "",
      raio_atendimento: dadosAdicionais.raio_atendimento
        ? String(dadosAdicionais.raio_atendimento)
        : "",
      contrato_arquivo: dadosAdicionais.contrato_arquivo || "",
      contrato_nome: dadosAdicionais.contrato_nome || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ title: "Excluir Técnico", description: "Deseja inativar/excluir este técnico?", destructive: true })) {
      try {
        const tecnico = tecnicos.find((t) => t.id === id);
        await deleteTecnico(id);
        await registrarLog(
          "tecnico_inativado",
          `Técnico "${tecnico?.nome || id}" excluído por ${nomeUsuario}`,
        );
        toast.success("Técnico excluído!");
      } catch (e: any) {
        if (e.code === '23503' || /violates foreign key constraint/i.test(e.message)) {
          toast.info("Técnico possui histórico. Ele será inativado ao invés de excluído.");
          const tecnico = tecnicos.find((t) => t.id === id);
          if (tecnico) {
            await updateTecnico({ id, patch: { ativo: false } });
            toast.success("Técnico inativado com sucesso.");
          }
        } else {
          toast.error("Erro ao excluir técnico: " + e.message);
        }
      }
    }
  };

  const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-8).toUpperCase();
  };

  const handleResetPassword = async (t: any) => {
    if (!(await confirm({ title: "Nova Senha", description: `Deseja gerar uma nova senha para ${t.nome}?` }))) return;
    
    setSaving(true);
    try {
      const novaSenha = generateRandomPassword();
      const { error } = await supabase.rpc("resetar_senha_tecnico", {
        p_tecnico_id: t.user_id || t.id,
        p_nova_senha: novaSenha
      });
      
      if (error) throw error;
      
      await registrarLog("senha_resetada", `Senha de "${t.nome}" redefinida por ${nomeUsuario}`);
      
      const login = t.username || "—";
      const empresaStr = profile?.empresaNome || "QuickOps";
      const text = `Olá ${t.nome}!\n\nSua senha de acesso ao sistema da empresa *${empresaStr}* foi redefinida.\n\nAqui estão suas novas credenciais:\n\n🏢 Código da Empresa: ${codigoEmpresa}\n👤 Usuário: ${login}\n🔑 Nova Senha: ${novaSenha}\n\nAcesse o link do sistema para entrar.`;
      
      setResetSenhaResult({ texto: text, nome: t.nome });
      
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao resetar senha");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!form.nome.trim()) return toast.error("Informe o nome do técnico");

    // Limites de Plano para Criação
    if (!form.id) {
      const planoAtual = (profile?.empresaPlano as PlanType) || "free";
      const limiteTecnicos = PlanLimits[planoAtual].maxTecnicos;
      if (tecnicosTotal >= limiteTecnicos) {
        return toast.error(`Limite do Plano atingido! Seu plano atual permite no máximo ${limiteTecnicos} técnicos.`);
      }
    }

    setSaving(true);
    try {
      if (form.id) {
        const dadosAdicionais: any = {
          ...(tecnicos.find((t) => t.id === form.id)?.dados_adicionais || {}),
        };
        if (form.cidade_atendimento) dadosAdicionais.cidade_atendimento = form.cidade_atendimento;
        if (form.raio_atendimento) dadosAdicionais.raio_atendimento = Number(form.raio_atendimento);
        if (form.contrato_arquivo) {
          dadosAdicionais.contrato_arquivo = form.contrato_arquivo;
          dadosAdicionais.contrato_nome = form.contrato_nome;
        } else {
          delete dadosAdicionais.contrato_arquivo;
          delete dadosAdicionais.contrato_nome;
        }

        await updateTecnico({
          id: form.id,
          patch: {
            nome: form.nome,
            perfil: form.perfil,
            telefone: form.telefone,
            comissao: Number(form.comissao) || 0,
            tipo_comissao: form.tipo_comissao,
            valor_fixo: Number(form.valor_fixo) || 0,
            meta_chamados: Number(form.meta_chamados) || 0,
            bonus_excedente: Number(form.bonus_excedente) || 0,
            horas_limite: Number(form.horas_limite) || 0,
            valor_hora_extra: Number(form.valor_hora_extra) || 0,
            chave_pix: form.chave_pix,
            username: form.username,
            email_notificacoes: form.email_notificacoes,
            ativo: true,
            dados_adicionais: dadosAdicionais,
          },
        });
        await registrarLog("tecnico_editado", `Técnico "${form.nome}" editado por ${nomeUsuario}`);
        toast.success("Técnico atualizado!");
      } else {
        // Novo técnico → cria auth user via RPC (sem perder sessão).
        if (!form.username.trim()) return toast.error("Informe o usuário (ex: joao.adami)");
        if (!/^[a-z0-9._-]+$/i.test(form.username))
          return toast.error("Usuário inválido (use letras, números, . _ -)");

        const novaSenha = generateRandomPassword();

        const { data: novoTecnicoId, error } = await (supabase.rpc as any)("criar_tecnico", {
          p_nome: form.nome,
          p_username: form.username.toLowerCase(),
          p_senha: novaSenha,
          p_telefone: form.telefone || null,
          p_tipo_comissao: form.tipo_comissao,
          p_comissao: Number(form.comissao) || 0,
          p_chave_pix: form.chave_pix || null,
          p_dados_adicionais: {
            perfil: form.perfil || null,
            cidade_atendimento: form.cidade_atendimento || null,
            raio_atendimento: form.raio_atendimento ? Number(form.raio_atendimento) : null,
            contrato_arquivo: form.contrato_arquivo || null,
            contrato_nome: form.contrato_nome || null,
          },
          p_email_notificacoes: form.email_notificacoes || null,
        });
        if (error) throw error;
        // Campos de contrato/produtividade não fazem parte da RPC — atualiza em seguida
        if (novoTecnicoId) {
          await updateTecnico({
            id: novoTecnicoId,
            patch: {
              valor_fixo: Number(form.valor_fixo) || 0,
              meta_chamados: Number(form.meta_chamados) || 0,
              bonus_excedente: Number(form.bonus_excedente) || 0,
              horas_limite: Number(form.horas_limite) || 0,
              valor_hora_extra: Number(form.valor_hora_extra) || 0,
            },
          });
        }
        await registrarLog(
          "tecnico_criado",
          `Técnico "${form.nome}" cadastrado por ${nomeUsuario}`,
        );
        qc.invalidateQueries({ queryKey: ["tecnicos"] });
        qc.invalidateQueries({ queryKey: ["equipe_tecnicos"] });
        const login = form.username.toLowerCase();
        
        const empresaStr = profile?.empresaNome || codigoEmpresa;
        const text = `Olá ${form.nome}! Bem-vindo(a) à nossa equipe técnica.\n\nSeu acesso foi vinculado à empresa: ${empresaStr}\n\nAqui estão suas credenciais exclusivas de acesso ao aplicativo:\n\n🏢 Código da Empresa: ${codigoEmpresa}\n👤 Usuário: ${login}\n🔑 Senha: ${novaSenha}\n\nPara acessar, acesse o link do sistema.`;
        
        setSuccessCreds({ texto: text, nome: form.nome });
      }
      setOpen(false);
      setForm(emptyForm);
    } catch (e: any) {
      const msg: string = e?.message ?? "Erro ao salvar";
      const code: string = e?.code ?? "";
      const isDup =
        code === "23505" ||
        /already registered|already exists|duplicate key|já está em uso|já está registrado/i.test(
          msg,
        );
      if (isDup) {
        toast.error("Este técnico já possui um login cadastrado");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <GestorLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">Equipe técnica</h2>
          <p className="text-sm text-muted-foreground">{tecnicosTotal} técnicos cadastrados</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center rounded-lg bg-muted/50 p-1">
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="w-4 h-4" /> Novo Técnico
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar Técnico" : "Novo Técnico"}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="dados" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dados">Dados</TabsTrigger>
                  <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  <TabsTrigger value="contrato">Contrato</TabsTrigger>
                  <TabsTrigger value="emails">E-mails</TabsTrigger>
                </TabsList>
                <TabsContent value="dados" className="space-y-3 mt-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Perfil</Label>
                  <Select
                    value={form.perfil}
                    onValueChange={(v) => setForm({ ...form, perfil: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PERFIS_TECNICO.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.id ? (
                  <UsernameField 
                    userId={form.id} 
                    initialUsername={form.username} 
                    empresaId={empresaId} 
                    nomeCompleto={form.nome} 
                  />
                ) : (
                  <div>
                    <Label>Usuário (login)</Label>
                    <Input
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value.toLowerCase() })
                      }
                      placeholder="joao.adami"
                    />
                  </div>
                )}
                <div>
                  <Label>E-mail para notificações (opcional)</Label>
                  <Input
                    type="email"
                    value={form.email_notificacoes}
                    onChange={(e) => setForm({ ...form, email_notificacoes: e.target.value.trim() })}
                    placeholder="tecnico@email.com — recebe aviso de OS atribuída"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: maskPhoneBR(e.target.value) })}
                    placeholder="(11) 99999-0000"
                    inputMode="numeric"
                  />
                </div>
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-3 mt-4">
                <div>
                  <Label>Tipo de comissão</Label>
                  <Select
                    value={form.tipo_comissao}
                    onValueChange={(v) => setForm({ ...form, tipo_comissao: v as TipoComissao })}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>
                      {form.tipo_comissao === "fixo" ? "Valor fixo (R$)" : "Comissão (%)"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.comissao}
                      onChange={(e) => setForm({ ...form, comissao: e.target.value })}
                      placeholder={form.tipo_comissao === "fixo" ? "Ex: 150,00" : "Ex: 30"}
                    />
                  </div>
                  <div>
                    <Label>Chave PIX</Label>
                    <Input
                      value={form.chave_pix}
                      onChange={(e) => setForm({ ...form, chave_pix: e.target.value })}
                      placeholder="Email, CPF, Celular ou Aleatória"
                    />
                  </div>
                </div>
                </TabsContent>

                <TabsContent value="contrato" className="space-y-3 mt-4">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contrato & Produtividade (opcional)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor fixo mensal (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.valor_fixo}
                        onChange={(e) => setForm({ ...form, valor_fixo: e.target.value })}
                        placeholder="Ex: 1500,00"
                      />
                    </div>
                    <div>
                      <Label>Meta de chamados/mês</Label>
                      <Input
                        type="number"
                        value={form.meta_chamados}
                        onChange={(e) => setForm({ ...form, meta_chamados: e.target.value })}
                        placeholder="Ex: 40"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Bônus por chamado excedente (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.bonus_excedente}
                        onChange={(e) => setForm({ ...form, bonus_excedente: e.target.value })}
                        placeholder="Ex: 25,00"
                      />
                    </div>
                    <div>
                      <Label>Limite de horas por OS</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={form.horas_limite}
                        onChange={(e) => setForm({ ...form, horas_limite: e.target.value })}
                        placeholder="Ex: 4"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor da hora extra (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.valor_hora_extra}
                        onChange={(e) => setForm({ ...form, valor_hora_extra: e.target.value })}
                        placeholder="Ex: 50,00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 pt-1 border-t border-border/60">
                    <Label>Contrato assinado (PDF ou imagem)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        disabled={uploadingContrato}
                        onChange={handleUploadContrato}
                      />
                      {form.contrato_arquivo && (
                        <>
                          <Button type="button" variant="outline" size="sm" onClick={abrirContrato}>
                            Ver
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={removerContrato}>
                            Remover
                          </Button>
                        </>
                      )}

                    </div>
                    <p className="text-xs text-muted-foreground">
                      {uploadingContrato
                        ? "Enviando contrato..."
                        : form.contrato_nome
                          ? `Anexado: ${form.contrato_nome}`
                          : "Nenhum contrato anexado."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cidade de Atendimento</Label>
                    <Input
                      value={form.cidade_atendimento}
                      onChange={(e) => setForm({ ...form, cidade_atendimento: e.target.value })}
                      placeholder="Ex: São Paulo"
                    />
                  </div>
                  <div>
                    <Label>Raio de Atendimento (km)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.raio_atendimento}
                      onChange={(e) => setForm({ ...form, raio_atendimento: e.target.value })}
                      placeholder="Ex: 50"
                    />
                  </div>
                </div>
                </TabsContent>

                <TabsContent value="emails" className="space-y-3 mt-4">
                  <p className="text-xs text-muted-foreground">
                    Status dos e-mails de gestão e do técnico enviados para os endereços cadastrados.
                  </p>
                  <TecnicoEmailStatus
                    empresaId={profile?.empresa_id}
                    emails={[form.email_notificacoes].filter(Boolean) as string[]}
                  />
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={submit} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <FiltrosBarGlobal
        showSearch
        searchValue={tecnicosSearch}
        onSearchChange={setTecnicosSearch}
        searchLabel="Técnico"
        searchPlaceholder="Buscar por nome do técnico..."
      />

      {loadingTecnicos ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 md:p-5 h-44 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : tecnicos.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold">Nenhum técnico cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Cadastre seu primeiro técnico para começar a atribuir ordens de serviço.
          </p>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" /> Cadastrar técnico
          </Button>
        </Card>
      ) : viewMode === "list" ? (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th 
                    className="px-5 py-3 font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => {
                      if (tecnicosSortField === "nome") {
                        setTecnicosSortDirection(tecnicosSortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setTecnicosSortField("nome");
                        setTecnicosSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Técnico
                      {tecnicosSortField === "nome" ? (
                        tecnicosSortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                      )}
                    </div>
                  </th>
                  <th className="px-5 py-3 font-semibold">Especialidade</th>
                  <th 
                    className="px-5 py-3 font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => {
                      if (tecnicosSortField === "telefone") {
                        setTecnicosSortDirection(tecnicosSortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setTecnicosSortField("telefone");
                        setTecnicosSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Telefone / PIX
                      {tecnicosSortField === "telefone" ? (
                        tecnicosSortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-5 py-3 font-semibold cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => {
                      if (tecnicosSortField === "comissao") {
                        setTecnicosSortDirection(tecnicosSortDirection === "asc" ? "desc" : "asc");
                      } else {
                        setTecnicosSortField("comissao");
                        setTecnicosSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      Comissão
                      {tecnicosSortField === "comissao" ? (
                        tecnicosSortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                      )}
                    </div>
                  </th>
                  <th className="px-5 py-3 font-semibold">OS Ativas</th>
                  <th className="px-5 py-3 font-semibold">Ferramentas</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(Array.isArray(tecnicos) ? tecnicos : []).map((t) => {
                  const osAtivasTecnico = (activeOS || []).filter((o: any) => o.tecnico_id === t.id);
                  const ativas = osAtivasTecnico.length;
                  const isEmDeslocamento = osAtivasTecnico.some((o: any) => o.status === "em_deslocamento");
                  const isEmAndamento = osAtivasTecnico.some((o: any) => o.status === "em_andamento");
                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {t.nome[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium flex flex-col items-start gap-1 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {t.nome}
                              {t.ativo && <BadgeCheck className="w-3.5 h-3.5 text-success" />}
                            </div>
                            {isEmDeslocamento ? (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 shadow-none font-medium h-5 px-1.5 text-[10px]">
                                Em Trânsito
                              </Badge>
                            ) : isEmAndamento ? (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-none font-medium h-5 px-1.5 text-[10px]">
                                Em Atendimento
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-none font-medium h-5 px-1.5 text-[10px]">
                                Disponível
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {t.perfil}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        <div className="flex flex-col gap-1 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" />
                            {t.telefone || "—"}
                          </span>
                          {t.chave_pix && (
                            <span className="text-xs opacity-80">PIX: {t.chave_pix}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-primary">
                        {formatComissao(t.comissao, t.tipo_comissao)}
                      </td>
                      <td className="px-5 py-3 font-medium">{ativas}</td>
                      <td className="px-5 py-3">
                        {(() => {
                          const ferramentas = tecnicoFerramentas.filter(f => f.tecnico_id === t.id);
                          const validFerramentas = ferramentas.filter(f => f.itens_inventario?.nome);
                          
                          if (validFerramentas.length === 0) return <span className="text-muted-foreground text-xs">Nenhuma</span>;
                          return (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs" 
                              onClick={() => setViewFerramentasFor(t)}
                            >
                              <Wrench className="w-3 h-3 mr-1.5" />
                              {validFerramentas.length} Ferramenta{validFerramentas.length !== 1 ? 's' : ''}
                            </Button>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${t.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                        >
                          {t.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(t)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              if (!t.user_id && !t.username) setGerarAcessoFor(t);
                              else handleResetPassword(t);
                            }}>
                              <KeyRound className="mr-2 h-4 w-4" /> 
                              {(!t.user_id && !t.username) ? "Gerar Acesso" : "Gerar Nova Senha"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(t.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="mr-2 h-4 w-4" /> Inativar/Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Array.isArray(tecnicos) ? tecnicos : []).map((t) => {
            const osAtivasTecnico = (activeOS || []).filter((o: any) => o.tecnico_id === t.id);
            const ativas = osAtivasTecnico.length;
            const isEmDeslocamento = osAtivasTecnico.some((o: any) => o.status === "em_deslocamento");
            const isEmAndamento = osAtivasTecnico.some((o: any) => o.status === "em_andamento");
            return (
              <Card key={t.id} className="p-4 md:p-5 relative">
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(t)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        if (!t.user_id && !t.username) setGerarAcessoFor(t);
                        else handleResetPassword(t);
                      }}>
                        <KeyRound className="mr-2 h-4 w-4" /> 
                        {(!t.user_id && !t.username) ? "Gerar Acesso" : "Gerar Nova Senha"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(t.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Ban className="mr-2 h-4 w-4" /> Inativar/Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-start gap-3 pr-8">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {t.nome[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold">{t.nome}</h3>
                        {t.ativo && <BadgeCheck className="w-4 h-4 text-success" />}
                      </div>
                      {isEmDeslocamento ? (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 shadow-none font-medium h-5 px-1.5 text-[10px]">
                          Em Trânsito
                        </Badge>
                      ) : isEmAndamento ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-none font-medium h-5 px-1.5 text-[10px]">
                          Em Atendimento
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-none font-medium h-5 px-1.5 text-[10px]">
                          Disponível
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{t.perfil}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {t.telefone || "—"}
                    </span>
                    {t.chave_pix && (
                      <span className="text-xs truncate max-w-[120px]" title={t.chave_pix}>
                        PIX: {t.chave_pix}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Comissão</span>
                    <span className="font-semibold text-primary">
                      {formatComissao(t.comissao, t.tipo_comissao)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">OS Ativas</span>
                    <span className="font-semibold">{ativas}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span
                      className={`text-xs font-medium ${t.ativo ? "text-success" : "text-muted-foreground"}`}
                    >
                      {t.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border mt-2 flex flex-col gap-1.5">
                    <span className="text-muted-foreground text-xs font-medium">Ferramentas vinculadas</span>
                    {(() => {
                      const ferramentas = tecnicoFerramentas.filter(f => f.tecnico_id === t.id);
                      const validFerramentas = ferramentas.filter(f => f.itens_inventario?.nome);
                      
                      if (validFerramentas.length === 0) return <span className="text-xs text-muted-foreground">Nenhuma ferramenta</span>;
                      return (
                        <div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs" 
                            onClick={() => setViewFerramentasFor(t)}
                          >
                            <Wrench className="w-3 h-3 mr-1.5" />
                            {validFerramentas.length} Ferramenta{validFerramentas.length !== 1 ? 's' : ''}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginação Equipe */}
      {tecnicos.length > 0 && viewMode === "list" && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-muted-foreground">
            Mostrando {tecnicosPage * PAGE_SIZE + 1}–
            {Math.min((tecnicosPage + 1) * PAGE_SIZE, tecnicosTotal)} de {tecnicosTotal} técnicos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTecnicosPage(Math.max(0, tecnicosPage - 1))}
              disabled={tecnicosPage === 0}
              className="rounded-lg gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <span className="text-xs font-medium tabular-nums px-2">
              Página {tecnicosPage + 1} de {totalTecnicosPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTecnicosPage(Math.min(totalTecnicosPages - 1, tecnicosPage + 1))}
              disabled={tecnicosPage >= totalTecnicosPages - 1}
              className="rounded-lg gap-1"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <GerarAcessoDialog
        open={!!gerarAcessoFor}
        onOpenChange={(v) => !v && setGerarAcessoFor(null)}
        tecnico={gerarAcessoFor}
        empresaId={empresaId}
        codigoEmpresa={codigoEmpresa}
      />

      {/* Dialog de Sucesso de Reset de Senha */}
      <Dialog open={!!resetSenhaResult} onOpenChange={(v) => !v && setResetSenhaResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha Redefinida!</DialogTitle>
          </DialogHeader>
          {resetSenhaResult && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                <p className="font-semibold mb-2">Nova senha gerada com sucesso para {resetSenhaResult.nome}.</p>
                <p className="text-sm opacity-90">
                  Copie as credenciais abaixo e envie para o técnico.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-sm whitespace-pre-wrap font-mono">
                {resetSenhaResult.texto}
              </div>
              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setResetSenhaResult(null)}
                >
                  Fechar
                </Button>
                <Button
                  className="bg-[#25D366] hover:bg-[#1ebd5a] text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(resetSenhaResult.texto);
                    const wppUrl = `https://wa.me/?text=${encodeURIComponent(resetSenhaResult.texto)}`;
                    window.open(wppUrl, "_blank");
                    toast.success("Mensagem copiada e WhatsApp aberto!");
                  }}
                >
                  Enviar via WhatsApp
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    navigator.clipboard.writeText(resetSenhaResult.texto);
                    toast.success("Copiado para a área de transferência!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" /> Copiar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Ferramentas Vinculadas */}
      <Dialog open={!!viewFerramentasFor} onOpenChange={(v) => !v && setViewFerramentasFor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ferramentas de {viewFerramentasFor?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {viewFerramentasFor && (() => {
              const ferramentas = tecnicoFerramentas.filter(f => f.tecnico_id === viewFerramentasFor.id);
              const validFerramentas = ferramentas.filter(f => f.itens_inventario?.nome);

              if (validFerramentas.length === 0) {
                return <p className="text-sm text-muted-foreground">Nenhuma ferramenta encontrada.</p>;
              }

              return (
                <div className="divide-y divide-border border rounded-xl overflow-hidden">
                  {validFerramentas.map(f => {
                    return (
                      <div key={f.id} className="flex justify-between items-center p-3 text-sm bg-card hover:bg-muted/50 transition-colors">
                        <span className="font-medium">{f.itens_inventario?.nome}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{f.quantidade} un.</Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              try {
                                await deleteTecnicoFerramenta(f.id);
                                toast.success("Ferramenta desvinculada com sucesso!");
                              } catch (err: any) {
                                toast.error(err.message || "Erro ao desvincular");
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewFerramentasFor(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Sucesso de Novo Técnico */}
      <Dialog open={!!successCreds} onOpenChange={(v) => !v && setSuccessCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Técnico Cadastrado!</DialogTitle>
          </DialogHeader>
          {successCreds && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                <p className="font-semibold mb-2">Técnico {successCreds.nome} cadastrado com sucesso.</p>
                <p className="text-sm opacity-90">
                  Copie as credenciais abaixo e envie para o técnico.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-sm whitespace-pre-wrap font-mono">
                {successCreds.texto}
              </div>
              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSuccessCreds(null)}
                >
                  Fechar
                </Button>
                <Button
                  className="bg-[#25D366] hover:bg-[#1ebd5a] text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(successCreds.texto);
                    const wppUrl = `https://wa.me/?text=${encodeURIComponent(successCreds.texto)}`;
                    window.open(wppUrl, "_blank");
                    toast.success("Mensagem copiada e WhatsApp aberto!");
                  }}
                >
                  Enviar via WhatsApp
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    navigator.clipboard.writeText(successCreds.texto);
                    toast.success("Copiado para a área de transferência!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" /> Copiar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </GestorLayout>
  );
}
