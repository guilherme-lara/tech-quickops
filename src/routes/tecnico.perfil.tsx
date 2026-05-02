import { createFileRoute } from "@tanstack/react-router";
import { TecnicoLayout } from "@/components/TecnicoLayout";
import { useStore } from "@/lib/mock-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Award } from "lucide-react";

export const Route = createFileRoute("/tecnico/perfil")({ component: Perfil });

function Perfil() {
  const { user, os } = useStore();
  const tecnicoId = "t1";
  const concluidas = os.filter((o) => o.tecnicoId === tecnicoId && o.status === "Concluído").length;
  const ativas = os.filter((o) => o.tecnicoId === tecnicoId && o.status === "Em Execução").length;

  return (
    <TecnicoLayout>
      <div className="p-6 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex flex-col items-center rounded-b-3xl">
        <Avatar className="w-20 h-20 border-4 border-primary-foreground/20">
          <AvatarFallback className="bg-card text-foreground text-2xl">{user?.nome?.[0]}</AvatarFallback>
        </Avatar>
        <h2 className="font-bold text-lg mt-3">{user?.nome}</h2>
        <p className="text-sm opacity-80">Técnico de Refrigeração</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{concluidas}</div><div className="text-xs text-muted-foreground">Concluídas</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{ativas}</div><div className="text-xs text-muted-foreground">Em execução</div></Card>
      </div>
      <div className="p-4 space-y-2">
        <Card className="p-4 flex items-center gap-3"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{user?.email}</span></Card>
        <Card className="p-4 flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground" /><span className="text-sm">(11) 98888-1111</span></Card>
        <Card className="p-4 flex items-center gap-3"><Award className="w-4 h-4 text-muted-foreground" /><span className="text-sm">Certificação NR-10</span></Card>
      </div>
    </TecnicoLayout>
  );
}
