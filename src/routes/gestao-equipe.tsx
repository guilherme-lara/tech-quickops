import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Users, UserCheck, Inbox, Search, Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { equipeStore, useEquipeStore, type Tecnico } from "@/lib/equipe-store";

export const Route = createFileRoute("/gestao-equipe")({
  component: () => (
    <ProtectedRoute allowedRoles={["analista", "admin", "superadmin"]}>
      <GestaoEquipePage />
    </ProtectedRoute>
  ),
});

type Analista = { id: string; nome: string };

const usuarioLogado: {
  id: string;
  role: "ADMIN" | "ANALISTA";
  empresa_id: string;
} = {
  id: "u1",
  role: "ADMIN",
  empresa_id: "emp-1",
};

const MOCK_ANALISTAS: Analista[] = [
  { id: "a1", nome: "Ana Souza" },
  { id: "a2", nome: "Bruno Lima" },
  { id: "a3", nome: "Carla Mendes" },
];

function initials(nome: string) {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function GestaoEquipePage() {
  const { disponiveis, equipe, loading } = useEquipeStore();
  const [analistaSelecionado, setAnalistaSelecionado] = useState<string>(
    usuarioLogado.role === "ANALISTA" ? usuarioLogado.id : MOCK_ANALISTAS[0].id,
  );
  const [busca, setBusca] = useState("");
  const [confirmar, setConfirmar] = useState<Tecnico | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const disponiveisFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return disponiveis;
    return disponiveis.filter((t) => t.nome.toLowerCase().includes(q));
  }, [busca, disponiveis]);

  const analistaLabel = useMemo(() => {
    if (usuarioLogado.role === "ANALISTA") return "sua equipe";
    const a = MOCK_ANALISTAS.find((x) => x.id === analistaSelecionado);
    return a ? `equipe de ${a.nome}` : "equipe";
  }, [analistaSelecionado]);

  async function handleAdicionar(t: Tecnico) {
    setPendingId(t.id);
    await equipeStore.adicionar(t);
    setPendingId(null);
  }

  async function handleConfirmarRemocao() {
    if (!confirmar) return;
    const t = confirmar;
    setPendingId(t.id);
    setConfirmar(null);
    await equipeStore.remover(t);
    setPendingId(null);
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Gestão de Equipe</h1>
        <p className="text-muted-foreground">
          Monte e ajuste {analistaLabel} movendo técnicos entre as listas.
        </p>
      </header>

      {usuarioLogado.role === "ADMIN" && (
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">
              Analista supervisor
            </label>
            <Select
              value={analistaSelecionado}
              onValueChange={setAnalistaSelecionado}
            >
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="Selecione um analista" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_ANALISTAS.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ListaCard
          titulo="Técnicos Disponíveis"
          icone={<Users className="h-5 w-5 text-muted-foreground" />}
          itens={disponiveisFiltrados}
          countBadge={disponiveis.length}
          loading={loading}
          pendingId={pendingId}
          emptyLabel={
            busca
              ? "Nenhum técnico encontrado para essa busca."
              : "Todos os técnicos já estão em uma equipe"
          }
          emptyIcon={<Inbox className="h-10 w-10 text-muted-foreground/50" />}
          header={
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome..."
                className="pl-8"
              />
            </div>
          }
          renderAction={(t) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAdicionar(t)}
              disabled={loading}
              className="gap-1"
            >
              {pendingId === t.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          )}
        />

        <ListaCard
          titulo="Equipe Supervisionada"
          icone={<UserCheck className="h-5 w-5 text-muted-foreground" />}
          itens={equipe}
          countBadge={equipe.length}
          loading={loading}
          pendingId={pendingId}
          emptyLabel="Nenhum técnico nesta equipe ainda."
          emptyIcon={<Users className="h-10 w-10 text-muted-foreground/50" />}
          renderAction={(t) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmar(t)}
              disabled={loading}
              className="gap-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              {pendingId === t.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remover
            </Button>
          )}
        />
      </div>

      <AlertDialog open={!!confirmar} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover técnico da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar
                ? `${confirmar.nome} será movido de volta para "Técnicos Disponíveis". Você pode adicioná-lo novamente a qualquer momento.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarRemocao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ListaCard({
  titulo,
  icone,
  itens,
  countBadge,
  loading,
  pendingId,
  emptyLabel,
  emptyIcon,
  header,
  renderAction,
}: {
  titulo: string;
  icone: React.ReactNode;
  itens: Tecnico[];
  countBadge: number;
  loading: boolean;
  pendingId: string | null;
  emptyLabel: string;
  emptyIcon: React.ReactNode;
  header?: React.ReactNode;
  renderAction: (t: Tecnico) => React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {icone}
          {titulo}
        </CardTitle>
        <Badge variant="secondary">{countBadge}</Badge>
      </CardHeader>
      <CardContent>
        {header}
        {itens.length === 0 ? (
          loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12 gap-3">
              {emptyIcon}
              <p className="text-sm text-muted-foreground max-w-xs">{emptyLabel}</p>
            </div>
          )
        ) : (
          <ul className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {itens.map((t) => (
              <li
                key={t.id}
                className={`flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 transition-all duration-200 hover:border-border hover:shadow-sm animate-in fade-in slide-in-from-top-1 ${
                  pendingId === t.id ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {initials(t.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">Técnico</p>
                  </div>
                </div>
                {renderAction(t)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
