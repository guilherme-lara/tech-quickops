import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Key, ShieldAlert, ShieldCheck, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";
import { logActivity } from "@/lib/logger";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/superadmin/licencas")({
  component: SuperAdminLicencasPage,
});

function SuperAdminLicencasPage() {
  return (
    <ProtectedRoute requireRole="superadmin">
      <GestorLayout>
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Licenças</h1>
            <p className="text-muted-foreground">
              Painel exclusivo para Super Admins gerenciarem empresas, chaves de ativação e status de acesso.
            </p>
          </div>
          
          <LicencasTable />
        </div>
      </GestorLayout>
    </ProtectedRoute>
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
      // Buscar a empresa para pegar o CNPJ
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
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-empresas"] });
      toast.success("Nova chave gerada com sucesso!");
      
      await logActivity(
        "geracao_chave_licenca",
        `Nova chave de ativação gerada pelo Super Admin (${user?.nome || 'Sistema'})`,
        data.id,
        user?.nome || 'Super Admin'
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
        `Status da licença alterado para ${data.newStatus} pelo Super Admin (${user?.nome || 'Sistema'})`,
        data.id,
        user?.nome || 'Super Admin'
      );
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao alterar status da licença.");
    }
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("Chave copiada para a área de transferência.");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center border rounded-xl bg-card">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium">Empresa</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Chave de Ativação</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {empresas?.map((empresa) => (
              <tr key={empresa.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{empresa.nome_fantasia}</span>
                    {empresa.cnpj && <span className="text-xs text-muted-foreground">CNPJ: {empresa.cnpj}</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {empresa.status_licenca === "bloqueado" ? (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1.5 px-2.5 py-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Bloqueado
                    </Badge>
                  ) : empresa.status_licenca === "ativo" ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1.5 px-2.5 py-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 px-2.5 py-1">
                      {empresa.status_licenca || 'Pendente'}
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4">
                  {empresa.chave_ativacao ? (
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded font-mono text-xs font-semibold text-primary">
                        {empresa.chave_ativacao}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(empresa.chave_ativacao!)}
                        title="Copiar chave"
                      >
                        {copiedKey === empresa.chave_ativacao ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Nenhuma chave gerada</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs font-medium"
                      onClick={() => generateKeyMutation.mutate(empresa.id)}
                      disabled={generateKeyMutation.isPending}
                    >
                      <Key className="w-3.5 h-3.5" />
                      Gerar Nova Chave
                    </Button>
                    
                    <div className="flex items-center gap-2 border-l pl-4">
                      <span className="text-xs font-medium text-muted-foreground">Acesso</span>
                      <Switch
                        checked={empresa.status_licenca !== 'bloqueado'}
                        onCheckedChange={(checked) => 
                          toggleStatusMutation.mutate({ 
                            id: empresa.id, 
                            newStatus: checked ? 'ativo' : 'bloqueado' 
                          })
                        }
                        disabled={toggleStatusMutation.isPending}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            
            {(!empresas || empresas.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhuma empresa encontrada no sistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
