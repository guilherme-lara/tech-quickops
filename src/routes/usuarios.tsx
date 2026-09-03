import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Plus, Search, Key, MoreVertical, KeyRound, Ban, Copy, Trash2, UserCheck, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ConfirmDialogProvider";

export const Route = createFileRoute("/usuarios")({
  component: () => (
    <ProtectedRoute allowedRoles={["gestor", "admin", "superadmin"]}>
      <UsuariosPage />
    </ProtectedRoute>
  ),
});

const emptyForm = { nome: "", telefone: "", username: "", role: "analista" };

function generateRandomPassword() {
  return Math.random().toString(36).slice(-8).toUpperCase();
}

function UsuariosPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const codigoEmpresa = profile?.empresaCodigo || "";
  const empresaNome = profile?.empresaNome || "QuickOps";
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState("");
  const [showTecnicos, setMostrarTecnicos] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [successCreds, setSuccessCreds] = useState<{
    texto: string;
    nome: string;
  } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: "", nome: "", telefone: "", username: "", role: "" });
  const [resetSenhaResult, setResetSenhaResult] = useState<{
    texto: string;
    nome: string;
  } | null>(null);
  const [statusUser, setStatusUser] = useState<any | null>(null);
  const [acaoStatus, setAcaoStatus] = useState<"inativar" | "remover">("inativar");

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["usuarios_sistema", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("nome_completo");
      if (error) throw error;
      console.log("✅ TOTAL DE USUÁRIOS RETORNADOS:", data?.length);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.nome.trim()) throw new Error("Informe o nome do usuário");
      if (!formData.username.trim()) throw new Error("Informe o usuário (ex: ana.silva)");
      if (!/^[a-z0-9._-]+$/i.test(formData.username))
        throw new Error("Usuário inválido (use letras, números, . _ -)");

      const novaSenha = generateRandomPassword();

      const { data, error } = await (supabase.rpc as any)("criar_usuario_backoffice", {
        p_nome: formData.nome,
        p_username: formData.username.toLowerCase(),
        p_senha: novaSenha,
        p_role: formData.role,
        p_telefone: formData.telefone || null,
        p_dominio: null,
        p_empresa_id: empresaId,
      });
      if (error) throw error;
      return { userId: data as string, senha: novaSenha, login: formData.username.toLowerCase(), nome: formData.nome, role: formData.role };
    },
    onSuccess: (res) => {
      const roleLabel = res.role === "gestor" ? "Gestor" : res.role === "admin" ? "Admin" : res.role === "tecnico" ? "Técnico" : "Analista";
      const text = `Olá ${res.nome}! Bem-vindo(a) à equipe de ${empresaNome}.\n\nSeu acesso ao sistema como *${roleLabel}* foi criado com sucesso.\n\nEmpresa Vinculada: ${empresaNome}\n\nCredenciais de acesso:\n\n🏢 Código da Empresa: ${codigoEmpresa}\n👤 Usuário: ${res.login}\n🔑 Senha: ${res.senha}\n\nAcesse o link do sistema para entrar.`;
      setSuccessCreds({ texto: text, nome: res.nome });
      setIsDialogOpen(false);
      setFormData(emptyForm);
      qc.invalidateQueries({ queryKey: ["usuarios_sistema"] });
    },
    onError: (e: any) => {
      const msg = e?.message || "Erro ao criar usuário";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editFormData.nome.trim()) throw new Error("Informe o nome");
      const { error } = await supabase
        .from("perfis")
        .update({
          nome_completo: editFormData.nome,
          telefone: editFormData.telefone || null,
          role: editFormData.role as "admin" | "analista" | "gestor" | "superadmin" | "tecnico",
        })
        .eq("id", editFormData.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso");
      setIsEditDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["usuarios_sistema"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar usuário"),
  });

  const dependenciasQ = useQuery({
    queryKey: ["dependencias_usuario", statusUser?.id],
    enabled: !!statusUser?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("contar_dependencias_usuario", {
        p_user_id: statusUser.id,
      });
      if (error) throw error;
      return data as {
        is_tecnico: boolean;
        ordens_servico: number;
        ferramentas: number;
        historico: number;
        notificacoes: number;
        pode_remover: boolean;
      };
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await (supabase.rpc as any)("definir_status_usuario", {
        p_user_id: id,
        p_ativo: ativo,
      });
      if (error) throw error;
      return ativo;
    },
    onSuccess: (ativo) => {
      toast.success(ativo ? "Usuário reativado com sucesso" : "Usuário inativado com sucesso");
      setStatusUser(null);
      qc.invalidateQueries({ queryKey: ["usuarios_sistema"] });
      qc.invalidateQueries({ queryKey: ["all_tecnicos"] });
    },
    onError: (error: any) => toast.error(error.message || "Erro ao alterar status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)("remover_acesso_backoffice", { p_user_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário removido definitivamente");
      setStatusUser(null);
      qc.invalidateQueries({ queryKey: ["usuarios_sistema"] });
      qc.invalidateQueries({ queryKey: ["all_tecnicos"] });
    },
    onError: (error: any) => toast.error(error.message || "Erro ao remover usuário"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (user: any) => {
      const novaSenha = generateRandomPassword();
      const { error } = await supabase.rpc("resetar_senha_tecnico", {
        p_tecnico_id: user.id,
        p_nova_senha: novaSenha
      });
      if (error) throw error;
      return { user, novaSenha };
    },
    onSuccess: (res) => {
      const roleLabel = res.user.role === "gestor" ? "Gestor" : res.user.role === "admin" ? "Admin" : res.user.role === "tecnico" ? "Técnico" : "Analista";
      const text = `Olá ${res.user.nome_completo}! A senha do seu acesso como *${roleLabel}* foi resetada.\n\nEmpresa Vinculada: ${empresaNome}\n\nCredenciais de acesso:\n\n🏢 Código da Empresa: ${codigoEmpresa}\n👤 Usuário: ${(res.user as any).username}\n🔑 Nova Senha: ${res.novaSenha}\n\nAcesse o link do sistema para entrar.`;
      setResetSenhaResult({ texto: text, nome: res.user.nome_completo });
    },
    onError: (e: any) => {
      toast.error(e.message || "Erro ao gerar nova senha");
    }
  });

  const abrirGerenciarStatus = (user: any) => {
    setAcaoStatus("inativar");
    setStatusUser(user);
  };

  const handleResetPassword = async (user: any) => {
    if (await confirm({ title: "Nova Senha", description: `Deseja gerar uma nova senha para ${user.nome_completo}?` })) {
      resetPasswordMutation.mutate(user);
    }
  };

  const handleEdit = (user: any) => {
    setEditFormData({
      id: user.id,
      nome: user.nome_completo,
      telefone: user.telefone || "",
      username: user.username || "",
      role: user.role || "",
    });
    setIsEditDialogOpen(true);
  };

  const filteredUsers = usuarios?.filter((u) => {
    if (!showTecnicos && u.role === "tecnico") return false;
    
    return (
      u.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
      case "admin":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Admin</Badge>;
      case "gestor":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Gestor</Badge>;
      case "analista":
        return <Badge className="bg-info/10 text-info border-info/20">Analista</Badge>;
      case "tecnico":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Técnico</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <GestorLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Acessos do Sistema
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie logins para a equipe de escritório (Analistas e Gestores).
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Acesso
          </Button>
        </div>

        <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 flex flex-wrap gap-4 justify-between items-center">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou usuário..."
                className="pl-9 bg-muted/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-tecnicos"
                checked={showTecnicos}
                onCheckedChange={setMostrarTecnicos}
              />
              <Label htmlFor="show-tecnicos" className="text-sm text-muted-foreground cursor-pointer">
                Exibir Técnicos
              </Label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 text-left font-medium">Nome Completo</th>
                  <th className="px-6 py-4 text-left font-medium">Usuário (Login)</th>
                  <th className="px-6 py-4 text-left font-medium">Telefone</th>
                  <th className="px-6 py-4 text-left font-medium">Nível de Acesso</th>
                  <th className="px-6 py-4 text-right font-medium">Criado em</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredUsers?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredUsers?.map((u) => (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        (u as any).ativo === false
                          ? "bg-muted/20 text-muted-foreground opacity-70"
                          : "hover:bg-muted/10"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {u.nome_completo?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={(u as any).ativo === false ? "line-through text-muted-foreground" : "font-medium"}>
                            {u.nome_completo}
                          </span>
                          {(u as any).ativo === false && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Inativo</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {u.username || "—"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {u.telefone || "—"}
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground text-xs">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(u)}>
                              <Shield className="mr-2 h-4 w-4" /> 
                              Visualizar / Editar Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(u)}>
                              <KeyRound className="mr-2 h-4 w-4" /> 
                              Gerar Nova Senha
                            </DropdownMenuItem>
                            {(u as any).ativo === false ? (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: u.id, ativo: true })}
                              >
                                <UserCheck className="mr-2 h-4 w-4" /> Reativar Usuário
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              onClick={() => abrirGerenciarStatus(u)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="mr-2 h-4 w-4" /> Inativar ou Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Inativar / Remover */}
      <Dialog open={!!statusUser} onOpenChange={(o) => !o && setStatusUser(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" /> Inativar ou Remover
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Escolha o que fazer com <strong className="text-foreground">{statusUser?.nome_completo}</strong>.
            </p>

            <button
              type="button"
              onClick={() => setAcaoStatus("inativar")}
              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                acaoStatus === "inativar" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Ban className="w-4 h-4 text-amber-600" /> Inativar acesso
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                O usuário perde o acesso, mas continua listado (em cinza e riscado) e todo o histórico é preservado.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAcaoStatus("remover")}
              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                acaoStatus === "remover" ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Trash2 className="w-4 h-4 text-destructive" /> Remover definitivamente
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Apaga o cadastro e o login. Só é permitido quando não houver nada vinculado.
              </p>
            </button>

            {acaoStatus === "remover" && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs space-y-2">
                {dependenciasQ.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando vínculos...
                  </div>
                ) : dependenciasQ.error ? (
                  <span className="text-destructive">Não foi possível verificar os vínculos.</span>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ordens de serviço vinculadas</span>
                      <span className="font-semibold">{dependenciasQ.data?.ordens_servico ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ferramentas em posse</span>
                      <span className="font-semibold">{dependenciasQ.data?.ferramentas ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registros de histórico</span>
                      <span className="font-semibold">{dependenciasQ.data?.historico ?? 0}</span>
                    </div>
                    {!dependenciasQ.data?.pode_remover && (
                      <div className="flex items-start gap-2 pt-2 text-amber-700 dark:text-amber-500">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Existem registros vinculados a este usuário. A remoção está bloqueada — utilize a opção
                          <strong> Inativar acesso</strong> para preservar o histórico.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusUser(null)}>
              Cancelar
            </Button>
            {acaoStatus === "inativar" ? (
              <Button
                variant="destructive"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: statusUser.id, ativo: false })}
              >
                {statusMutation.isPending ? "Inativando..." : "Inativar acesso"}
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending || dependenciasQ.isLoading || !dependenciasQ.data?.pode_remover}
                onClick={() => deleteMutation.mutate(statusUser.id)}
              >
                {deleteMutation.isPending ? "Removendo..." : "Remover definitivamente"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de criação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Novo Acesso
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome Completo</Label>
              <Input
                placeholder="Ex: Ana Silva"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Usuário de Login</Label>
              <Input
                placeholder="Ex: ana.silva"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value.toLowerCase() })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Uma senha aleatória será gerada automaticamente.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Nível de Acesso</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analista">Analista (Torre de Controle)</SelectItem>
                  <SelectItem value="gestor">Gestor (Acesso Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Perfil do Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome Completo</Label>
              <Input
                placeholder="Ex: Ana Silva"
                value={editFormData.nome}
                onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={editFormData.telefone}
                onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Usuário de Login (Apenas Leitura)</Label>
              <Input
                value={editFormData.username || "—"}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label>Nível de Acesso</Label>
              <Select
                value={editFormData.role}
                onValueChange={(val) => setEditFormData({ ...editFormData, role: val })}
                disabled={editFormData.role === "tecnico" || editFormData.role === "superadmin"}
              >
                <SelectTrigger className={editFormData.role === "tecnico" || editFormData.role === "superadmin" ? "bg-muted" : ""}>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {editFormData.role === "tecnico" && <SelectItem value="tecnico">Técnico</SelectItem>}
                  {editFormData.role === "superadmin" && <SelectItem value="superadmin">Super Admin</SelectItem>}
                  <SelectItem value="analista">Analista</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de credenciais geradas */}
      <Dialog open={!!successCreds} onOpenChange={(v) => !v && setSuccessCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso Criado!</DialogTitle>
          </DialogHeader>
          {successCreds && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                <p className="font-semibold mb-2">
                  {successCreds.nome} cadastrado(a) com sucesso.
                </p>
                <p className="text-sm opacity-90">
                  Copie as credenciais abaixo e envie para o usuário.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-sm whitespace-pre-wrap font-mono">
                {successCreds.texto}
              </div>
              <DialogFooter className="mt-6 flex gap-2">
                <Button variant="outline" onClick={() => setSuccessCreds(null)}>
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

      {/* Modal de senha resetada */}
      <Dialog open={!!resetSenhaResult} onOpenChange={(v) => !v && setResetSenhaResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Senha Gerada!</DialogTitle>
          </DialogHeader>
          {resetSenhaResult && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                <p className="font-semibold mb-2">
                  Senha gerada para {resetSenhaResult.nome}.
                </p>
                <p className="text-sm opacity-90">
                  Copie as credenciais abaixo e envie para o usuário.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-sm whitespace-pre-wrap font-mono">
                {resetSenhaResult.texto}
              </div>
              <DialogFooter className="mt-6 flex gap-2">
                <Button variant="outline" onClick={() => setResetSenhaResult(null)}>
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
    </GestorLayout>
  );
}
