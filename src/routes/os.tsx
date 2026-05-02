import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, statusColor, OSStatus } from "@/lib/mock-store";
import { Plus, User, HardHat } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/os")({ component: OSPage });

const colunas: OSStatus[] = ["Orçamento", "Aprovado", "Em Execução", "Concluído", "Cancelado"];

function OSPage() {
  const { os, clientes, tecnicos, addOS, updateOS } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: "", clienteId: "", tecnicoId: "", valor: "", status: "Orçamento" as OSStatus });

  const submit = () => {
    if (!form.titulo || !form.clienteId || !form.tecnicoId) { toast.error("Preencha todos os campos"); return; }
    addOS({ titulo: form.titulo, clienteId: form.clienteId, tecnicoId: form.tecnicoId, valor: Number(form.valor) || 0, status: form.status });
    toast.success("OS criada!");
    setOpen(false);
    setForm({ titulo: "", clienteId: "", tecnicoId: "", valor: "", status: "Orçamento" });
  };

  return (
    <GestorLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold">Quadro de OS</h2>
          <p className="text-sm text-muted-foreground">Arraste os status para acompanhar</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> Nova OS</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Manutenção câmara fria" /></div>
              <div>
                <Label>Cliente</Label>
                <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nomeFantasia}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Técnico</Label>
                <Select value={form.tecnicoId} onValueChange={(v) => setForm({ ...form, tecnicoId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{tecnicos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor estimado</Label><Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as OSStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{colunas.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {colunas.map((col) => {
          const cards = os.filter((o) => o.status === col);
          return (
            <div key={col} className="bg-muted/40 rounded-lg p-3 flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-sm">{col}</h3>
                <span className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded-full">{cards.length}</span>
              </div>
              <div className="space-y-2 flex-1 min-h-[100px]">
                {cards.map((o) => {
                  const cliente = clientes.find((c) => c.id === o.clienteId);
                  const tec = tecnicos.find((t) => t.id === o.tecnicoId);
                  return (
                    <Card key={o.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-mono">{o.numero}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[o.status]}`}>{o.status}</span>
                      </div>
                      <div className="font-medium text-sm">{o.titulo}</div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><User className="w-3 h-3" />{cliente?.nomeFantasia}</div>
                        <div className="flex items-center gap-1.5"><HardHat className="w-3 h-3" />{tec?.nome}</div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                        <span className="text-xs font-semibold">R$ {o.valor.toLocaleString("pt-BR")}</span>
                        <Select value={o.status} onValueChange={(v) => updateOS(o.id, { status: v as OSStatus })}>
                          <SelectTrigger className="h-7 text-xs w-auto border-0 bg-transparent px-2"><SelectValue /></SelectTrigger>
                          <SelectContent>{colunas.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </GestorLayout>
  );
}
