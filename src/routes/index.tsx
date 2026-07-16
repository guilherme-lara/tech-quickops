import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Shield, Zap, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 h-16 bg-background/80 backdrop-blur-xl border-b border-border/40 z-50">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/quickOpsLogo.png" alt="QuickOps" className="h-8 object-contain drop-shadow-sm" />
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Entrar
            </Link>
            <Link to="/login">
              <Button size="sm" className="rounded-full shadow-[var(--shadow-glow)] bg-primary text-primary-foreground hover:bg-primary/90">
                Começar Agora
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary shadow-sm">
              <Zap className="w-3.5 h-3.5" /> A evolução da gestão de campo
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
            Ordens de Serviço e <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
              RAT digital
            </span> em um só lugar.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            Controle a operação em campo, do orçamento à assinatura do cliente — em tempo real, sem papel e com total visibilidade para o seu negócio.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
            <Link to="/login">
              <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-[var(--shadow-glow)]">
                Criar conta grátis <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base shadow-sm">
                Acessar Sistema
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Tudo que sua operação precisa</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Uma plataforma completa desenhada para gestores, analistas e técnicos em campo.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, i) => (
              <div key={i} className="bg-background rounded-3xl p-8 border border-border/60 shadow-[var(--shadow-card)] hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-primary mb-6 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12 border-t border-border/40">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/quickOpsLogo.png" alt="QuickOps" className="h-6 object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} QuickOps. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: <LayoutDashboard className="w-6 h-6" />,
    title: "Kanban em Tempo Real",
    description: "Acompanhe o status de cada Ordem de Serviço em uma visão clara, movendo cards e acompanhando sua equipe instantaneamente."
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "RAT com Assinatura",
    description: "Técnicos preenchem o relatório no celular, anexam fotos e o cliente assina digitalmente na tela do aparelho."
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Gestão Descomplicada",
    description: "Crie acessos para sua equipe de suporte, gerencie clientes e controle o faturamento sem perder nenhum detalhe."
  }
];
