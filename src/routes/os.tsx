import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore, statusColor, OSStatus, OS, OS_PAGE_SIZE } from "@/lib/mock-store";
import {
  Plus,
  User,
  HardHat,
  MoreVertical,
  Upload,
  ClipboardList,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ImportarOSDialog } from "@/components/ImportarOSDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { RatGallery } from "@/components/RatGallery";
import { MesAnoFilter } from "@/components/MesAnoFilter";

export const Route = createFileRoute("/os")({
  component: () => (
    <ProtectedRoute>
      <OSPage />
    </ProtectedRoute>
  ),
});

const colunas: OSStatus[] = ["Orçamento", "Aprovado", "Em Execução", "Concluído", "Cancelado"];

function OSPage() {
  const { os, clientes, tecnicos, addOS, updateOS, loadingOS, osPage, osTotal, setOsPage } = useStore();
  const totalPages = Math.max(1, Math.ceil(osTotal / OS_PAGE_SIZE));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OS | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    clienteId: "",
    tecnicoId: "",
    valor: "",
    custo_viagem: "",
    status: "Orçamento" as OSStatus,
  });
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const submit = () => {
    if (!form.titulo || !form.clienteId || !form.tecnicoId) {
      toast.error("Preencha todos os campos");
      return;
    }
    addOS({
      titulo: form.titulo,
      clienteId: form.clienteId,
      tecnicoId: form.tecnicoId,
      valor: Number(form.valor) || 0,
      custo_viagem: Number(form.custo_viagem) || 0,
      status: form.status,
    });
    toast.success("OS criada com sucesso");
    setOpen(false);
    setForm({
      titulo: "",
      clienteId: "",
      tecnicoId: "",
      valor: "",
      custo_viagem: "",
      status: "Orçamento",
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const id = e.active.id as string;
    const target = e.over?.id as OSStatus | undefined;
    if (!target) return;
    const cur = os.find((o) => o.id === id);
    if (cur && cur.status !== target) {
      updateOS(id, { status: target });
      toast.success(`Movida para ${target}`);
    }
  };

  return (
    <GestorLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">Ordens de Serviço</h2>
          {viewMode === "card" && (
            <p className="text-sm text-muted-foreground hidden md:block">
              Arraste cards entre colunas para atualizar o status
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <MesAnoFilter />
          <div className="flex items-center rounded-lg bg-muted/50 p-1 shrink-0">
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
          <ImportarOSDialog
            trigger={
              <Button variant="outline" className="rounded-xl h-10 gap-1.5 shrink-0">
                <Upload className="w-4 h-4" /> Importar Planilha
              </Button>
            }
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-10 bg-gradient-to-r from-primary to-violet shadow-[var(--shadow-glow)] shrink-0">
                <Plus className="w-4 h-4" /> Nova OS
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Ordem de Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    placeholder="Ex: Manutenção câmara fria"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cliente</Label>
                    <Select
                      value={form.clienteId}
                      onValueChange={(v) => setForm({ ...form, clienteId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nomeFantasia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Técnico</Label>
                    <Select
                      value={form.tecnicoId}
                      onValueChange={(v) => setForm({ ...form, tecnicoId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tecnicos.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Valor estimado</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.valor}
                      onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Custo viagem (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.custo_viagem}
                      onChange={(e) => setForm({ ...form, custo_viagem: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as OSStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {colunas.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submit}>Criar OS</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loadingOS ? (
        viewMode === "card" ? (
          <div className="flex md:grid md:grid-cols-2 xl:grid-cols-5 gap-4 overflow-x-auto pb-4 snap-x snap-mandatory w-full">
            {colunas.map((c) => (
              <div key={c} className="min-w-[280px] snap-center rounded-3xl p-3 bg-muted/40">
                <Skeleton className="h-5 w-24 mb-3" />
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </Card>
        )
      ) : os.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma ordem de serviço ainda"
          description="Crie sua primeira OS ou importe seu histórico de uma planilha para começar a acompanhar seus chamados."
          action={
            <Button onClick={() => setOpen(true)} className="rounded-xl">
              <Plus className="w-4 h-4" /> Criar primeira OS
            </Button>
          }
        />
      ) : viewMode === "list" ? (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Número</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Título</th>
                  <th className="px-5 py-3 font-semibold">Cliente</th>
                  <th className="px-5 py-3 font-semibold">Técnico</th>
                  <th className="px-5 py-3 font-semibold">Valor</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {os.map((o) => {
                  const cliente = clientes.find((c) => c.id === o.clienteId);
                  const tecnico = tecnicos.find((t) => t.id === o.tecnicoId);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setEditing(o)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-medium whitespace-nowrap">{o.numero}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${statusColor[o.status]}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium min-w-[200px]">{o.titulo}</td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {cliente?.nomeFantasia ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <HardHat className="w-3.5 h-3.5" />
                          {tecnico?.nome?.split(" ")[0] ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold whitespace-nowrap">
                        R$ {o.valor.toLocaleString("pt-BR")}
                      </td>
                      <td
                        className="px-5 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RatGallery osId={o.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex md:grid md:grid-cols-2 xl:grid-cols-5 gap-4 overflow-x-auto pb-4 snap-x snap-mandatory w-full">
            {colunas.map((status) => {
              const cards = os.filter((o) => o.status === status);
              return (
                <Coluna
                  key={status}
                  status={status}
                  cards={cards}
                  clientes={clientes}
                  tecnicos={tecnicos}
                />
              );
            })}
          </div>
        </DndContext>
      )}

      {os.length > 0 && viewMode === "list" && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-muted-foreground">
            Mostrando {osPage * OS_PAGE_SIZE + 1}–{Math.min((osPage + 1) * OS_PAGE_SIZE, osTotal)} de {osTotal} OS
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOsPage(Math.max(0, osPage - 1))}
              disabled={osPage === 0}
              className="rounded-lg gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <span className="text-xs font-medium tabular-nums px-2">
              Página {osPage + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOsPage(Math.min(totalPages - 1, osPage + 1))}
              disabled={osPage >= totalPages - 1}
              className="rounded-lg gap-1"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}



      <EditOSDialog
        ordem={editing}
        clientes={clientes}
        tecnicos={tecnicos}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          try {
            await updateOS(editing.id, patch);
            toast.success("OS atualizada");
            setEditing(null);
          } catch (e: any) {
            toast.error(e?.message ?? "Erro ao atualizar");
          }
        }}
      />
    </GestorLayout>
  );
}

function Coluna({
  status,
  cards,
  clientes,
  tecnicos,
}: {
  status: OSStatus;
  cards: OS[];
  clientes: any[];
  tecnicos: any[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const total = cards.reduce((s, c) => s + c.valor, 0);
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] snap-center rounded-3xl p-3 transition-all duration-300 ${isOver ? "bg-primary/10 ring-2 ring-primary/40" : "bg-muted/40"}`}
    >
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor[status]}`}
          >
            {status}
          </span>
          <span className="text-xs text-muted-foreground font-semibold">{cards.length}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">
          R$ {total.toLocaleString("pt-BR")}
        </span>
      </div>
      <div className="space-y-2 mt-2 min-h-[120px]">
        {cards.map((o) => (
          <OSCard
            key={o.id}
            ordem={o}
            cliente={clientes.find((c) => c.id === o.clienteId)}
            tecnico={tecnicos.find((t) => t.id === o.tecnicoId)}
          />
        ))}
        {cards.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">—</div>
        )}
      </div>
    </div>
  );
}

function OSCard({ ordem, cliente, tecnico }: { ordem: OS; cliente: any; tecnico: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ordem.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`rounded-2xl bg-card p-3.5 shadow-[var(--shadow-card)] border border-border/60 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 ${isDragging ? "opacity-50 rotate-2" : ""}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] text-muted-foreground font-bold tracking-wider">
          {ordem.numero}
        </span>
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="font-semibold text-sm mt-1.5 leading-snug">{ordem.titulo}</div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
        <User className="w-3 h-3" />
        {cliente?.nomeFantasia}
      </div>
      <div className="mt-3">
        <RatGallery osId={ordem.id} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <HardHat className="w-3 h-3" />
          {tecnico?.nome.split(" ")[0]}
        </div>
        <span className="text-xs font-bold">R$ {ordem.valor.toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

function EditOSDialog({
  ordem,
  clientes,
  tecnicos,
  onClose,
  onSave,
}: {
  ordem: OS | null;
  clientes: { id: string; nomeFantasia: string }[];
  tecnicos: { id: string; nome: string }[];
  onClose: () => void;
  onSave: (patch: Partial<OS>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    titulo: "",
    clienteId: "",
    tecnicoId: "",
    valor: "",
    custo_viagem: "",
    status: "Orçamento" as OSStatus,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ordem) {
      setForm({
        titulo: ordem.titulo ?? "",
        clienteId: ordem.clienteId ?? "",
        tecnicoId: ordem.tecnicoId ?? "",
        valor: String(ordem.valor ?? 0),
        custo_viagem: String(ordem.custo_viagem ?? 0),
        status: ordem.status,
      });
    }
  }, [ordem]);

  const handleSave = async () => {
    if (!ordem) return;
    if (!form.titulo || !form.clienteId || !form.tecnicoId) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        titulo: form.titulo,
        clienteId: form.clienteId,
        tecnicoId: form.tecnicoId,
        valor: Number(form.valor) || 0,
        custo_viagem: Number(form.custo_viagem) || 0,
        status: form.status,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!ordem} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar OS {ordem?.numero}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <Select
                value={form.clienteId}
                onValueChange={(v) => setForm({ ...form, clienteId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nomeFantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Técnico</Label>
              <Select
                value={form.tecnicoId}
                onValueChange={(v) => setForm({ ...form, tecnicoId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <div>
              <Label>Custo viagem</Label>
              <Input
                type="number"
                step="0.01"
                value={form.custo_viagem}
                onChange={(e) => setForm({ ...form, custo_viagem: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as OSStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colunas.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {ordem?.dados_adicionais && Object.keys(ordem.dados_adicionais).length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                Informações adicionais (importadas)
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {Object.entries(ordem.dados_adicionais).map(([k, v]) => (
                  <div key={k} className="flex flex-col min-w-0">
                    <dt className="font-medium text-muted-foreground truncate">{k}</dt>
                    <dd className="font-mono truncate">{String(v ?? "—")}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
