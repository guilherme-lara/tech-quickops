import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LayoutDashboard, CheckCircle2, Smartphone, Monitor, ShieldCheck, BarChart3, Receipt, FileDown, Lock, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Header Corporativo SaaS */}
      <nav className="fixed top-0 inset-x-0 h-20 bg-white border-b border-slate-200 z-50 shadow-sm">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/quickOpsLogo.png" alt="Tech QuickOps" className="h-10 sm:h-12 md:h-14 object-contain" />
          </div>
          
          <div className="hidden lg:flex items-center gap-8 font-semibold text-sm text-slate-600">
            <a href="#solucoes" className="hover:text-blue-600 transition-colors">Soluções</a>
            <a href="#modulos" className="hover:text-blue-600 transition-colors">Módulos</a>
            <a href="#precos" className="hover:text-blue-600 transition-colors">Planos e Preços</a>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/login" className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Entrar no Sistema
            </Link>
            <Link to="/login">
              <Button size="default" className="rounded-md bg-blue-600 text-white hover:bg-blue-700 font-semibold px-4 sm:px-6 shadow-sm">
                Teste Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section (Foco em Controle e Orquestração) - Com fundo estilizado */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-slate-900 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Texto */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-sm font-bold text-blue-300 mb-6 shadow-sm">
                <ShieldCheck className="w-4 h-4" /> Gestão Operacional e Field Service
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-[1.1]">
                Retome o Controle Total da sua Operação em Campo.
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-10 font-medium leading-relaxed">
                O Tech QuickOps orquestra o ciclo de vida do atendimento: do controle estratégico das ordens de serviço à saúde financeira da sua empresa, tudo em uma única plataforma robusta.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-md px-8 h-14 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm border-0">
                    Começar 14 Dias Grátis <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-md px-8 h-14 text-base font-bold border-slate-700 text-white hover:bg-slate-800 bg-slate-900/50">
                    Falar com um Consultor
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mockup Dashboard Hero */}
            <div className="relative hidden lg:block">
              <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-6 text-white transform rotate-2 hover:rotate-0 transition-transform duration-500">
                 <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
                    <div className="flex gap-2">
                       <div className="w-3 h-3 rounded-full bg-red-400" />
                       <div className="w-3 h-3 rounded-full bg-yellow-400" />
                       <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="text-sm font-bold text-slate-400">Torre de Controle Operacional</div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                       <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">Faturamento Previsto</div>
                       <div className="text-2xl font-black text-emerald-400">R$ 142.500</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                       <div className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">OS Em Andamento</div>
                       <div className="text-2xl font-black text-blue-400">28</div>
                    </div>
                 </div>
                 <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                   <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                      <span className="text-sm font-bold">OS-2491</span>
                      <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">Em Andamento</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">OS-2490</span>
                      <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded">Pendência</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-8 bg-blue-600 text-center">
        <p className="text-sm font-bold text-blue-200 uppercase tracking-widest mb-4">Plataforma desenhada para empresas que buscam alta performance operacional</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 text-white">
           <div className="text-xl font-black font-serif">Provedores de Internet</div>
           <div className="text-xl font-black font-serif">Engenharia e Manutenção</div>
           <div className="text-xl font-black font-serif">Climatização e HVAC</div>
           <div className="text-xl font-black font-serif">Suporte em TI</div>
        </div>
      </section>

      {/* Módulos do Sistema (Grid Robusto) */}
      <section id="modulos" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">Uma Solução de Ponta a Ponta</h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto font-medium">
              Não vendemos um caderninho online. Vendemos um Ecossistema Fechado. Todas as ferramentas que o seu backoffice e a sua equipe de campo precisam para escalar com segurança.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            
            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl shadow-sm hover:shadow-md transition-all">
              <LayoutDashboard className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Dashboards e Visões Estratégicas</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                O sistema entende que quem planeja não é quem executa. Oferecemos uma <strong>Torre de Controle</strong> para o Analista e uma <strong>Visão de Alto Nível Financeira</strong> para o Gestor. Cada um vê exatamente o que precisa.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl shadow-sm hover:shadow-md transition-all">
              <Monitor className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Controle de Ordens de Serviço</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                O coração da operação. Acompanhamento desde a abertura até a finalização da OS. Controle dinâmico de status através de um painel ágil e intuitivo para nunca perder um prazo.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl shadow-sm hover:shadow-md transition-all">
              <Smartphone className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Aplicativo Mobile do Técnico</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Dashboard focado e minimalista para os técnicos saberem exatamente o que devem fazer. Eles recebem os chamados e registram o status direto da rua.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl shadow-sm hover:shadow-md transition-all">
              <Box className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Gestão de Inventário e Peças</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Diferente de sistemas engessados, o QuickOps permite o controle do que é utilizado. As peças inseridas geram o custo de operação de forma clara.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl shadow-sm hover:shadow-md transition-all">
              <Lock className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Acessos e Auditoria Total</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Segurança é inegociável. Contamos com um Controle Total de Acessos (RBAC) e um <strong>Log Imutável</strong> de todas as ações. Saiba sempre quem realizou cada alteração no sistema.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl shadow-sm hover:shadow-md transition-all">
              <Settings className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Gestão de Clientes</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Histórico completo de quais Ordens de Serviço foram realizadas para qual cliente, garantindo um relacionamento transparente e previsibilidade de manutenção.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Deep Dive 1: Visão Financeira */}
      <section id="solucoes" className="py-24 bg-slate-50 border-t border-slate-200 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-blue-100 blur-3xl rounded-full transform -translate-x-10 translate-y-10" />
              <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                   <BarChart3 className="w-6 h-6 text-blue-600" />
                   <h3 className="text-xl font-bold text-slate-900">Saúde Financeira (Visão do Gestor)</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Faturamento Previsto</div>
                      <div className="text-2xl font-black text-slate-900">R$ 84.500</div>
                   </div>
                   <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Receita do Mês</div>
                      <div className="text-2xl font-black text-emerald-700">R$ 52.100</div>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-red-700">Pendência de Pagamentos</span>
                      <span className="font-black text-red-700">R$ 12.400</span>
                   </div>
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-blue-700">Resultado Líquido</span>
                      <span className="font-black text-blue-700">R$ 39.700</span>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-sm font-bold text-slate-600 mb-6 shadow-sm">
                <Receipt className="w-4 h-4 text-blue-600" /> Dashboards Estratégicos
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">
                Enxergue o dinheiro que sua operação gera.
              </h2>
              <p className="text-lg text-slate-600 mb-6 font-medium leading-relaxed">
                Ordens de Serviço não são apenas tarefas, elas são a origem do seu faturamento. Nosso dashboard traduz imediatamente o esforço de campo em números reais.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium">Acompanhe a receita do mês em tempo real.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium">Identifique gargalos e pendências de pagamento antes que virem prejuízo.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium">Tome decisões com base no resultado líquido da operação.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Dive 2: Auditoria e Exportação */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-sm font-bold text-slate-600 mb-6 shadow-sm">
                <Shield className="w-4 h-4 text-blue-600" /> Segurança Institucional
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">
                Rastreabilidade à Prova de Fraudes e Fechamento Rápido
              </h2>
              <p className="text-lg text-slate-600 mb-6 font-medium leading-relaxed">
                Não confie na memória. Tenha tudo registrado. E na hora de faturar, tire o peso do seu time financeiro com relatórios precisos.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium"><strong>Log Imutável:</strong> Auditoria detalhada que diz "Quem alterou o quê e quando".</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium"><strong>Controle de Acesso:</strong> Isolamento total entre Técnico, Analista, Gestor e Admin.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium"><strong>Exportação por Cliente:</strong> Exporte facilmente o faturamento agrupado por cliente para enviar as cobranças de forma ágil.</span>
                </li>
              </ul>
            </div>

            <div className="relative">
              <div className="bg-slate-900 rounded-xl p-8 shadow-2xl border border-slate-800 text-white">
                 <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <FileDown className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-lg font-bold">Exportação de Faturamento</h3>
                 </div>
                 
                 <div className="space-y-3 mb-8">
                    <div className="bg-slate-800 rounded p-3 flex justify-between items-center text-sm border border-slate-700">
                       <span className="font-semibold text-slate-300">Cliente Alpha Telecom</span>
                       <span className="font-bold text-emerald-400">Exportar CSV</span>
                    </div>
                    <div className="bg-slate-800 rounded p-3 flex justify-between items-center text-sm border border-slate-700">
                       <span className="font-semibold text-slate-300">Hospital Central</span>
                       <span className="font-bold text-emerald-400">Exportar CSV</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 mb-4 border-b border-slate-700 pb-4">
                    <ShieldCheck className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-bold">Log de Auditoria</h3>
                 </div>
                 <div className="space-y-3 text-xs text-slate-400 font-mono">
                    <div>[08:14] Técnico João alterou status para "Em Deslocamento"</div>
                    <div>[09:30] Analista Maria atualizou materiais da OS-2490</div>
                    <div>[10:05] Gestor Pedro acessou Dashboard Estratégico</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section Corporativa */}
      <section id="precos" className="py-24 bg-slate-100 border-y border-slate-200">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">Investimento Justo e Sem Surpresas</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto font-medium">
              Esqueça taxas obscuras, cobranças por módulo e setups caríssimos. Oferecemos um modelo simples em que você assina a plataforma inteira.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl border border-slate-300 shadow-xl overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
              <div className="bg-slate-900 p-8 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-blue-600 rounded-full mix-blend-screen filter blur-xl opacity-50" />
                <h3 className="text-2xl font-black mb-2 relative z-10">Licença Profissional</h3>
                <p className="text-slate-400 text-sm font-medium relative z-10">Sua operação inteira centralizada em um só lugar.</p>
                <div className="mt-8 flex items-center justify-center gap-1 relative z-10">
                  <span className="text-5xl font-black tracking-tighter">R$ 299</span>
                  <span className="text-slate-400 font-semibold mb-1">/mês</span>
                </div>
              </div>

              <div className="p-8">
                <p className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">O que está incluído</p>
                <ul className="space-y-4 mb-8">
                  {[
                    "Perfis ilimitados (Gestores, Analistas, Técnicos)",
                    "Acesso completo ao App Mobile",
                    "Ordens de Serviço Ilimitadas",
                    "Gestão de Estoque Amarrada",
                    "Dashboards Financeiros e Estratégicos",
                    "Exportação de Faturamento",
                    "Trilha de Auditoria contra fraudes"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="text-slate-700 font-medium text-sm">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/login" className="block w-full">
                  <Button size="lg" className="w-full h-14 rounded-md text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    Iniciar Teste de 14 Dias Grátis
                  </Button>
                </Link>
                <p className="text-center text-xs text-slate-500 mt-4 font-semibold uppercase tracking-wider">
                  Nenhum Cartão de Crédito Exigido
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer B2B Gigante */}
      <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/quickOpsLogo.png" alt="Tech QuickOps" className="h-10 object-contain brightness-0 invert opacity-90" />
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs mb-6">
                O sistema SaaS definitivo focado em revolucionar como empresas gerenciam equipes de campo, OS e estoque. Conectamos o backoffice à rua com perfeição.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Produto</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li><a href="#modulos" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#modulos" className="hover:text-white transition-colors">Aplicativo Técnico</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Preços</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Soluções</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Para Provedores de Internet</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Para Manutenção e HVAC</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Para TI e Telecom</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Empresa</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato Comercial</a></li>
                <li><Link to="/termos-de-uso" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacidade" className="hover:text-white transition-colors">Privacidade</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm font-medium">
              © {new Date().getFullYear()} Tech QuickOps SaaS. Todos os direitos reservados.
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Orgulhosamente construído para escalar operações pelo Brasil.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
