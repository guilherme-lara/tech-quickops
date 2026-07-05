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
import { useStore, type Item, PAGE_SIZE } from "@/lib/mock-store";
import { Package, AlertTriangle, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FiltrosBarGlobal } from "@/components/FiltrosBarGlobal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { logActivity } from "@/lib/logger";

const itemSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  codigo: z.string().max(100, "Código muito longo").optional(),
  quantidade: z.coerce.number().int("Quantidade deve ser um número inteiro").min(0, "Quantidade não pode ser negativa"),
  valor_unitario: z.coerce.number().min(0, "Valor unitário não pode ser negativo"),
});

type ItemFormData = z.infer<typeof itemSchema>;

export const Route = createFileRoute("/estoque")({
  component: () => (
    <ProtectedRoute>
      <EstoquePage />
    </ProtectedRoute>
  ),
});

function EstoquePage() {
  const { itens, loadingItens, addItem, updateItem, deleteItem, estoquePage, estoqueTotal, setEstoquePage, estoqueSearch, setEstoqueSearch } = useStore();
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const nomeUsuario = profile?.nome_completo || "usuário";
  const registrarLog = async (tipo: string, descricao: string) => {
    if (!empresaId) return;
    await logActivity(tipo, descricao, empresaId);
  };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const totalEstoquePages = Math.max(1, Math.ceil(estoqueTotal / PAGE_SIZE));

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (i: Item) => {
    setEditing(i);
    setOpen(true);
  };
  const handleDelete = async (i: Item) => {
    if (!window.confirm(`Excluir "${i.nome}"?`)) return;
    try {
      await deleteItem(i.id);
      await registrarLog("estoque_deletado", `Item "${i.nome}" removido por ${nomeUsuario}`);
      toast.success("Item excluído");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <GestorLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5 justify-between">
        <FiltrosBarGlobal
          showSearch
          searchValue={estoqueSearch}
          onSearchChange={setEstoqueSearch}
          searchLabel="Item"
          searchPlaceholder="Buscar por nome ou código..."
        />
        <Button onClick={openNew} className="h-11 rounded-xl gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo item
        </Button>
      </div>

      {loadingItens ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <EmptyState
          icon={Package}
          title={estoqueSearch ? "Nenhum item encontrado" : "Inventário vazio"}
          description={
            estoqueSearch
              ? "Tente outro termo de busca."
              : "Cadastre o primeiro item para começar a controlar seu inventário."
          }
          action={
            !estoqueSearch ? (
              <Button onClick={openNew} className="gap-2">
                <Plus className="w-4 h-4" /> Novo item
              </Button>
            ) : undefined
          }
        />

      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nome</th>
                  <th className="px-5 py-3 font-semibold">Código</th>
                  <th className="px-5 py-3 font-semibold">Quantidade</th>
                  <th className="px-5 py-3 font-semibold">Valor unit.</th>
                  <th className="px-5 py-3 font-semibold">Valor total</th>
                  <th className="px-5 py-3 font-semibold w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(Array.isArray(itens) ? itens : []).map((i) => {
                  const baixo = i.quantidade < 10;
                  const total = i.quantidade * i.valor_unitario;
                  return (
                    <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium">{i.nome}</td>
                      <td className="px-5 py-3 text-muted-foreground">{i.codigo || "—"}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`flex items-center gap-1.5 font-medium ${baixo ? "text-warning-foreground" : ""}`}
                        >
                          {baixo && <AlertTriangle className="w-3.5 h-3.5" />}
                          {i.quantidade} un.
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        R$ {i.valor_unitario.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-success">
                        R$ {total.toFixed(2)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(i)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(i)}
                          >
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
          {/* Paginação Estoque */}
          {itens.length > 0 && (
            <div className="flex items-center justify-between px-1 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Mostrando {estoquePage * PAGE_SIZE + 1}–{Math.min((estoquePage + 1) * PAGE_SIZE, estoqueTotal)}{" "}
                de {estoqueTotal} itens
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEstoquePage(Math.max(0, estoquePage - 1))}
                  disabled={estoquePage === 0}
                  className="rounded-lg gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </Button>
                <span className="text-xs font-medium tabular-nums px-2">
                  Página {estoquePage + 1} de {totalEstoquePages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEstoquePage(Math.min(totalEstoquePages - 1, estoquePage + 1))}
                  disabled={estoquePage >= totalEstoquePages - 1}
                  className="rounded-lg gap-1"
                >
                  Próxima <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ItemDialog
        open={open}
        onOpenChange={setOpen}
        item={editing}
        onSubmit={async (data) => {
          try {
            if (editing) {
              await updateItem(editing.id, data);
              await registrarLog("estoque_editado", `Item "${data.nome}" editado por ${nomeUsuario}`);
              toast.success("Item atualizado");
            } else {
              await addItem(data);
              await registrarLog("estoque_criado", `Item "${data.nome}" cadastrado por ${nomeUsuario}`);
              toast.success("Item cadastrado");
            }
            setOpen(false);
          } catch (e: any) {
            toast.error(e.message);
          }
        }}
      />
    </GestorLayout>
  );
}

function ItemDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Item | null;
  onSubmit: (data: Omit<Item, "id">) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      nome: item?.nome ?? "",
      codigo: item?.codigo ?? "",
      quantidade: item?.quantidade ?? 0,
      valor_unitario: item?.valor_unitario ?? 0,
    },
  });

  // Reset form when item changes
  useEffect(() => {
    reset({
      nome: item?.nome ?? "",
      codigo: item?.codigo ?? "",
      quantidade: item?.quantidade ?? 0,
      valor_unitario: item?.valor_unitario ?? 0,
    });
  }, [item, reset]);

  const handleFormSubmit = async (data: ItemFormData) => {
    await onSubmit({
      nome: data.nome.trim(),
      codigo: data.codigo?.trim() || "",
      quantidade: data.quantidade,
      valor_unitario: data.valor_unitario,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          reset({
            nome: item?.nome ?? "",
            codigo: item?.codigo ?? "",
            quantidade: item?.quantidade ?? 0,
            valor_unitario: item?.valor_unitario ?? 0,
          });
        }
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Novo item"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 py-2" onSubmit={handleSubmit(handleFormSubmit)}>
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...register("nome")} />
            {errors.nome && (
              <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" {...register("codigo")} />
            {errors.codigo && (
              <p className="text-sm text-destructive mt-1">{errors.codigo.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                min="0"
                step="1"
                {...register("quantidade")}
              />
              {errors.quantidade && (
                <p className="text-sm text-destructive mt-1">{errors.quantidade.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="valor_unitario">Valor unitário (R$)</Label>
              <Input
                id="valor_unitario"
                type="number"
                step="0.01"
                min="0"
                {...register("valor_unitario")}
              />
              {errors.valor_unitario && (
                <p className="text-sm text-destructive mt-1">{errors.valor_unitario.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : item ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
