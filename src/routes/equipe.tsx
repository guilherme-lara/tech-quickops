import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useStore } from "@/lib/mock-store";
import {
  Phone,
  BadgeCheck,
  Plus,
  Users,
  List,
  LayoutGrid,
  MoreVertical,
  Edit2,
  Trash2,
  Ban,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/equipe")({
  component: () => (
    <ProtectedRoute>
      <EquipePage />
    </ProtectedRoute>
  ),
});

function EquipePage() {
  const { tecnicos, os, addTecnico, updateTecnico, deleteTecnico, loadingTecnicos } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    nome: "",
    perfil: "Técnico de Campo",
    telefone: "",
    comissao: "",
    chave_pix: "",
  });
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  const openNew = () => {
    setForm({
      id: "",
      nome: "",
      perfil: "Técnico de Campo",
      telefone: "",
      comissao: "",
      chave_pix: "",
    });
    setOpen(true);
  };

  const openEdit = (t: any) => {
    setForm({
      id: t.id,
      nome: t.nome,
      perfil: t.perfil,
      telefone: t.telefone,
      comissao: t.comissao ? String(t.comissao) : "",
      chave_pix: t.chave_pix || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja inativar/excluir este técnico?")) {
      await deleteTecnico(id);
      toast.success("Técnico excluído!");
    }
  };

  const submit = async () => {
    if (!form.nome.trim()) return toast.error("Informe o nome do técnico");
    try {
      if (form.id) {
        await updateTecnico(form.id, {
          ...form,
          comissao: Number(form.comissao) || 0,
          ativo: true,
        });
        toast.success("Técnico atualizado!");
      } else {
        await addTecnico({ ...form, comissao: Number(form.comissao) || 0, ativo: true });
        toast.success("Técnico cadastrado!");
      }
      setOpen(false);
      setForm({
        id: "",
        nome: "",
        perfil: "Técnico de Campo",
        telefone: "",
        comissao: "",
        chave_pix: "",
      });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  return (
    <GestorLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">Equipe técnica</h2>
          <p className="text-sm text-muted-foreground">{tecnicos.length} técnicos cadastrados</p>
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
                  <Label>Perfil / Especialidade</Label>
                  <Input
                    value={form.perfil}
                    onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                    placeholder="Ex.: Refrigeração, Elétrica"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="(11) 99999-0000"
                    />
                  </div>
                  <div>
                    <Label>Comissão (%)</Label>
                    <Input
                      type="number"
                      value={form.comissao}
                      onChange={(e) => setForm({ ...form, comissao: e.target.value })}
                      placeholder="Ex: 30"
                    />
                  </div>
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submit}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                {tecnicos.map((t) => {
                  const ativas = os.filter(
                    (o) =>
                      o.tecnicoId === t.id && o.status !== "Concluído" && o.status !== "Cancelado",
                  ).length;
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
                      <td className="px-5 py-3 font-medium text-primary">{t.comissao || 0}%</td>
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
          {tecnicos.map((t) => {
            const ativas = os.filter(
              (o) => o.tecnicoId === t.id && o.status !== "Concluído" && o.status !== "Cancelado",
            ).length;
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
                    <span className="font-semibold text-primary">{t.comissao || 0}%</span>
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
    </GestorLayout>
  );
}
