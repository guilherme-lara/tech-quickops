import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useStore } from "@/lib/mock-store";
import { Plus, Mail, Phone, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/clientes")({ component: () => (<ProtectedRoute><ClientesPage /></ProtectedRoute>) });

function ClientesPage() {
  const { clientes, addCliente, loadingClientes } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nomeFantasia: "", documento: "", telefone: "", email: "" });

  const submit = () => {
    if (!form.nomeFantasia) return;
    addCliente(form);
    toast.success("Cliente cadastrado!");
    setOpen(false);
    setForm({ nomeFantasia: "", documento: "", telefone: "", email: "" });
  };

  return (
    <GestorLayout>
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold">Clientes</h2>
            <p className="text-sm text-muted-foreground">{clientes.length} cadastrados</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> Novo Cliente</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome Fantasia</Label><Input value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} /></div>
                <div><Label>CNPJ / CPF</Label><Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
              action={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Novo cliente</Button>}
            />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left px-5 py-3">Nome Fantasia</th><th className="text-left px-5 py-3">Documento</th><th className="text-left px-5 py-3">Contato</th></tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-4 font-medium">{c.nomeFantasia}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{c.documento}</td>
                  <td className="px-5 py-4 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefone}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </GestorLayout>
  );
}
