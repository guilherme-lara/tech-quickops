import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Key, ShieldAlert, ShieldCheck, Copy, Check, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { logActivity } from "@/lib/logger";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin-sistema")({
  component: AdminSistemaPage,
});

function AdminSistemaPage() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (user.email !== "guiigo9@gmail.com") {
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user || user.email !== "guiigo9@gmail.com") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-slate-800">Painel Master</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 font-medium">{user.email}</span>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Licenças e Assinaturas</h2>
          <p className="text-muted-foreground">
            Controle total independente do sistema principal. Apenas o e-mail guiigo9@gmail.com tem acesso a esta tela.
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <LicencasTable />
        </div>
      </main>
    </div>
  );
}

function LicencasTable() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: empresas, isLoading } = useQuery({
    queryKey: ["superadmin-empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("nome_fantasia", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const generateKeyMutation = useMutation({
    mutationFn: async (empresaId: string) => {
      // Formato: id_do_cliente + dia + mes + ano + ultimos_4_digitos_cnpj
      const { data: emp, error: fetchErr } = await supabase
        .from("empresas")
        .select("cnpj")
        .eq("id", empresaId)
        .single();
        
      if (fetchErr) throw fetchErr;
      
      const hoje = new Date();
      const dia = String(hoje.getDate()).padStart(2, '0');
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = String(hoje.getFullYear()).slice(-2);
      
      const idPrefix = empresaId.substring(0, 8).toUpperCase();
      const cnpjSufix = emp.cnpj ? emp.cnpj.replace(/\D/g, '').slice(-4) : '0000';
      
      const key = `${idPrefix}-${dia}${mes}${ano}-${cnpjSufix}`;
      
      const { error } = await supabase
        .from("empresas")
        .update({ chave_ativacao: key })
        .eq("id", empresaId);
      if (error) throw error;
      return { id: empresaId, key };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-empresas"] });
      toast.success("Nova chave gerada com sucesso!");
      
      await logActivity(
        "geracao_chave_licenca",
        `Nova chave de ativação gerada pelo Painel Master (${user?.email})`,
        data.id,
        "Painel Master"
      );
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao gerar chave.");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      const { error } = await supabase
        .from("empresas")
        .update({ status_licenca: newStatus })
        .eq("id", id);
      if (error) throw error;
      return { id, newStatus };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-empresas"] });
      toast.success(`Empresa ${data.newStatus === 'bloqueado' ? 'bloqueada' : 'desbloqueada'}.`);
      
      await logActivity(
        "alteracao_status_licenca",
        `Status da licença alterado para ${data.newStatus} pelo Painel Master`,
        data.id,
        "Painel Master"
      );
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao alterar status.");
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b bg-slate-50/80">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cliente (Empresa)</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">CNPJ</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status do Sistema</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Chave de Ativação</th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {empresas?.map((empresa) => (
            <tr key={empresa.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <td className="p-4 align-middle font-medium">{empresa.nome_fantasia}</td>
              <td className="p-4 align-middle text-muted-foreground">{empresa.cnpj || 'Não informado'}</td>
              <td className="p-4 align-middle">
                <div className="flex items-center gap-3">
                  {empresa.status_licenca === 'bloqueado' ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Bloqueado
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Ativo
                    </Badge>
                  )}
                  <Switch
                    checked={empresa.status_licenca !== 'bloqueado'}
                    onCheckedChange={(checked) => {
                      toggleStatusMutation.mutate({
                        id: empresa.id,
                        newStatus: checked ? 'ativo' : 'bloqueado'
                      });
                    }}
                  />
                </div>
              </td>
              <td className="p-4 align-middle">
                {empresa.chave_ativacao ? (
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs border">
                      {empresa.chave_ativacao}
                    </code>
                    <CopyButton text={empresa.chave_ativacao} />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs italic">Nenhuma chave gerada</span>
                )}
              </td>
              <td className="p-4 align-middle">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => generateKeyMutation.mutate(empresa.id)}
                  disabled={generateKeyMutation.isPending}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Gerar Chave
                </Button>
              </td>
            </tr>
          ))}
          {(!empresas || empresas.length === 0) && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-muted-foreground py-8">
                Nenhuma empresa cadastrada no sistema.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Chave copiada para a área de transferência");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
    </Button>
  );
}
