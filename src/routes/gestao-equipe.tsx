import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Users, UserCheck, Inbox } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/gestao-equipe")({
  component: () => (
    <ProtectedRoute allowedRoles={["analista", "admin", "superadmin"]}>
      <GestaoEquipePage />
    </ProtectedRoute>
  ),
});

type Tecnico = { id: string; nome: string };
type Analista = { id: string; nome: string };

// Mock do usuário logado — troque role para 'ADMIN' ou 'ANALISTA' para testar
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

const MOCK_DISPONIVEIS: Tecnico[] = [
  { id: "t1", nome: "João Silva" },
  { id: "t2", nome: "Marcos Pereira" },
  { id: "t3", nome: "Rafael Costa" },
  { id: "t4", nome: "Pedro Almeida" },
  { id: "t5", nome: "Lucas Rocha" },
];

const MOCK_EQUIPE: Tecnico[] = [
  { id: "t6", nome: "Fernanda Dias" },
  { id: "t7", nome: "Gustavo Nunes" },
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
  const [analistaSelecionado, setAnalistaSelecionado] = useState<string>(
    usuarioLogado.role === "ANALISTA" ? usuarioLogado.id : MOCK_ANALISTAS[0].id,
  );

  const [disponiveis, setDisponiveis] = useState<Tecnico[]>(MOCK_DISPONIVEIS);
  const [equipe, setEquipe] = useState<Tecnico[]>(MOCK_EQUIPE);

  const analistaLabel = useMemo(() => {
    if (usuarioLogado.role === "ANALISTA") return "sua equipe";
    const a = MOCK_ANALISTAS.find((x) => x.id === analistaSelecionado);
    return a ? `equipe de ${a.nome}` : "equipe";
  }, [analistaSelecionado]);

  function adicionarTecnico(t: Tecnico) {
    setDisponiveis((prev) => prev.filter((x) => x.id !== t.id));
    setEquipe((prev) => [...prev, t]);
  }

  function removerTecnico(t: Tecnico) {
    setEquipe((prev) => prev.filter((x) => x.id !== t.id));
    setDisponiveis((prev) => [...prev, t]);
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
          itens={disponiveis}
          emptyLabel="Todos os técnicos já estão em uma equipe"
          emptyIcon={<Inbox className="h-10 w-10 text-muted-foreground/50" />}
          renderAction={(t) => (
            <Button
              size="sm"
              variant="outline"
              onClick={() => adicionarTecnico(t)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          )}
        />

        <ListaCard
          titulo="Equipe Supervisionada"
          icone={<UserCheck className="h-5 w-5 text-muted-foreground" />}
          itens={equipe}
          emptyLabel="Nenhum técnico nesta equipe ainda."
          emptyIcon={<Users className="h-10 w-10 text-muted-foreground/50" />}
          renderAction={(t) => (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removerTecnico(t)}
              className="gap-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          )}
        />
      </div>
    </div>
  );
}

function ListaCard({
  titulo,
  icone,
  itens,
  emptyLabel,
  emptyIcon,
  renderAction,
}: {
  titulo: string;
  icone: React.ReactNode;
  itens: Tecnico[];
  emptyLabel: string;
  emptyIcon: React.ReactNode;
  renderAction: (t: Tecnico) => React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {icone}
          {titulo}
        </CardTitle>
        <Badge variant="secondary">{itens.length}</Badge>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 gap-3">
            {emptyIcon}
            <p className="text-sm text-muted-foreground max-w-xs">
              {emptyLabel}
            </p>
          </div>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {itens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 transition-all duration-200 hover:border-border hover:shadow-sm animate-in fade-in slide-in-from-top-1"
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
