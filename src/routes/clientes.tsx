import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  Plus,
  Mail,
  Phone,
  Users,
  List,
  LayoutGrid,
  MoreVertical,
  Edit2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { validarDocumento } from "@/lib/utils";

export const Route = createFileRoute("/clientes")({
  component: () => (
    <ProtectedRoute>
      <ClientesPage />
    </ProtectedRoute>
  ),
});

function ClientesPage() {
  const { clientes, addCliente, updateCliente, deleteCliente, loadingClientes } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    nomeFantasia: "",
    documento: "",
    telefone: "",
    email: "",
  });
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  const openNew = () => {
    setForm({ id: "", nomeFantasia: "", documento: "", telefone: "", email: "" });
    setOpen(true);
  };

  const openEdit = (c: any) => {
    setForm({
      id: c.id,
      nomeFantasia: c.nomeFantasia,
      documento: c.documento,
      telefone: c.telefone,
      email: c.email,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este cliente?")) {
      await deleteCliente(id);
      toast.success("Cliente excluído!");
    }
  };

  const submit = async () => {
    if (!form.nomeFantasia) {
      return toast.error("Nome fantasia é obrigatório.");
    }
    if (form.documento && !validarDocumento(form.documento)) {
      return toast.error("Documento (CNPJ/CPF) inválido.");
    }

    try {
      if (form.id) {
        await updateCliente(form.id, form);
        toast.success("Cliente atualizado!");
      } else {
        await addCliente(form);
        toast.success("Cliente cadastrado!");
      }
      setOpen(false);
      setForm({ id: "", nomeFantasia: "", documento: "", telefone: "", email: "" });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar cliente");
    }
  };

  return (
    <GestorLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">Clientes</h2>
          <p className="text-sm text-muted-foreground">{clientes.length} cadastrados</p>
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
                <Plus className="w-4 h-4" /> Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome Fantasia</Label>
                  <Input
                    value={form.nomeFantasia}
                    onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
                  />
                </div>
                <div>
                  <Label>CNPJ / CPF</Label>
                  <Input
                    value={form.documento}
                    onChange={(e) => setForm({ ...form, documento: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
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

      <Card className="p-0 overflow-hidden bg-transparent border-0 shadow-none md:bg-card md:border md:shadow-sm">
        {loadingClientes ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-56" />
              </div>
            ))}
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="Nenhum cliente cadastrado"
              description="Cadastre seu primeiro cliente para começar a registrar ordens de serviço."
              action={
                <Button onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4" /> Novo cliente
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {viewMode === "list" ? (
              <div className="bg-card md:bg-transparent rounded-xl border md:border-0 border-border overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground hidden md:table-header-group">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Nome Fantasia</th>
                        <th className="px-5 py-3 font-semibold">Documento</th>
                        <th className="px-5 py-3 font-semibold">Contato</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    {/* On mobile, we keep the table for 'list' mode but standard display, overflow handles width */}
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground md:hidden">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Nome Fantasia</th>
                        <th className="px-5 py-3 font-semibold">Documento</th>
                        <th className="px-5 py-3 font-semibold">Contato</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {clientes.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4 font-medium whitespace-nowrap">
                            {c.nomeFantasia}
                          </td>
                          <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                            {c.documento}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-4 text-muted-foreground whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                {c.telefone}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                {c.email}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menu</span>
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(c)}>
                                  <Edit2 className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(c.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientes.map((c) => (
                  <div
                    key={c.id}
                    className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-3 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 relative"
                  >
                    <div className="absolute top-4 right-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(c.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3 pr-8">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {c.nomeFantasia[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-base leading-tight">
                          {c.nomeFantasia}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.documento}</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-3 border-t border-border/60 flex flex-col gap-2.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4" />
                        {c.telefone}
                      </span>
                      <span className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4" />
                        {c.email}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </GestorLayout>
  );
}
