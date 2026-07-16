import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Shield, Zap, LayoutDashboard, Settings, CheckCircle2, Smartphone, Monitor, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 h-20 bg-background/80 backdrop-blur-xl border-b border-border/40 z-50">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/quickOpsLogo.png" alt="QuickOps" className="h-12 sm:h-14 md:h-16 object-contain drop-shadow-sm" />
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden sm:block text-sm font-medium hover:text-primary transition-colors">
              Entrar
            </Link>
            <Link to="/login">
              <Button size="default" className="rounded-full shadow-[var(--shadow-glow)] bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6">
                Teste Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-20 md:pt-48 md:pb-32 overflow-hidden relative">
        {/* Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-blue-600/20 to-indigo-500/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-semibold text-primary shadow-sm">
                <Zap className="w-4 h-4" /> Experimente por 14 dias grátis
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150 leading-[1.1]">
              Eleve sua operação de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">campo</span> ao estado da arte.
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 font-medium">
              A plataforma definitiva para gerenciar Ordens de Serviço, rastrear técnicos e colher assinaturas digitais — sem papel, sem atrasos.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-8 h-14 text-lg font-bold shadow-[var(--shadow-glow)]">
                  Começar Teste Grátis <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona (Mini-Onboarding) */}
      <section className="py-24 bg-muted/30 border-y border-border/40 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Como o QuickOps funciona?</h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Um fluxo contínuo desenhado para acabar com o retrabalho e acelerar o faturamento.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto relative">
            {/* Linha conectora (visível apenas em desktop) */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

            {/* Passo 1 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 rounded-3xl bg-background border border-border/50 shadow-xl flex items-center justify-center text-blue-600 mb-8 group-hover:-translate-y-2 transition-transform duration-300">
                <Monitor className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-4">1. O Gestor cria a OS</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Pelo painel web, você cadastra o cliente, detalha o problema e despacha o serviço para o técnico disponível via Kanban.
              </p>
            </div>

            {/* Passo 2 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 rounded-3xl bg-background border border-border/50 shadow-xl flex items-center justify-center text-indigo-500 mb-8 group-hover:-translate-y-2 transition-transform duration-300">
                <Smartphone className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-4">2. O Técnico atende</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Pelo celular, o técnico recebe a notificação, visualiza o endereço, preenche os materiais usados e tira fotos do serviço executado.
              </p>
            </div>

            {/* Passo 3 */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-24 h-24 rounded-3xl bg-background border border-border/50 shadow-xl flex items-center justify-center text-green-500 mb-8 group-hover:-translate-y-2 transition-transform duration-300">
                <FileSignature className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-4">3. O Cliente assina</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Tudo pronto! O Relatório de Atendimento Técnico (RAT) é gerado na hora e o cliente assina digitalmente na tela do celular.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Investimento Simples e Transparente</h2>
            <p className="text-muted-foreground text-xl max-w-xl mx-auto">
              Sem taxas escondidas. Comece de graça e pague apenas se o QuickOps transformar sua operação.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-background rounded-[2.5rem] p-8 md:p-10 border border-primary/20 shadow-2xl relative overflow-hidden group hover:border-primary/40 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -z-10 group-hover:bg-primary/20 transition-colors" />
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Plano Profissional</h3>
                <p className="text-muted-foreground">Tudo que você precisa para crescer.</p>
              </div>

              <div className="mb-8 flex items-baseline gap-2">
                <span className="text-5xl font-black tracking-tight">R$ 299</span>
                <span className="text-muted-foreground font-medium">/mês</span>
              </div>

              <ul className="space-y-4 mb-10">
                {[
                  "Usuários (Técnicos e Gestores) ilimitados",
                  "Ordens de Serviço ilimitadas",
                  "Assinatura Digital (RAT)",
                  "Armazenamento de fotos em nuvem",
                  "Suporte prioritário"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                    <span className="text-lg text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <Link to="/login" className="block w-full">
                <Button size="lg" className="w-full h-14 rounded-2xl text-lg font-bold shadow-[var(--shadow-glow)]">
                  Começar 14 Dias Grátis
                </Button>
              </Link>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Não requer cartão de crédito.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-16 border-t border-border/40">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/quickOpsLogo.png" alt="QuickOps" className="h-8 object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
          </div>
          <p className="text-base text-muted-foreground font-medium">
            © {new Date().getFullYear()} QuickOps. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
