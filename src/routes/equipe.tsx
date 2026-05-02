import { createFileRoute } from "@tanstack/react-router";
import { GestorLayout } from "@/components/GestorLayout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStore } from "@/lib/mock-store";
import { Phone, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/equipe")({ component: EquipePage });

function EquipePage() {
  const { tecnicos, os } = useStore();
  return (
    <GestorLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tecnicos.map((t) => {
          const ativas = os.filter((o) => o.tecnicoId === t.id && o.status !== "Concluído" && o.status !== "Cancelado").length;
          return (
            <Card key={t.id} className="p-5">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12"><AvatarFallback className="bg-primary text-primary-foreground">{t.nome[0]}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold">{t.nome}</h3>
                    {t.ativo && <BadgeCheck className="w-4 h-4 text-success" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.perfil}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3 h-3" />{t.telefone}</div>
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
    </GestorLayout>
  );
}
