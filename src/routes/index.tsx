import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LayoutDashboard, CheckCircle2, Smartphone, Monitor, FileSignature, MapPin, Package, Lock, ShieldCheck, Box, LineChart, Server } from "lucide-react";
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

      {/* Hero Section (Foco em Controle e Orquestração) */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-white border-b border-slate-200 overflow-hidden relative">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Texto */}
            <div className="max-w-2xl z-10 relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-sm font-bold text-blue-700 mb-6 shadow-sm">
                <ShieldCheck className="w-4 h-4" /> Gestão Operacional e Field Service
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-[1.1]">
                Retome o Controle Total da sua Operação em Campo.
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-10 font-medium leading-relaxed">
                Mais que um simples gerador de OS. O Tech QuickOps orquestra o ciclo de vida do atendimento: do agendamento à baixa de estoque, até a assinatura digital do cliente na tela do celular do técnico.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-md px-8 h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    Começar 14 Dias Grátis <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-md px-8 h-14 text-base font-bold border-slate-300 text-slate-700 hover:bg-slate-50">
                    Falar com um Consultor
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-4 text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sem Cartão de Crédito</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Implantação Imediata</div>
              </div>
            </div>

            {/* Mockup B2B Pesado (Dashboard Hero) */}
            <div className="relative hidden lg:block z-10">
              <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full transform translate-x-10 translate-y-10" />
              <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                {/* Header Mockup */}
                <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                  </div>
                  <div className="h-6 bg-slate-100 rounded-md w-64 border border-slate-200 flex items-center px-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                    <div className="w-24 h-2 bg-slate-300 rounded" />
                  </div>
                </div>
                {/* Body Mockup */}
                <div className="p-6 flex gap-6">
                  {/* Sidebar Mockup */}
                  <div className="w-48 space-y-3 shrink-0">
                    <div className="h-8 bg-blue-100/50 text-blue-700 rounded-md px-3 flex items-center text-xs font-bold border border-blue-200">Painel de Gestão</div>
                    <div className="h-8 bg-white rounded-md px-3 flex items-center text-xs font-semibold text-slate-600 border border-slate-200">Ordens de Serviço</div>
                    <div className="h-8 bg-white rounded-md px-3 flex items-center text-xs font-semibold text-slate-600 border border-slate-200">Equipe de Campo</div>
                    <div className="h-8 bg-white rounded-md px-3 flex items-center text-xs font-semibold text-slate-600 border border-slate-200">Estoque de Peças</div>
                  </div>
                  {/* Content Mockup */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-20 bg-white border border-slate-200 rounded-lg p-3">
                         <div className="text-xs text-slate-500 font-bold mb-1">OS Abertas</div>
                         <div className="text-2xl font-black text-slate-800">42</div>
                      </div>
                      <div className="h-20 bg-white border border-blue-200 border-l-4 border-l-blue-600 rounded-lg p-3">
                         <div className="text-xs text-blue-700 font-bold mb-1">Em Deslocamento</div>
                         <div className="text-2xl font-black text-slate-800">15</div>
                      </div>
                      <div className="h-20 bg-white border border-slate-200 rounded-lg p-3">
                         <div className="text-xs text-slate-500 font-bold mb-1">Faturamento (Mês)</div>
                         <div className="text-2xl font-black text-slate-800">R$ 18k</div>
                      </div>
                    </div>
                    {/* List Mockup */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4 h-48">
                      <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
                      <div className="space-y-2">
                        <div className="h-10 bg-slate-50 border border-slate-100 rounded-md" />
                        <div className="h-10 bg-slate-50 border border-slate-100 rounded-md" />
                        <div className="h-10 bg-slate-50 border border-slate-100 rounded-md" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-8 bg-slate-100 border-b border-slate-200 text-center">
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Plataforma desenhada para empresas que buscam alta performance operacional</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale">
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
            
            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl hover:border-blue-300 transition-colors">
              <LayoutDashboard className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Dashboards e Visões Estratégicas</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                O sistema entende que quem planeja não é quem executa. Oferecemos uma <strong>Torre de Controle</strong> para o Analista e uma <strong>Visão de Alto Nível Financeira</strong> para o Gestor. Cada um vê exatamente as métricas que impactam o negócio.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl hover:border-blue-300 transition-colors">
              <Monitor className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Controle de Ordens de Serviço</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                O coração da operação. Acompanhamento desde a abertura, agendamento até a finalização da OS. Controle dinâmico de status através de um painel ágil e intuitivo para nunca perder um prazo.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl hover:border-blue-300 transition-colors">
              <Smartphone className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Aplicativo Mobile do Técnico</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Dashboard focado e minimalista para os técnicos saberem para onde ir. Eles recebem as notificações, registram o status "Em Deslocamento" e colhem a assinatura digital (RAT) sem papelada.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl hover:border-blue-300 transition-colors">
              <Package className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Gestão de Inventário e Peças</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Diferente de sistemas engessados, o QuickOps amarra o <strong>consumo de materiais a cada Ordem de Serviço</strong>. As peças usadas pelo técnico dão baixa no estoque automaticamente, calculando o custo de operação na hora.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl hover:border-blue-300 transition-colors">
              <Lock className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Acessos e Auditoria Total</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Segurança é inegociável. Contamos com Controle Total de Acessos (RBAC) e um <strong>Log Imutável</strong> de todas as ações de impacto. Saiba quem gerou a OS, quem retirou do estoque e quem finalizou o chamado.
              </p>
            </div>

            <div className="p-8 border border-slate-200 bg-slate-50 rounded-xl hover:border-blue-300 transition-colors">
              <Server className="w-8 h-8 text-blue-600 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-3">Paywall Integrado B2B</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Sistema robusto de bilhetagem. O sistema gerencia a si mesmo e bloqueia o acesso após o vencimento da assinatura da empresa, mantendo todos os dados e o histórico em total segurança na nuvem.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Deep Dive 1: O Fim do "Onde o técnico está?" */}
      <section id="solucoes" className="py-24 bg-slate-100 border-y border-slate-200 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-blue-200/50 blur-2xl rounded-full transform -translate-x-10 translate-y-10" />
              <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl p-6">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Kanban ao Vivo</div>
                
                {/* Mock Card */}
                <div className="bg-slate-50 border border-blue-200 border-l-4 border-l-orange-500 rounded-md p-4 mb-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-black text-slate-900">OS-8942 - Link Rompido</div>
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">Em Deslocamento</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium mb-3">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" /> Técnico João Silva - Chegada em 15 min
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div className="bg-orange-500 h-1.5 rounded-full w-3/4"></div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-blue-600 rounded-md p-4 shadow-sm opacity-60">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-black text-slate-900">OS-8943 - Instalação Equipamento</div>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">A caminho da central</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                     Técnico Maria Souza
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-sm font-bold text-slate-600 mb-6 shadow-sm">
                <MapPin className="w-4 h-4 text-blue-600" /> Rastreabilidade da Equipe
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">
                O fim da pergunta: "Aonde o técnico está?"
              </h2>
              <p className="text-lg text-slate-600 mb-6 font-medium leading-relaxed">
                Gestores perdem horas preciosas todos os dias ligando para técnicos para saber o status do atendimento. O Tech QuickOps resolve isso de forma orgânica.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium">O técnico clica no botão "Iniciar Deslocamento" no app.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium">O Kanban do backoffice atualiza instantaneamente para todos da equipe.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium">A Torre de Controle ganha visibilidade completa dos prazos, acabando com a falha de comunicação.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Dive 2: RAT Digital */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-sm font-bold text-slate-600 mb-6 shadow-sm">
                <FileSignature className="w-4 h-4 text-blue-600" /> Sem Papel, Sem Erros
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">
                Laudo Técnico (RAT) com Assinatura na Tela
              </h2>
              <p className="text-lg text-slate-600 mb-6 font-medium leading-relaxed">
                Papel perde-se, rasga e atrasa o faturamento. Transformamos todo o fechamento do serviço em um processo 100% digital e auditável.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium">Técnico anexa fotos antes/depois diretamente da câmera do celular.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium">O consumo de material é deduzido do estoque com um clique.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700 font-medium">O cliente valida o serviço e assina na tela do smartphone, travando o Relatório em PDF.</span>
                </li>
              </ul>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-blue-100/60 blur-3xl rounded-full transform translate-x-10 -translate-y-10" />
              {/* Celular Mockup */}
              <div className="relative max-w-xs mx-auto bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800">
                 <div className="bg-white rounded-[2rem] overflow-hidden h-[500px] flex flex-col">
                    <div className="bg-blue-600 text-white p-4 text-center pb-6">
                      <div className="font-bold text-sm">Resumo da OS-8942</div>
                    </div>
                    <div className="flex-1 p-4 -mt-4 bg-white rounded-t-xl overflow-hidden space-y-4">
                       <div className="h-20 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold">
                          [Galeria de Fotos Anexadas]
                       </div>
                       <div>
                         <div className="text-xs font-bold text-slate-500 mb-2">Peças Utilizadas</div>
                         <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-1">1x Modem Fibra Óptica</div>
                         <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-1 pt-1">20m Cabo de Rede</div>
                       </div>
                       <div className="pt-2">
                         <div className="text-xs font-bold text-slate-500 mb-2">Assinatura do Cliente</div>
                         <div className="h-16 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                            <span className="text-blue-500 italic transform -rotate-6 text-lg font-serif">João Assinatura</span>
                         </div>
                       </div>
                       <Button className="w-full bg-blue-600 hover:bg-blue-700 font-bold rounded-md shadow-sm">Finalizar e Gerar PDF</Button>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section Corporativa */}
      <section id="precos" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">Investimento Justo e Sem Surpresas</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto font-medium">
              Esqueça taxas obscuras, cobranças por módulo e setups caríssimos. Oferecemos um modelo simples em que você só cresce a fatura se o seu negócio crescer.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl border border-slate-300 shadow-2xl overflow-hidden">
              <div className="bg-blue-600 p-8 text-center text-white">
                <h3 className="text-2xl font-black mb-2">Licença Profissional</h3>
                <p className="text-blue-100 text-sm font-medium">Sua operação inteira centralizada em um só lugar.</p>
                <div className="mt-8 flex items-center justify-center gap-1">
                  <span className="text-5xl font-black tracking-tighter">R$ 299</span>
                  <span className="text-blue-200 font-semibold mb-1">/mês</span>
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
                    "Geração de Relatório de Atendimento (RAT)",
                    "Trilha de Auditoria contra fraudes",
                    "Implantação e Onboarding Guiado"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="text-slate-700 font-medium text-sm">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/login" className="block w-full">
                  <Button size="lg" className="w-full h-14 rounded-md text-base font-bold bg-slate-900 hover:bg-black text-white shadow-md">
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
                {/* Fallback caso a logo escura não funcione bem em fundo preto, uso texto */}
                <span className="text-2xl font-black text-white tracking-tight">Tech QuickOps</span>
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs mb-6">
                O sistema SaaS definitivo focado em revolucionar como empresas gerenciam equipes de campo, OS e estoque. Conectamos o backoffice à rua com perfeição.
              </p>
              <div className="flex gap-4">
                {/* Redes Sociais placeholders */}
                <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-blue-600 cursor-pointer transition-colors" />
                <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-blue-600 cursor-pointer transition-colors" />
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Produto</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Aplicativo Técnico</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Atualizações</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Soluções</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Para Provedores de Internet</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Para Manutenção e HVAC</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Para TI e Telecom</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Para Energia Solar</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Empresa</h4>
              <ul className="space-y-3 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato Comercial</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
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
