import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GestorLayout } from "@/components/GestorLayout";
import { useAuth } from "@/lib/auth-context";
import { PlanLimits, PlanType } from "@/lib/planLimits";
import { Card } from "@/components/ui/card";
import { Check, X, Rocket, Zap, Shield, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/planos")({
  component: () => (
    <ProtectedRoute allowedRoles={['gestor', 'admin', 'superadmin']}>
      <PlanosPage />
    </ProtectedRoute>
  ),
});

function PlanosPage() {
  const { profile } = useAuth();
  const planoAtual = (profile?.empresaPlano as PlanType) || "free";

  const planos = [
    {
      id: "free",
      nome: "Free",
      preco: "Grátis",
      descricao: "Para autônomos iniciando.",
      icon: Rocket,
      color: "text-zinc-400",
      bgIcon: "bg-zinc-500/10",
      features: [
        "1 Técnico",
        "15 Ordens de Serviço / mês",
        "Assinatura Digital",
        "Sem Gestão Financeira",
      ],
      limites: PlanLimits.free,
    },
    {
      id: "starter",
      nome: "Starter",
      preco: "R$ 99/mês",
      descricao: "Equipes pequenas em crescimento.",
      icon: Zap,
      color: "text-amber-500",
      bgIcon: "bg-amber-500/10",
      features: [
        "Até 3 Técnicos",
        "Até 50 Ordens de Serviço / mês",
        "Dashboard Operacional",
        "Sem Gestão Financeira",
      ],
      limites: PlanLimits.starter,
    },
    {
      id: "pro",
      nome: "Pro",
      preco: "R$ 199/mês",
      descricao: "Gestão completa para sua operação.",
      icon: Shield,
      color: "text-blue-500",
      bgIcon: "bg-blue-500/10",
      features: [
        "Até 10 Técnicos",
        "Até 200 Ordens de Serviço / mês",
        "Painel Financeiro e Faturamento",
        "Múltiplos Dias de Pagamento",
      ],
      limites: PlanLimits.pro,
      popular: true,
    },
    {
      id: "premium",
      nome: "Premium",
      preco: "R$ 299/mês",
      descricao: "Sem limites, controle total.",
      icon: Crown,
      color: "text-violet-500",
      bgIcon: "bg-violet-500/10",
      features: [
        "Técnicos Ilimitados",
        "Ordens de Serviço Ilimitadas",
        "Painel Financeiro e Faturamento",
        "Suporte Prioritário",
      ],
      limites: PlanLimits.premium,
    },
  ];

  return (
    <GestorLayout>
      <div className="max-w-6xl mx-auto py-10 px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Escolha o plano ideal para sua operação</h1>
          <p className="text-lg text-muted-foreground">
            Evolua seu plano conforme a sua empresa cresce. Sem surpresas ou taxas escondidas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {planos.map((p) => {
            const isAtual = planoAtual === p.id;
            return (
              <Card 
                key={p.id} 
                className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all ${
                  isAtual ? "border-primary shadow-[var(--shadow-glow)]" : "border-border/60 hover:border-primary/50"
                }`}
              >
                {p.popular && !isAtual && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">Mais Popular</Badge>
                )}
                {isAtual && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Seu Plano Atual</Badge>
                )}

                <div className="mb-6 flex flex-col gap-2">
                  <div className={`w-12 h-12 rounded-xl ${p.bgIcon} flex items-center justify-center mb-2`}>
                    <p.icon className={`w-6 h-6 ${p.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold">{p.nome}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{p.preco}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 min-h-[40px]">{p.descricao}</p>
                </div>

                <div className="flex-1">
                  <ul className="space-y-3 text-sm">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50">
                  <Button 
                    className="w-full rounded-xl h-11 font-semibold"
                    variant={isAtual ? "secondary" : "default"}
                    disabled={isAtual}
                    onClick={() => {
                      if (!isAtual) {
                        window.open("https://wa.me/5511999999999?text=Olá, quero fazer o upgrade para o plano " + p.nome, "_blank");
                      }
                    }}
                  >
                    {isAtual ? "Plano Atual" : "Fazer Upgrade"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </GestorLayout>
  );
}
