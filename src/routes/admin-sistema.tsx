import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Key, ShieldAlert, ShieldCheck, Copy, Check, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { logActivity } from "@/lib/logger";
import { useAuth } from "@/lib/auth-context";
import { PlanLimits, PlanType } from "@/lib/planLimits";

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
  const [searchTerm, setSearchTerm] = useState("");

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
      const { data, error } = await supabase.rpc('gerar_chave_licenca_segura', {
        p_empresa_id: empresaId
      });
      
      if (error) throw error;
      return { id: empresaId, key: data };
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

  const changePlanMutation = useMutation({
    mutationFn: async ({ id, novoPlano }: { id: string, novoPlano: string }) => {
      const { error } = await supabase
        .from("empresas")
        .update({ plano: novoPlano })
        .eq("id", id);
      if (error) throw error;
      return { id, novoPlano };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-empresas"] });
      toast.success(`Plano alterado para ${data.novoPlano.toUpperCase()}.`);
      
      await logActivity(
        "alteracao_plano",
        `Plano da empresa alterado para ${data.novoPlano} pelo Painel Master`,
        data.id,
        "Painel Master"
      );
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao alterar o plano.");
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const empresasFiltradas = empresas?.filter(emp => 
    emp.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.cnpj?.includes(searchTerm)
  );

  return (
    <div className="relative w-full">
      <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <h3 className="font-semibold text-lg text-slate-800">Empresas Cadastradas ({empresas?.length || 0})</h3>
        <div className="relative w-full sm:w-72">
          <Input 
            placeholder="Buscar por nome ou CNPJ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 absolute left-3 top-3 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr className="transition-colors hover:bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cliente (Empresa)</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Plano Atual & Módulos</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status & Bloqueio</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Chave de Ativação</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0 bg-white">
            {empresasFiltradas?.map((empresa) => {
              const planoKey = (empresa.plano as PlanType) || 'free';
              const limits = PlanLimits[planoKey] || PlanLimits.free;

              return (
                <tr key={empresa.id} className="border-b transition-colors hover:bg-slate-50">
                  <td className="p-4 align-middle">
                    <div className="font-semibold text-slate-800">{empresa.nome_fantasia}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{empresa.cnpj || 'Sem CNPJ'}</div>
                  </td>
                  
                  <td className="p-4 align-middle min-w-[250px]">
                    <div className="space-y-3">
                      <Select 
                        value={planoKey} 
                        onValueChange={(v) => changePlanMutation.mutate({ id: empresa.id, novoPlano: v })}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold w-[160px]">
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free (Grátis)</SelectItem>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="premium">Premium (Enterprise)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1.5 flex-wrap">
                        {limits.hasDashboard && (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">
                            Dashboard
                          </Badge>
                        )}
                        {limits.hasFinanceiro && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">
                            Financeiro
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200">
                          {limits.maxTecnicos === 99999 ? '∞ Técnicos' : `Até ${limits.maxTecnicos} Técnicos`}
                        </Badge>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 align-middle">
                    <div className="flex flex-col items-start gap-2">
                      {empresa.status_licenca === 'bloqueado' ? (
                        <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
                          <ShieldAlert className="w-3 h-3" /> Bloqueado
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600 flex items-center gap-1 text-[10px]">
                          <ShieldCheck className="w-3 h-3" /> Ativo
                        </Badge>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium text-slate-500">Travar Acesso:</span>
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
                    </div>
                  </td>

                  <td className="p-4 align-middle">
                    {empresa.chave_ativacao ? (
                      <div className="flex flex-col gap-1.5">
                        <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] border font-mono truncate max-w-[150px]">
                          {empresa.chave_ativacao}
                        </code>
                        <Button variant="ghost" size="sm" className="h-6 w-fit text-[10px] px-2 text-slate-500" onClick={() => {
                          navigator.clipboard.writeText(empresa.chave_ativacao || "");
                          toast.success("Chave copiada");
                        }}>
                          <Copy className="w-3 h-3 mr-1" /> Copiar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Nenhuma chave</span>
                    )}
                  </td>
                  
                  <td className="p-4 align-middle">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-xs bg-slate-50 hover:bg-slate-100"
                      onClick={() => generateKeyMutation.mutate(empresa.id)}
                      disabled={generateKeyMutation.isPending}
                    >
                      <Key className="w-3 h-3 mr-1.5 text-primary" />
                      Re-gerar
                    </Button>
                  </td>
                </tr>
              );
            })}
            {(!empresasFiltradas || empresasFiltradas.length === 0) && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground py-12">
                  Nenhuma empresa encontrada com os filtros informados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
