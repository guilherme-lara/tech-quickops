import { ProtectedRoute } from "@/components/ProtectedRoute";
import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useStore, type Item, type EquipamentoCliente, type TecnicoFerramenta, PAGE_SIZE } from "@/lib/useData";
import {
  Package,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Wrench,
  Monitor,
  Link as LinkIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FiltrosBarGlobal } from "@/components/FiltrosBarGlobal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { logActivity } from "@/lib/logger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const itemSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  codigo: z.string().max(100, "Código muito longo").optional(),
  quantidade: z.coerce.number().int("Quantidade deve ser inteiro").min(0, "Quantidade não pode ser negativa"),
  valor_unitario: z.coerce.number().min(0, "Valor não pode ser negativo"),
  descricao: z.string().optional(),
});
type ItemFormData = z.infer<typeof itemSchema>;

const equipamentoSchema = z.object({
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  modelo: z.string().optional(),
  numero_serie: z.string().optional(),
  patrimonio: z.string().optional(),
});
type EquipamentoFormData = z.infer<typeof equipamentoSchema>;

const vincularSchema = z.object({
  tecnico_id: z.string().min(1, "Técnico é obrigatório"),
  quantidade: z.coerce.number().int().min(1, "Mínimo de 1"),
});
type VincularFormData = z.infer<typeof vincularSchema>;

export const Route = createFileRoute("/estoque")({
  component: () => (
    <ProtectedRoute allowedRoles={['gestor', 'analista', 'admin', 'superadmin']}>
      <EstoquePage />
    </ProtectedRoute>
  ),
});

function EstoquePage() {
  const [activeTab, setActiveTab] = useState("insumos");

  return (
    <GestorLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="insumos" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Package className="w-4 h-4" /> 📦 Insumos
          </TabsTrigger>
          <TabsTrigger value="ferramentas" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Wrench className="w-4 h-4" /> 🛠️ Ferramentas
          </TabsTrigger>
          <TabsTrigger value="equipamentos" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Monitor className="w-4 h-4" /> 💻 Equip. Clientes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="insumos" className="m-0 focus-visible:outline-none">
          <InsumosTab />
        </TabsContent>
        <TabsContent value="ferramentas" className="m-0 focus-visible:outline-none">
          <FerramentasTab />
        </TabsContent>
        <TabsContent value="equipamentos" className="m-0 focus-visible:outline-none">
          <EquipamentosTab />
        </TabsContent>
      </Tabs>
    </GestorLayout>
  );
}

