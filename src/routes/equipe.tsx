import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useStore } from "@/lib/mock-store";
import { Phone, BadgeCheck, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/equipe")({ component: EquipePage });

function EquipePage() {
  const { tecnicos, os, addTecnico, loadingTecnicos } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", perfil: "Técnico de Campo", telefone: "" });

  const submit = async () => {
    if (!form.nome.trim()) return toast.error("Informe o nome do técnico");
    try {
      await addTecnico({ ...form, ativo: true });
      toast.success("Técnico cadastrado!");
      setOpen(false);
      setForm({ nome: "", perfil: "Técnico de Campo", telefone: "" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao cadastrar");
    }
  };

  return (
    <GestorLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold">Equipe técnica</h2>
          <p className="text-sm text-muted-foreground">{tecnicos.length} técnicos cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> Novo Técnico</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Técnico</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Perfil / Especialidade</Label><Input value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })} placeholder="Ex.: Refrigeração, Elétrica" /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-0000" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loadingTecnicos ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i} className="p-5 h-44 animate-pulse bg-muted/40" />)}
        </div>
      ) : tecnicos.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold">Nenhum técnico cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">Cadastre seu primeiro técnico para começar a atribuir ordens de serviço.</p>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Cadastrar técnico</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tecnicos.map((t) => {
            const ativas = os.filter((o) => o.tecnicoId === t.id && o.status !== "Concluído" && o.status !== "Cancelado").length;
            return (
              <Card key={t.id} className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12"><AvatarFallback className="bg-primary text-primary-foreground">{t.nome[0]?.toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold">{t.nome}</h3>
                      {t.ativo && <BadgeCheck className="w-4 h-4 text-success" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{t.perfil}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3 h-3" />{t.telefone || "—"}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">OS Ativas</span>
                    <span className="font-semibold">{ativas}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`text-xs font-medium ${t.ativo ? "text-success" : "text-muted-foreground"}`}>{t.ativo ? "Ativo" : "Inativo"}</span>
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
