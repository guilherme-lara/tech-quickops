import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/mock-store";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Building2, Save } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  component: () => (<ProtectedRoute><ConfiguracoesPage /></ProtectedRoute>),
});

function ConfiguracoesPage() {
  const { user, updateProfile, updateEmpresa } = useStore();
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [savingNome, setSavingNome] = useState(false);
  const [savingEmpresa, setSavingEmpresa] = useState(false);

  useEffect(() => {
    if (user) {
      setNome(user.nome);
      setEmpresa(user.empresaNome);
    }
  }, [user]);

  const saveNome = async () => {
    if (!nome.trim()) return toast.error("Informe seu nome");
    setSavingNome(true);
    try {
      await updateProfile(nome.trim());
      toast.success("Nome atualizado!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar");
    } finally {
      setSavingNome(false);
    }
  };

  const saveEmpresa = async () => {
    if (!empresa.trim()) return toast.error("Informe o nome da empresa");
    setSavingEmpresa(true);
    try {
      await updateEmpresa(empresa.trim());
      toast.success("Empresa atualizada!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao atualizar");
    } finally {
      setSavingEmpresa(false);
    }
  };

  return (
    <GestorLayout>
      <div className="max-w-2xl space-y-5">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Perfil</h2>
              <p className="text-xs text-muted-foreground">Atualize seus dados pessoais</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Nome completo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <Button onClick={saveNome} disabled={savingNome}>
              <Save className="w-4 h-4" /> {savingNome ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-violet/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-violet" />
            </div>
            <div>
              <h2 className="font-semibold">Empresa</h2>
              <p className="text-xs text-muted-foreground">Dados da sua empresa</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Nome da empresa</Label>
              <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </div>
            <Button onClick={saveEmpresa} disabled={savingEmpresa}>
              <Save className="w-4 h-4" /> {savingEmpresa ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </Card>
      </div>
    </GestorLayout>
  );
}