function InsumosTab() {
  const {
    itens, loadingItens, addItem, updateItem, deleteItem,
    estoquePage, estoqueTotal, setEstoquePage,
    estoqueSearch, setEstoqueSearch, setEstoqueTipo,
  } = useStore();
  const { profile } = useAuth();
  
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  useEffect(() => {
    setEstoqueTipo("insumo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insumos = itens; // The backend now filters out 'ferramenta' when 'insumo' is set
  const totalPages = Math.max(1, Math.ceil(estoqueTotal / PAGE_SIZE));

  const handleDelete = async (i: Item) => {
    if (!window.confirm(`Excluir "${i.nome}"?`)) return;
    try {
      await deleteItem(i.id);
      if (profile?.empresa_id) {
        await logActivity("estoque_deletado", `Insumo "${i.nome}" removido`, profile.empresa_id);
      }
      toast.success("Item excluído");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <FiltrosBarGlobal
          showSearch
          searchValue={estoqueSearch}
          onSearchChange={setEstoqueSearch}
          searchLabel="Item"
          searchPlaceholder="Buscar insumo..."
        />
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-11 rounded-xl gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo Insumo
        </Button>
      </div>

      {loadingItens ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : insumos.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum insumo"
          description="Cadastre o primeiro insumo."
          action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Novo Insumo</Button>}
        />
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nome</th>
                  <th className="px-5 py-3 font-semibold">Código</th>
                  <th className="px-5 py-3 font-semibold">Quantidade</th>
                  <th className="px-5 py-3 font-semibold">Valor unit.</th>
                  <th className="px-5 py-3 font-semibold w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {insumos.map((i) => (
                  <tr key={i.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{i.nome}</td>
                    <td className="px-5 py-3 text-muted-foreground">{i.codigo || "—"}</td>
                    <td className="px-5 py-3">{i.quantidade} un.</td>
                    <td className="px-5 py-3">R$ {i.valor_unitario.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(i); setOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(i)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Página {estoquePage + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEstoquePage(Math.max(0, estoquePage - 1))} disabled={estoquePage === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEstoquePage(estoquePage + 1)} disabled={estoquePage >= totalPages - 1}>
                  Próxima <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ItemDialog 
        open={open} onOpenChange={setOpen} item={editing} defaultTipo="insumo"
        onSubmit={async (data) => {
          if (editing) await updateItem(editing.id, { ...data, tipo: "insumo" });
          else await addItem({ ...data, tipo: "insumo" });
          toast.success("Insumo salvo");
          setOpen(false);
        }}
      />
    </div>
  );
}

function FerramentasTab() {
  const {
    itens, loadingItens, addItem, updateItem, deleteItem,
    estoquePage, estoqueTotal, setEstoquePage,
    estoqueSearch, setEstoqueSearch, setEstoqueTipo,
    tecnicos, tecnicoFerramentas
  } = useStore();
  const { profile } = useAuth();
  
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [vincular, setVincular] = useState<Item | null>(null);

  useEffect(() => {
    setEstoqueTipo("ferramenta");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ferramentas = itens; // Backend already filters
  const totalPages = Math.max(1, Math.ceil(estoqueTotal / PAGE_SIZE));

  const handleDelete = async (i: Item) => {
    if (!window.confirm(`Excluir "${i.nome}"?`)) return;
    try {
      await deleteItem(i.id);
      toast.success("Ferramenta excluída");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <FiltrosBarGlobal showSearch searchValue={estoqueSearch} onSearchChange={setEstoqueSearch} searchLabel="Ferramenta" searchPlaceholder="Buscar ferramenta..." />
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-11 rounded-xl gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nova Ferramenta
        </Button>
      </div>

      {loadingItens ? (
        <div className="bg-card rounded-xl border border-border p-4"><Skeleton className="h-12 w-full" /></div>
      ) : ferramentas.length === 0 ? (
        <EmptyState icon={Wrench} title="Nenhuma ferramenta" description="Cadastre sua primeira ferramenta." />
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nome</th>
                  <th className="px-5 py-3 font-semibold">Descrição</th>
                  <th className="px-5 py-3 font-semibold">Quantidade</th>
                  <th className="px-5 py-3 font-semibold">Com Técnicos</th>
                  <th className="px-5 py-3 font-semibold">Valor</th>
                  <th className="px-5 py-3 font-semibold text-right w-48">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ferramentas.map((i) => {
                  const vinculados = tecnicoFerramentas.filter(f => f.item_id === i.id);
                  const nomesTecnicos = vinculados.map(f => {
                    const t = tecnicos.find(tec => tec.id === f.tecnico_id);
                    return t ? `${t.nome} (${f.quantidade})` : `Técnico Removido (${f.quantidade})`;
                  });

                  return (
                    <tr key={i.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">{i.nome}</td>
                      <td className="px-5 py-3 text-muted-foreground">{i.descricao || "—"}</td>
                      <td className="px-5 py-3">{i.quantidade} un.</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {nomesTecnicos.length > 0 ? (
                           <div className="flex flex-col gap-1">
                             {nomesTecnicos.map((n, idx) => <span key={idx} className="bg-muted px-2 py-0.5 rounded-full w-fit">{n}</span>)}
                           </div>
                        ) : "Nenhum"}
                      </td>
                      <td className="px-5 py-3">R$ {i.valor_unitario.toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setVincular(i)} className="gap-1">
                            <LinkIcon className="w-3.5 h-3.5" /> Vincular
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(i); setOpen(true); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Página {estoquePage + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEstoquePage(Math.max(0, estoquePage - 1))} disabled={estoquePage === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEstoquePage(estoquePage + 1)} disabled={estoquePage >= totalPages - 1}>
                  Próxima <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ItemDialog 
        open={open} onOpenChange={setOpen} item={editing} defaultTipo="ferramenta"
        onSubmit={async (data) => {
          if (editing) await updateItem(editing.id, { ...data, tipo: "ferramenta" });
          else await addItem({ ...data, tipo: "ferramenta" });
          toast.success("Ferramenta salva");
          setOpen(false);
        }}
      />

      <VincularDialog open={!!vincular} onOpenChange={(v) => !v && setVincular(null)} item={vincular} />
    </div>
  );
}

function EquipamentosTab() {
  const { equipamentos, loadingEquipamentos, deleteEquipamento } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EquipamentoCliente | null>(null);

  const handleDelete = async (e: EquipamentoCliente) => {
    if (!window.confirm(`Excluir equipamento "${e.nome}"?`)) return;
    try {
      await deleteEquipamento(e.id);
      toast.success("Equipamento excluído");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [statusFilter, setStatusFilter] = useState("todos");
  
  const filtrados = equipamentos.filter(e => {
    if (statusFilter === "todos") return true;
    return e.status === statusFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <FiltrosBarGlobal showSearch searchValue="" onSearchChange={() => {}} searchLabel="Equipamento" searchPlaceholder="Buscar..." />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10 bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="em_estoque">Em Estoque</SelectItem>
              <SelectItem value="em_transito">Em Trânsito</SelectItem>
              <SelectItem value="instalado">Instalados</SelectItem>
              <SelectItem value="retirado_em_estoque">Retirados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="h-11 rounded-xl gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo Equipamento
        </Button>
      </div>

      {loadingEquipamentos ? (
        <div className="bg-card rounded-xl border border-border p-4"><Skeleton className="h-12 w-full" /></div>
      ) : equipamentos.length === 0 ? (
        <EmptyState icon={Monitor} title="Nenhum equipamento" description="Cadastre o primeiro equipamento." />
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Cliente</th>
                  <th className="px-5 py-3 font-semibold">Nome</th>
                  <th className="px-5 py-3 font-semibold">Modelo</th>
                  <th className="px-5 py-3 font-semibold">Série / Pat.</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Chamado / OS</th>
                  <th className="px-5 py-3 font-semibold w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtrados.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-muted-foreground">{e.cliente?.nome || "—"}</td>
                    <td className="px-5 py-3 font-medium">{e.nome}</td>
                    <td className="px-5 py-3 text-muted-foreground">{e.modelo || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span>{e.numero_serie || "Sem SN"}</span>
                        {e.patrimonio && <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded w-fit">{e.patrimonio}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        e.status === 'em_estoque' || e.status === 'retirado_em_estoque' ? 'bg-emerald-500/10 text-emerald-600' :
                        e.status === 'em_transito' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-blue-500/10 text-blue-600'
                      }`}>
                        {e.status === 'em_estoque' ? 'Em Estoque' :
                         e.status === 'em_transito' ? 'Em Trânsito' :
                         e.status === 'retirado_em_estoque' ? 'Retirado' :
                         'Instalado'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {e.os ? (
                        <div className="flex flex-col gap-0.5" title={e.os.titulo}>
                          <span className="text-sm font-medium">#{e.os.numero || "?"}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[120px]">{e.os.titulo || "—"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(e)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EquipamentoDialog open={open} onOpenChange={setOpen} equipamento={editing} />
    </div>
  );
}

// ---------------- DIALOGS ----------------

function ItemDialog({
  open, onOpenChange, item, defaultTipo, onSubmit
}: {
  open: boolean; onOpenChange: (v: boolean) => void; item: Item | null; defaultTipo: string;
  onSubmit: (data: Omit<Item, "id">) => Promise<void>;
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    reset({
      nome: item?.nome ?? "",
      codigo: item?.codigo ?? "",
      quantidade: item?.quantidade ?? 0,
      valor_unitario: item?.valor_unitario ?? 0,
      descricao: item?.descricao ?? "",
    });
  }, [item, reset, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Editar" : "Novo"} {defaultTipo === "ferramenta" ? "Ferramenta" : "Insumo"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(async (d) => await onSubmit({ ...d, codigo: d.codigo ?? "", descricao: d.descricao ?? "", tipo: defaultTipo }))} className="space-y-4">
          <div><Label>Nome *</Label><Input {...register("nome")} /></div>
          {defaultTipo === "ferramenta" && <div><Label>Descrição</Label><Input {...register("descricao")} /></div>}
          {defaultTipo !== "ferramenta" && <div><Label>Código</Label><Input {...register("codigo")} /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Qtd.</Label><Input type="number" {...register("quantidade")} /></div>
            <div><Label>Valor unit. (R$)</Label><Input type="number" step="0.01" {...register("valor_unitario")} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VincularDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (v: boolean) => void; item: Item | null }) {
  const { tecnicos, tecnicoFerramentas, addTecnicoFerramenta } = useStore();
  const { register, handleSubmit, setValue, watch, reset } = useForm<VincularFormData>({ resolver: zodResolver(vincularSchema) });
  const selectedTecnico = watch("tecnico_id");

  useEffect(() => { reset({ tecnico_id: "", quantidade: 1 }); }, [item, reset, open]);

  const quantidadeJaAtribuida = item ? tecnicoFerramentas.filter(f => f.item_id === item.id).reduce((acc, f) => acc + f.quantidade, 0) : 0;
  const quantidadeDisponivel = item ? item.quantidade - quantidadeJaAtribuida : 0;

  const onSubmit = async (data: VincularFormData) => {
    if (!item) return;
    if (data.quantidade > quantidadeDisponivel) {
      toast.error(`Apenas ${quantidadeDisponivel} un. disponível.`);
      return;
    }
    try {
      await addTecnicoFerramenta({
        tecnico_id: data.tecnico_id,
        item_id: item.id,
        quantidade: data.quantidade,
      });
      toast.success("Ferramenta vinculada!");
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Vincular "{item?.nome}"</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Técnico *</Label>
            <Select value={selectedTecnico} onValueChange={(v) => setValue("tecnico_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {tecnicos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantidade * (Disponível: {quantidadeDisponivel})</Label>
            <Input type="number" min="1" max={quantidadeDisponivel} disabled={quantidadeDisponivel <= 0} {...register("quantidade")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={quantidadeDisponivel <= 0}>Vincular</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EquipamentoDialog({ open, onOpenChange, equipamento }: { open: boolean; onOpenChange: (v: boolean) => void; equipamento: EquipamentoCliente | null }) {
  const { clientes, addEquipamento, updateEquipamento } = useStore();
  const { register, handleSubmit, reset, setValue, watch } = useForm<EquipamentoFormData>({ resolver: zodResolver(equipamentoSchema) });
  const cliente_id = watch("cliente_id");

  useEffect(() => {
    reset({
      cliente_id: equipamento?.cliente_id ?? "",
      nome: equipamento?.nome ?? "",
      modelo: equipamento?.modelo ?? "",
      numero_serie: equipamento?.numero_serie ?? "",
      patrimonio: equipamento?.patrimonio ?? "",
    });
  }, [equipamento, reset, open]);

  const onSubmit = async (data: EquipamentoFormData) => {
    try {
      if (equipamento) await updateEquipamento(equipamento.id, data);
      else await addEquipamento(data);
      toast.success("Equipamento salvo");
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{equipamento ? "Editar" : "Novo"} Equipamento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Cliente *</Label>
            <Select value={cliente_id} onValueChange={(v) => setValue("cliente_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nome/Tipo *</Label><Input {...register("nome")} placeholder="Ex: Ar Condicionado 9000 BTUs" /></div>
          <div><Label>Modelo</Label><Input {...register("modelo")} /></div>
          <div><Label>Patrimônio</Label><Input {...register("patrimonio")} /></div>
          <div><Label>Número de Série</Label><Input {...register("numero_serie")} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
