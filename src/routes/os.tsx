import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, statusColor, OSStatus, OS } from "@/lib/mock-store";
import { Plus, User, HardHat, MoreVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

export const Route = createFileRoute("/os")({ component: OSPage });

const colunas: OSStatus[] = ["Orçamento", "Aprovado", "Em Execução", "Concluído", "Cancelado"];

function OSPage() {
  const { os, clientes, tecnicos, addOS, updateOS } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: "", clienteId: "", tecnicoId: "", valor: "", status: "Orçamento" as OSStatus });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const submit = () => {
    if (!form.titulo || !form.clienteId || !form.tecnicoId) { toast.error("Preencha todos os campos"); return; }
    addOS({ titulo: form.titulo, clienteId: form.clienteId, tecnicoId: form.tecnicoId, valor: Number(form.valor) || 0, status: form.status });
    toast.success("OS criada com sucesso");
    setOpen(false);
    setForm({ titulo: "", clienteId: "", tecnicoId: "", valor: "", status: "Orçamento" });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const id = e.active.id as string;
    const target = e.over?.id as OSStatus | undefined;
    if (!target) return;
    const cur = os.find((o) => o.id === id);
    if (cur && cur.status !== target) { updateOS(id, { status: target }); toast.success(`Movida para ${target}`); }
  };

  return (
    <GestorLayout>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">Arraste cards entre colunas para atualizar o status</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-10 bg-gradient-to-r from-primary to-violet shadow-[var(--shadow-glow)]">
              <Plus className="w-4 h-4" /> Nova OS
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Manutenção câmara fria" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cliente</Label>
                  <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nomeFantasia}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Técnico</Label>
                  <Select value={form.tecnicoId} onValueChange={(v) => setForm({ ...form, tecnicoId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{tecnicos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor estimado</Label><Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as OSStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{colunas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit}>Criar OS</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {colunas.map((status) => {
            const cards = os.filter((o) => o.status === status);
            return <Coluna key={status} status={status} cards={cards} clientes={clientes} tecnicos={tecnicos} />;
          })}
        </div>
      </DndContext>
    </GestorLayout>
  );
}

function Coluna({ status, cards, clientes, tecnicos }: { status: OSStatus; cards: OS[]; clientes: any[]; tecnicos: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const total = cards.reduce((s, c) => s + c.valor, 0);
  return (
    <div ref={setNodeRef} className={`rounded-3xl p-3 transition-all duration-300 ${isOver ? "bg-primary/10 ring-2 ring-primary/40" : "bg-muted/40"}`}>
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor[status]}`}>{status}</span>
          <span className="text-xs text-muted-foreground font-semibold">{cards.length}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">R$ {total.toLocaleString("pt-BR")}</span>
      </div>
      <div className="space-y-2 mt-2 min-h-[120px]">
        {cards.map((o) => <OSCard key={o.id} ordem={o} cliente={clientes.find(c => c.id === o.clienteId)} tecnico={tecnicos.find(t => t.id === o.tecnicoId)} />)}
        {cards.length === 0 && <div className="text-center text-xs text-muted-foreground py-8">—</div>}
      </div>
    </div>
  );
}

function OSCard({ ordem, cliente, tecnico }: { ordem: OS; cliente: any; tecnico: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ordem.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}
      className={`rounded-2xl bg-card p-3.5 shadow-[var(--shadow-card)] border border-border/60 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 ${isDragging ? "opacity-50 rotate-2" : ""}`}>
      <div className="flex items-start justify-between">
        <span className="text-[10px] text-muted-foreground font-bold tracking-wider">{ordem.numero}</span>
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="font-semibold text-sm mt-1.5 leading-snug">{ordem.titulo}</div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2"><User className="w-3 h-3" />{cliente?.nomeFantasia}</div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><HardHat className="w-3 h-3" />{tecnico?.nome.split(" ")[0]}</div>
        <span className="text-xs font-bold">R$ {ordem.valor.toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}
