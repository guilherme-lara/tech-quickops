import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Shield, LayoutDashboard, Settings, CheckCircle2, Smartphone, Monitor, FileSignature, MapPin, Clock, Users } from "lucide-react";
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
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Texto */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-sm font-bold text-blue-700 mb-6">
                <CheckCircle2 className="w-4 h-4" /> Plataforma Completa de Field Service
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-[1.15]">
                Retome o Controle Total da sua Operação em Campo.
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-8 font-medium leading-relaxed">
                Acabe com a papelada e os atrasos. Do agendamento da OS até a assinatura do cliente, ganhe visibilidade em tempo real e acelere seu faturamento.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-lg px-8 h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    Começar 14 Dias Grátis <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-lg px-8 h-14 text-base font-bold border-slate-300 text-slate-700 hover:bg-slate-50">
                    Falar com Consultor
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-slate-500 mt-4 font-medium">Sem necessidade de cartão de crédito para iniciar.</p>
            </div>

            {/* Mockup UI CSS (Kanban Simplificado) */}
            <div className="relative hidden lg:block bg-slate-100 rounded-xl border border-slate-200 shadow-xl overflow-hidden p-6">
              <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-6 h-6 text-slate-700" />
                  <span className="font-bold text-lg text-slate-800">Painel de Despacho</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {/* Coluna 1 */}
                <div className="bg-slate-200/50 rounded-lg p-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pendentes</div>
                  <div className="bg-white p-3 rounded-md shadow-sm border border-slate-200 mb-2">
                    <div className="text-xs font-bold text-blue-600 mb-1">OS-2026</div>
                    <div className="text-sm font-semibold text-slate-800 mb-2">Instalação de Fibra</div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Cliente A</span>
                      <Users className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-md shadow-sm border border-slate-200">
                    <div className="text-xs font-bold text-blue-600 mb-1">OS-2027</div>
                    <div className="text-sm font-semibold text-slate-800 mb-2">Manutenção Preventiva</div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Cliente B</span>
                      <Users className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                {/* Coluna 2 */}
                <div className="bg-slate-200/50 rounded-lg p-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Em Deslocamento</div>
                  <div className="bg-white p-3 rounded-md shadow-sm border border-blue-200 border-l-4 border-l-orange-500 relative">
                    <div className="text-xs font-bold text-blue-600 mb-1">OS-2025</div>
                    <div className="text-sm font-semibold text-slate-800 mb-2">Reparo de Equipamento</div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-500" /> Em Trânsito</span>
                    </div>
                  </div>
                </div>

                {/* Coluna 3 */}
                <div className="bg-slate-200/50 rounded-lg p-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Em Andamento</div>
                  <div className="bg-white p-3 rounded-md shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
                    <div className="text-xs font-bold text-blue-600 mb-1">OS-2024</div>
                    <div className="text-sm font-semibold text-slate-800 mb-2">Auditoria Técnica</div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500" /> Executando</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlight Feature: Deslocamento e Atribuição */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 flex justify-center">
              {/* Mockup Celular e Mapa */}
              <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-4">
                <div className="bg-slate-100 h-48 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden border border-slate-200">
                   {/* Simulação de mapa simplificada */}
                   <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                   <div className="relative flex flex-col items-center">
                      <MapPin className="w-10 h-10 text-blue-600 drop-shadow-md" />
                      <div className="bg-white text-xs font-bold px-2 py-1 rounded shadow-sm border border-slate-200 mt-1">Técnico A Caminho</div>
                   </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-10 bg-blue-100 rounded border border-blue-200 mt-4 flex items-center justify-center text-blue-700 font-bold text-sm">
                     Iniciando Atendimento
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-slate-900">
                Fim do "Aonde o técnico está?"
              </h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Nossa feature exclusiva de **Controle de Deslocamento** permite que os gestores saibam exatamente o momento em que o técnico saiu para o cliente.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700"><strong>Status Dinâmico:</strong> Acompanhe a mudança de status para "Em Deslocamento" em tempo real no Kanban.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700"><strong>Atribuição Inteligente:</strong> Despache ordens de serviço instantaneamente para a equipe logada no app móvel.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="text-slate-700"><strong>Transparência Operacional:</strong> Evite ligações desnecessárias e preveja com precisão a chegada do técnico.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona (Mini-Onboarding B2B) */}
      <section className="py-20 bg-white border-y border-slate-200">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-slate-900">Operação fluida em 3 etapas</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Sistematize processos e garanta que nenhuma informação se perca entre o escritório e o campo.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Passo 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 hover:border-slate-300 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center mb-6">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">1. Despacho (Gestor)</h3>
              <p className="text-slate-600 leading-relaxed">
                O gestor cria a Ordem de Serviço via painel web, inserindo dados do cliente e escopo, e a atribui diretamente ao calendário do técnico.
              </p>
            </div>

            {/* Passo 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 hover:border-slate-300 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">2. Execução (Técnico)</h3>
              <p className="text-slate-600 leading-relaxed">
                Notificado no celular, o técnico inicia o deslocamento, acessa o local e reporta os materiais utilizados e evidências (fotos) do serviço.
              </p>
            </div>

            {/* Passo 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 hover:border-slate-300 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center mb-6">
                <FileSignature className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">3. RAT Digital (Cliente)</h3>
              <p className="text-slate-600 leading-relaxed">
                Ao finalizar, o Relatório de Atendimento Técnico é gerado. O cliente assina digitalmente na tela do celular e o faturamento é liberado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section B2B */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-slate-900">Plano Único e Transparente</h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              Libere todo o potencial da sua operação sem complicações com licenças modulares.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8 md:p-10 relative">
              <div className="absolute top-0 inset-x-0 h-2 bg-blue-600 rounded-t-xl" />
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Licença Profissional</h3>
                <p className="text-slate-500 mt-1">Ideal para prestadores de serviço e equipes de campo estruturadas.</p>
              </div>

              <div className="mb-8 flex items-end gap-1 border-b border-slate-100 pb-8">
                <span className="text-5xl font-black tracking-tight text-slate-900">R$ 299</span>
                <span className="text-slate-500 font-medium mb-1">/mês</span>
              </div>

              <ul className="space-y-4 mb-10">
                {[
                  "Usuários ilimitados (Técnicos, Analistas e Gestores)",
                  "Ordens de Serviço e Kanban ilimitados",
                  "Assinatura Digital de RATs em Campo",
                  "Controle de Deslocamento e Status",
                  "Armazenamento de Evidências Fotográficas",
                  "Suporte B2B Dedicado"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>

              <Link to="/login" className="block w-full">
                <Button size="lg" className="w-full h-14 rounded-md text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  Iniciar Teste de 14 Dias
                </Button>
              </Link>
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
            © {new Date().getFullYear()} QuickOps Software Corporativo. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
