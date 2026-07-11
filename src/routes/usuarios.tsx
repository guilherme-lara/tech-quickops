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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Users, 
  Plus, 
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Key
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/usuarios")({
  component: () => (
    <ProtectedRoute requireRole="gestor">
      <UsuariosPage />
    </ProtectedRoute>
  ),
});

function UsuariosPage() {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    username: "",
    senha: "",
    role: "analista"
  });

  // Fetch Backoffice Users (Gestores, Analistas, Admins)
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["usuarios_sistema", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("role", ["gestor", "analista", "admin", "superadmin"])
        .order("nome_completo");
        
      if (error) throw error;
      return data;
    }
  });

  // Mutation to create backoffice user
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.nome.trim()) throw new Error("Informe o nome do usuário");
      if (!formData.username.trim()) throw new Error("Informe um login (username)");
      if (formData.senha.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres");

      const { data, error } = await supabase.rpc("criar_usuario_backoffice", {
        p_nome: formData.nome,
        p_username: formData.username.toLowerCase(),
        p_senha: formData.senha,
        p_role: formData.role
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setIsDialogOpen(false);
      setFormData({ nome: "", username: "", senha: "", role: "analista" });
      qc.invalidateQueries({ queryKey: ["usuarios_sistema"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Erro ao criar usuário");
    }
  });

  const filteredUsers = usuarios?.filter(u => 
    u.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
      case "admin":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Admin</Badge>;
      case "gestor":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Gestor</Badge>;
      case "analista":
        return <Badge className="bg-info/10 text-info border-info/20">Analista</Badge>;
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
            <p className="text-sm text-muted-foreground mt-1">Gerencie logins para a equipe de escritório (Analistas e Gestores).</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Acesso
          </Button>
        </div>

        <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou usuário..." 
                className="pl-9 bg-muted/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 text-left font-medium">Nome Completo</th>
                  <th className="px-6 py-4 text-left font-medium">Usuário (Login)</th>
                  <th className="px-6 py-4 text-left font-medium">Nível de Acesso</th>
                  <th className="px-6 py-4 text-right font-medium">Data de Criação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Carregando...</td></tr>
                ) : filteredUsers?.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
                ) : (
                  filteredUsers?.map(user => (
                    <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {user.nome_completo?.substring(0, 2).toUpperCase()}
                        </div>
                        {user.nome_completo}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{user.username || "—"}</td>
                      <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground text-xs">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Criar Acesso Backoffice
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome Completo</Label>
              <Input 
                placeholder="Ex: Ana Silva" 
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Usuário de Login (username)</Label>
              <Input 
                placeholder="Ex: ana.silva" 
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nível de Acesso</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analista">Analista (Torre de Controle Operacional)</SelectItem>
                  <SelectItem value="gestor">Gestor (Acesso Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Senha Temporária</Label>
              <Input 
                type="password" 
                placeholder="Mínimo 6 caracteres" 
                value={formData.senha}
                onChange={e => setFormData({...formData, senha: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </GestorLayout>
  );
}
