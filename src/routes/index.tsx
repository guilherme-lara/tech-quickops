import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LayoutDashboard, CheckCircle2, Smartphone, Monitor, FileSignature, MapPin, Box, ShieldCheck, LineChart, Package, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 h-20 bg-white border-b border-slate-200 z-50">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/quickOpsLogo.png" alt="QuickOps" className="h-10 sm:h-12 md:h-14 object-contain" />
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Entrar no Sistema
            </Link>
            <Link to="/login">
              <Button size="default" className="rounded-md bg-blue-600 text-white hover:bg-blue-700 font-semibold px-6 shadow-sm">
                Teste Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-full mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 border border-blue-200 text-sm font-bold text-blue-700 shadow-sm">
                <CheckCircle2 className="w-4 h-4" /> Field Service Management Definitivo
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-[1.15]">
              O Coração da sua Operação de Campo.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 font-medium leading-relaxed max-w-3xl mx-auto">
              Mais que um criador de OS. O Tech QuickOps orquestra técnicos no mapa, gerencia consumo de estoque, digitaliza laudos (RAT) e dá visão estratégica para o seu negócio escalar sem gargalos.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-lg px-8 h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  Começar 14 Dias Grátis <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-lg px-8 h-14 text-base font-bold border-slate-300 text-slate-700 hover:bg-slate-50">
                  Agendar Demonstração
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* RBAC: Visões Dedicadas */}
      <section className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-slate-900">Cada Perfil, Uma Visão Específica</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              O sistema entende que quem planeja não é quem executa. Oferecemos Controle Total de Acessos (RBAC) com dashboards dedicados para cada papel na empresa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Analista */}
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-6 border border-blue-100">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Torre de Controle (Analista)</h3>
              <p className="text-slate-600 leading-relaxed">
                Visão tática do dia a dia. Acompanhe o Kanban de OS, monitore produtividade da equipe, trate pendências e faça o despacho ágil dos chamados urgentes.
              </p>
            </div>

            {/* Técnico */}
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mb-6 border border-orange-100">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Mobile-First (Técnico)</h3>
              <p className="text-slate-600 leading-relaxed">
                Um aplicativo focado e minimalista. O técnico sabe exatamente para onde ir, reporta status de deslocamento, insere materiais usados e colhe assinaturas sem distrações.
              </p>
            </div>

            {/* Gestor */}
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-6 border border-emerald-100">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Estratégia (Gestor)</h3>
              <p className="text-slate-600 leading-relaxed">
                Dashboard de alto nível gerencial. Monitore a saúde financeira, métricas de fechamento, faturamento por cliente e tenha o controle total da operação.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ciclo de Vida e Estoque */}
      <section className="py-24 bg-white border-b border-slate-200">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            
            {/* Texto */}
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 text-slate-900">
                Ciclo de Vida Completo da OS
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Pare de usar várias ferramentas fragmentadas. O QuickOps une o agendamento, o rastreio, o consumo de peças e o laudo técnico num fluxo único e inviolável.
              </p>
              
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Deslocamento em Tempo Real</h4>
                    <p className="text-slate-600">Gestores visualizam exatamente quando o técnico entra em rota e quando chega no cliente.</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">Estoque Amarrado à OS</h4>
                    <p className="text-slate-600">Peças e equipamentos usados são deduzidos do almoxarifado automaticamente, gerando o custo exato da operação.</p>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    <FileSignature className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">RAT Digital (Sem Papel)</h4>
                    <p className="text-slate-600">Geração de Laudo e coleta da assinatura do cliente direto na tela do smartphone, anexando fotos geolocalizadas.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Mockups/Visuals */}
            <div className="order-1 lg:order-2 space-y-6">
              {/* Mockup OS Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm font-bold text-blue-600">OS-4092</div>
                    <div className="text-lg font-bold text-slate-900">Manutenção Corretiva (Fibra)</div>
                  </div>
                  <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">Em Andamento</div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Técnico:</span>
                    <span className="font-medium text-slate-900">Carlos Silva</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Materiais Adicionados:</span>
                    <span className="font-medium text-slate-900">2x Conector RJ45, 10m Cabo</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">Aguardando Assinatura</span>
                  <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
                    Ver RAT
                  </Button>
                </div>
              </div>

              {/* Security Banner */}
              <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg flex items-center gap-4">
                <Lock className="w-10 h-10 text-blue-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-lg">Rastreabilidade Absoluta</h4>
                  <p className="text-slate-300 text-sm">Log imutável de todas as ações. Saiba exatamente quem criou a OS, quem retirou material e quem encerrou o chamado.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-slate-900">Licenciamento Simples e Transparente</h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              Sem taxas escondidas por módulos. Você assina o sistema inteiro e libera o crescimento da sua empresa.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-8 md:p-10 relative">
              <div className="absolute top-0 inset-x-0 h-2 bg-blue-600 rounded-t-xl" />
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Plano Corporate</h3>
                <p className="text-slate-500 mt-1">O pacote completo de Field Service para a sua operação.</p>
              </div>

              <div className="mb-8 flex items-end gap-1 border-b border-slate-100 pb-8">
                <span className="text-5xl font-black tracking-tight text-slate-900">R$ 299</span>
                <span className="text-slate-500 font-medium mb-1">/mês</span>
              </div>

              <ul className="space-y-4 mb-10">
                {[
                  "Perfis ilimitados (Gestor, Analista, Técnico)",
                  "Ordens de Serviço e Clientes Ilimitados",
                  "Gestão Completa de Estoque e Almoxarifado",
                  "Assinatura Digital de RAT (Laudo Técnico)",
                  "Trilha de Auditoria (Logs Imutáveis)",
                  "Atualizações contínuas de plataforma"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <Link to="/login" className="block w-full">
                <Button size="lg" className="w-full h-14 rounded-md text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  Iniciar 14 Dias Grátis
                </Button>
              </Link>
              <p className="text-center text-sm text-slate-500 mt-4 font-medium">
                Cancele quando quiser.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-slate-200">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/quickOpsLogo.png" alt="QuickOps" className="h-8 object-contain grayscale" />
          </div>
          <div className="text-sm text-slate-500 font-medium text-center md:text-right">
            © {new Date().getFullYear()} Tech QuickOps. Sistema Definitivo de Gestão de Operações em Campo.
          </div>
        </div>
      </footer>
    </div>
  );
}
