import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type TipoComissao, PAGE_SIZE } from "@/lib/useData";
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
} from "lucide-react";
import { GerarAcessoDialog } from "@/components/GerarAcessoDialog";

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
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type TipoComissao, PAGE_SIZE } from "@/lib/useData";
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
} from "lucide-react";
import { GerarAcessoDialog } from "@/components/GerarAcessoDialog";

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
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  
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
    cidade_atendimento: "",
    raio_atendimento: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [gerarAcessoFor, setGerarAcessoFor] = useState<any>(null);
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
      cidade_atendimento: dadosAdicionais.cidade_atendimento || "",
      raio_atendimento: dadosAdicionais.raio_atendimento
        ? String(dadosAdicionais.raio_atendimento)
        : "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja inativar/excluir este técnico?")) {
      const tecnico = tecnicos.find((t) => t.id === id);
      await deleteTecnico(id);
      await registrarLog(
        "tecnico_inativado",
        `Técnico "${tecnico?.nome || id}" inativado por ${nomeUsuario}`,
      );
      toast.success("Técnico excluído!");
    }
  };

  const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-8).toUpperCase();
  };

  const handleResetPassword = async (t: any) => {
    if (!window.confirm(`Deseja gerar uma nova senha para ${t.nome}?`)) return;
    
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
      const empresaStr = profile?.empresaNome || "Tech QuickOps";
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
    setSaving(true);
    try {
      if (form.id) {
        const dadosAdicionais: any = {};
        if (form.cidade_atendimento) dadosAdicionais.cidade_atendimento = form.cidade_atendimento;
        if (form.raio_atendimento) dadosAdicionais.raio_atendimento = Number(form.raio_atendimento);

        await updateTecnico({
          id: form.id,
          patch: {
            nome: form.nome,
            perfil: form.perfil,
            telefone: form.telefone,
            comissao: Number(form.comissao) || 0,
            tipo_comissao: form.tipo_comissao,
            chave_pix: form.chave_pix,
            username: form.username,
            ativo: true,
            dados_adicionais: Object.keys(dadosAdicionais).length > 0 ? dadosAdicionais : undefined,
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

        const dadosAdicionais: any = {};
        if (form.cidade_atendimento) dadosAdicionais.cidade_atendimento = form.cidade_atendimento;
        if (form.raio_atendimento) dadosAdicionais.raio_atendimento = Number(form.raio_atendimento);

        const { error } = await (supabase.rpc as any)("criar_tecnico", {
          p_nome: form.nome,
          p_username: form.username.toLowerCase(),
          p_senha: novaSenha,
          p_tipo_comissao: form.tipo_comissao,
          p_comissao: Number(form.comissao) || 0,
          p_telefone: form.telefone || null,
          p_chave_pix: form.chave_pix || null,
          p_dados_adicionais: Object.keys(dadosAdicionais).length > 0 ? dadosAdicionais : null,
        });
        if (error) throw error;
        await registrarLog(
          "tecnico_criado",
          `Técnico "${form.nome}" cadastrado por ${nomeUsuario}`,
        );
        qc.invalidateQueries({ queryKey: ["tecnicos"] });
        qc.invalidateQueries({ queryKey: ["equipe_tecnicos"] });
        const login = form.username.toLowerCase();
        
        const text = `Olá ${form.nome}! Bem-vindo(a) à nossa equipe técnica.\n\nAqui estão suas credenciais exclusivas de acesso ao aplicativo:\n\n🏢 Código da Empresa: ${codigoEmpresa}\n👤 Usuário: ${login}\n🔑 Senha: ${novaSenha}\n\nPara acessar, acesse o link do sistema.`;
        
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar Técnico" : "Novo Técnico"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: maskPhoneBR(e.target.value) })}
                      placeholder="(11) 99999-0000"
                      inputMode="numeric"
                    />
                  </div>
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
              </div>
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
                  <th className="px-5 py-3 font-semibold">Técnico</th>
                  <th className="px-5 py-3 font-semibold">Especialidade</th>
                  <th className="px-5 py-3 font-semibold">Telefone / PIX</th>
                  <th className="px-5 py-3 font-semibold">Comissão</th>
                  <th className="px-5 py-3 font-semibold">OS Ativas</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(Array.isArray(tecnicos) ? tecnicos : []).map((t) => {
                  const ativas = (activeOS || []).filter((o: any) => o.tecnico_id === t.id).length;
                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {t.nome[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium flex items-center gap-1.5 whitespace-nowrap">
                            {t.nome}
                            {t.ativo && <BadgeCheck className="w-3.5 h-3.5 text-success" />}
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
            const ativas = (activeOS || []).filter((o: any) => o.tecnico_id === t.id).length;
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
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold">{t.nome}</h3>
                      {t.ativo && <BadgeCheck className="w-4 h-4 text-success" />}
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
              </DialogFooter>
            </div>
          )}
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
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </GestorLayout>
  );
}
