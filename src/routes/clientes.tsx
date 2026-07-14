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
import { useStore, PAGE_SIZE } from "@/lib/useData";
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
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { validarDocumento, maskPhoneBR } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 as TrashIcon, Plus as PlusIcon } from "lucide-react";
import { FiltrosBarGlobal } from "@/components/FiltrosBarGlobal";
import { useAuth } from "@/lib/auth-context";
import { logActivity } from "@/lib/logger";

export const Route = createFileRoute("/clientes")({
  component: () => (
    <ProtectedRoute>
      <ClientesPage />
    </ProtectedRoute>
  ),
});

type Analista = { id?: string; nome: string; whatsapp: string; _new?: boolean };

function ClientesPage() {
  const {
    clientes,
    addCliente,
    updateCliente,
    deleteCliente,
    loadingClientes,
    clientesPage,
    clientesTotal,
    setClientesPage,
    clientesSearch,
    setClientesSearch,
  } = useStore();
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const nomeUsuario = profile?.nome_completo || "usuário";
  const registrarLog = async (tipo: string, descricao: string) => {
    if (!empresaId) return;
    await logActivity(tipo, descricao, empresaId);
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    nome: "",
    documento: "",
    telefone: "",
    email: "",
    endereco_completo: "",
    cidade: "",
    base_km: "",
    valor_por_km: "",
    dia_pagamento: "",
    dia_envio_planilha: "",
    modelo_rat_url: "",
  });
  const [analistas, setAnalistas] = useState<Analista[]>([]);
  const [loadingAnalistas, setLoadingAnalistas] = useState(false);
  const [uploadingRat, setUploadingRat] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  const totalClientesPages = Math.max(1, Math.ceil(clientesTotal / PAGE_SIZE));

  const openNew = () => {
    setForm({
      id: "",
      nome: "",
      documento: "",
      telefone: "",
      email: "",
      endereco_completo: "",
      cidade: "",
      base_km: "",
      valor_por_km: "",
      dia_pagamento: "",
      dia_envio_planilha: "",
      modelo_rat_url: "",
    });
    setAnalistas([]);
    setOpen(true);
  };

  const openEdit = (c: any) => {
    setForm({
      id: c.id,
      nome: c.nome,
      documento: c.documento,
      telefone: c.telefone,
      email: c.email,
      endereco_completo: c.endereco_completo ?? "",
      cidade: c.cidade ?? "",
      base_km: c.base_km != null ? String(c.base_km) : "",
      valor_por_km: c.valor_por_km != null ? String(c.valor_por_km) : "",
      dia_pagamento: c.dia_pagamento != null ? String(c.dia_pagamento) : "",
      dia_envio_planilha: c.dia_envio_planilha != null ? String(c.dia_envio_planilha) : "",
      modelo_rat_url: c.modelo_rat_url ?? "",
    });
    setAnalistas([]);
    setOpen(true);
  };

  // Carrega analistas do cliente selecionado
  useEffect(() => {
    if (!open || !form.id) return;
    let cancel = false;
    (async () => {
      setLoadingAnalistas(true);
      const { data, error } = await (supabase.from("analistas_cliente" as any) as any)
        .select("id, nome, whatsapp")
        .eq("cliente_id", form.id)
        .order("created_at", { ascending: true });
      if (!cancel) {
        if (error) toast.error("Erro ao carregar analistas: " + error.message);
        setAnalistas(
          (data ?? []).map((a: any) => ({ id: a.id, nome: a.nome, whatsapp: a.whatsapp ?? "" })),
        );
        setLoadingAnalistas(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, form.id]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este cliente?")) {
      try {
        console.log("Tentando excluir cliente:", id);
        const cliente = clientes.find((c) => c.id === id);
        await deleteCliente(id);
        if (cliente) {
          console.log("Logando exclusão...");
          await logActivity(
            "cliente_excluido",
            `Cliente ${cliente.nome} excluído pelo usuário ${(profile as any)?.nome || profile?.nome_completo || "Sistema"}`,
            profile?.empresa_id || "",
            (profile as any)?.nome || profile?.nome_completo || "Sistema",
          );
        }
        toast.success("Cliente excluído!");
      } catch (err: any) {
        console.error("Erro no fluxo de exclusão de cliente:", err);
        toast.error("Erro ao excluir cliente: " + err.message);
      }
    }
  };

  const addAnalista = () =>
    setAnalistas((prev) => [...prev, { nome: "", whatsapp: "", _new: true }]);

  const removeAnalista = async (idx: number) => {
    const a = analistas[idx];
    if (a.id) {
      const { error } = await (supabase.from("analistas_cliente" as any) as any)
        .delete()
        .eq("id", a.id);
      if (error) return toast.error("Erro ao remover analista: " + error.message);
    }
    setAnalistas((prev) => prev.filter((_, i) => i !== idx));
  };

  const persistAnalistas = async (clienteId: string) => {
    // Busca empresa_id do cliente para satisfazer a policy
    const { data: cli } = await supabase
      .from("clientes")
      .select("empresa_id")
      .eq("id", clienteId)
      .maybeSingle();
    const empresa_id = cli?.empresa_id;
    if (!empresa_id) return;

    for (const a of analistas) {
      if (!a.nome.trim()) continue;
      if (a.id) {
        await (supabase.from("analistas_cliente" as any) as any)
          .update({ nome: a.nome, whatsapp: a.whatsapp })
          .eq("id", a.id);
      } else {
        await (supabase.from("analistas_cliente" as any) as any).insert({
          cliente_id: clienteId,
          empresa_id,
          nome: a.nome,
          whatsapp: a.whatsapp,
        });
      }
    }
  };

  const submit = async () => {
    if (!form.nome) {
      return toast.error("Nome fantasia é obrigatório.");
    }
    if (form.documento && !validarDocumento(form.documento)) {
      return toast.error("Documento (CNPJ/CPF) inválido.");
    }

    try {
      const payload = {
        ...form,
        base_km: form.base_km ? Number(form.base_km) : undefined,
        valor_por_km: form.valor_por_km ? Number(form.valor_por_km) : undefined,
        dia_pagamento: form.dia_pagamento ? Number(form.dia_pagamento) : undefined,
        dia_envio_planilha: form.dia_envio_planilha ? Number(form.dia_envio_planilha) : undefined,
      };
      let clienteId = form.id;
      if (form.id) {
        await updateCliente(form.id, payload as any);
      } else {
        // addCliente não retorna id — recuperamos o mais recente do usuário abaixo.
        await addCliente(payload as any);
        // Buscar o cliente recém-criado (mesmo nome + documento)
        const { data: novo } = await supabase
          .from("clientes")
          .select("id")
          .eq("nome", form.nome)
          .order("created_at", { ascending: false })
          .limit(1);
        clienteId = novo?.[0]?.id ?? "";
        await registrarLog(
          "cliente_criado",
          `Cliente "${form.nome}" cadastrado por ${nomeUsuario}`,
        );
      }
      if (clienteId && analistas.length > 0) {
        await persistAnalistas(clienteId);
      }
      toast.success(form.id ? "Cliente atualizado!" : "Cliente cadastrado!");
      setOpen(false);
      setForm({
        id: "",
        nome: "",
        documento: "",
        telefone: "",
        email: "",
        cidade: "",
        base_km: "",
        valor_por_km: "",
        dia_pagamento: "",
        dia_envio_planilha: "",
        modelo_rat_url: "",
      });
      setAnalistas([]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar cliente");
    }
  };

  const handleUploadRat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingRat(true);
      const ext = file.name.split('.').pop();
      const fileName = `modelo_rat_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("rats")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("rats")
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, modelo_rat_url: publicUrl }));
      toast.success("Modelo RAT anexado!");
    } catch (err: any) {
      toast.error("Erro ao enviar modelo: " + err.message);
    } finally {
      setUploadingRat(false);
    }
  };

  return (
    <GestorLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">Clientes</h2>
          <p className="text-sm text-muted-foreground">{clientesTotal} cadastrados</p>
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
            <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome Fantasia</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, telefone: maskPhoneBR(e.target.value) })}
                    placeholder="(11) 99999-0000"
                    inputMode="numeric"
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
                <div>
                  <Label>Endereço Completo (Rua, Número, Bairro)</Label>
                  <Input
                    value={form.endereco_completo}
                    onChange={(e) => setForm({ ...form, endereco_completo: e.target.value })}
                    placeholder="Ex: Av Paulista, 1000 - Bela Vista"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cidade/Estado</Label>
                    <Input
                      value={form.cidade}
                      onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                      placeholder="São Paulo - SP"
                    />
                  </div>
                  <div>
                    <Label>Quilometragem Base (km)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.base_km}
                      onChange={(e) => setForm({ ...form, base_km: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Valor por KM (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.valor_por_km}
                      onChange={(e) => setForm({ ...form, valor_por_km: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Dia de Pagamento (1-31)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex: 15"
                      value={form.dia_pagamento}
                      onChange={(e) => setForm({ ...form, dia_pagamento: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Dia de Envio de Planilhas/Notas (1-31)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Ex: 10"
                      value={form.dia_envio_planilha}
                      onChange={(e) => setForm({ ...form, dia_envio_planilha: e.target.value })}
                    />
                  </div>
                </div>

                {/* Modelo RAT */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 mt-4">
                  <div className="text-sm font-semibold mb-1">Modelo RAT do Cliente (Opcional)</div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Faça upload do modelo de RAT para que o técnico possa baixá-lo na OS.
                  </div>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="file" 
                      accept=".pdf,.doc,.docx" 
                      onChange={handleUploadRat} 
                      disabled={uploadingRat}
                      className="max-w-[250px]"
                    />
                    {uploadingRat && <span className="text-xs text-muted-foreground">Enviando...</span>}
                  </div>
                  {form.modelo_rat_url && (
                    <div className="mt-2 text-xs">
                      <a href={form.modelo_rat_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Visualizar arquivo atual
                      </a>
                    </div>
                  )}
                </div>

                {/* Contatos de Suporte / Analistas */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold">Contatos de Suporte</div>
                      <div className="text-xs text-muted-foreground">
                        Analistas vinculados a este cliente
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addAnalista}>
                      <PlusIcon className="w-3.5 h-3.5" /> Adicionar
                    </Button>
                  </div>
                  {loadingAnalistas ? (
                    <div className="text-xs text-muted-foreground py-2">Carregando…</div>
                  ) : analistas.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2">
                      Nenhum analista cadastrado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {analistas.map((a, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <Input
                            placeholder="Nome"
                            value={a.nome}
                            onChange={(e) =>
                              setAnalistas((prev) =>
                                prev.map((x, i) =>
                                  i === idx ? { ...x, nome: e.target.value } : x,
                                ),
                              )
                            }
                            className="flex-1"
                          />
                          <Input
                            placeholder="WhatsApp"
                            value={a.whatsapp}
                            onChange={(e) =>
                              setAnalistas((prev) =>
                                prev.map((x, i) =>
                                  i === idx ? { ...x, whatsapp: maskPhoneBR(e.target.value) } : x,
                                ),
                              )
                            }
                            className="flex-1"
                            inputMode="numeric"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeAnalista(idx)}
                            className="h-9 w-9 shrink-0 text-destructive"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!form.id && (
                    <div className="text-[11px] text-muted-foreground mt-2">
                      Dica: você também pode adicionar analistas após salvar o cliente.
                    </div>
                  )}
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

      <FiltrosBarGlobal
        showSearch
        searchValue={clientesSearch}
        onSearchChange={setClientesSearch}
        searchLabel="Cliente"
        searchPlaceholder="Buscar por nome do cliente..."
      />

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
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground md:hidden">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Nome Fantasia</th>
                        <th className="px-5 py-3 font-semibold">Documento</th>
                        <th className="px-5 py-3 font-semibold">Contato</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(Array.isArray(clientes) ? clientes : []).map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-4 font-medium whitespace-nowrap">{c.nome}</td>
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
                {(Array.isArray(clientes) ? clientes : []).map((c) => (
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
                        {c.nome[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-base leading-tight">{c.nome}</div>
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

      {/* Paginação Clientes */}
      {clientes.length > 0 && viewMode === "list" && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-muted-foreground">
            Mostrando {clientesPage * PAGE_SIZE + 1}–
            {Math.min((clientesPage + 1) * PAGE_SIZE, clientesTotal)} de {clientesTotal} clientes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClientesPage(Math.max(0, clientesPage - 1))}
              disabled={clientesPage === 0}
              className="rounded-lg gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <span className="text-xs font-medium tabular-nums px-2">
              Página {clientesPage + 1} de {totalClientesPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClientesPage(Math.min(totalClientesPages - 1, clientesPage + 1))}
              disabled={clientesPage >= totalClientesPages - 1}
              className="rounded-lg gap-1"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </GestorLayout>
  );
}
