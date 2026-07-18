import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  LayoutDashboard,
  CheckCircle2,
  Smartphone,
  Monitor,
  ShieldCheck,
  BarChart3,
  Receipt,
  FileDown,
  Lock,
  Shield,
  Settings,
  Box,
  Calendar,
  Clock,
  Layers,
  DollarSign,
  Activity,
  UserCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-primary/30 selection:text-white overflow-x-hidden">
      {/* Header Corporativo SaaS Glassmorphism */}
      <nav className="fixed top-0 inset-x-0 h-20 bg-slate-950/70 backdrop-blur-md border-b border-white/10 z-50 transition-all duration-300">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/quickOpsLogo.png" alt="QuickOps" className="h-10 sm:h-12 md:h-14 object-contain brightness-0 invert opacity-95" />
          </div>
          
          <div className="hidden lg:flex items-center gap-8 font-semibold text-sm text-slate-300">
            <a href="#solucoes" className="hover:text-primary transition-colors">Soluções</a>
            <a href="#fluxo" className="hover:text-primary transition-colors">Ciclo de Cobrança</a>
            <a href="#modulos" className="hover:text-primary transition-colors">Módulos</a>
            <a href="#precos" className="hover:text-primary transition-colors">Planos</a>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/login" className="hidden sm:block text-sm font-semibold text-slate-300 hover:text-primary transition-colors">
              Entrar no Sistema
            </Link>
            <Link to="/login">
              <Button size="default" className="rounded-xl bg-primary text-white hover:bg-primary/90 font-semibold px-4 sm:px-6 shadow-[0_0_20px_rgba(111,0,255,0.3)] transition-all hover:scale-[1.03]">
                Teste Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section (Foco em Controle e Orquestração) - Com fundo com malha e brilhos */}
      <section className="relative pt-36 pb-24 md:pt-48 md:pb-36 overflow-hidden">
        {/* Glows de Fundo */}
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-primary/20 rounded-full mix-blend-screen filter blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute top-[30%] left-0 -ml-40 w-[500px] h-[500px] bg-violet/10 rounded-full mix-blend-screen filter blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(var(--color-primary) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Texto */}
            <div className="lg:col-span-6 text-left max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-6 shadow-sm">
                <Zap className="w-3.5 h-3.5" /> Nova Versão 2.4 - Gestão Operacional & Financeira
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6.5xl font-extrabold tracking-tight text-white mb-6 leading-[1.05]">
                Orquestre seu Field Service e Faturamento num só lugar.
              </h1>
              <p className="text-base md:text-lg text-slate-300 mb-10 leading-relaxed font-normal">
                Conecte a equipe de rua ao backoffice de forma impecável. Controle ordens de serviço, audite logs de segurança e controle o status de pagamento mensal dos clientes com a regra automática de vencimento de ciclo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-xl px-8 h-14 text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-[0_4px_30px_rgba(111,0,255,0.4)] transition-all hover:scale-[1.02]">
                    Iniciar 14 Dias Grátis <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-xl px-8 h-14 text-base font-bold border-white/10 text-white hover:bg-white/5 bg-transparent transition-all">
                    Falar com um Consultor
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mockup Dashboard Hero */}
            <div className="lg:col-span-6 relative hidden lg:block">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full transform scale-75 -translate-y-5" />
              <div className="relative bg-slate-950/80 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 text-white transition-all duration-300 hover:border-primary/30">
                 <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <div className="flex gap-1.5">
                       <div className="w-3 h-3 rounded-full bg-red-500/80" />
                       <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                       <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 font-mono">
                      <Activity className="w-3 h-3 text-primary animate-pulse" /> Torre de Controle Operacional
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3.5">
                       <div className="text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Faturamento Previsto</div>
                       <div className="text-lg font-black text-white">R$ 142.500</div>
                       <span className="text-[8px] text-muted-foreground">Ref. Mês Anterior</span>
                    </div>
                    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3.5">
                       <div className="text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Receita Recebida</div>
                       <div className="text-lg font-black text-emerald-400">R$ 96.800</div>
                       <span className="text-[8px] text-emerald-500/70 font-semibold">Conciliado</span>
                    </div>
                    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3.5">
                       <div className="text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Em Atraso</div>
                       <div className="text-lg font-black text-red-400">R$ 12.400</div>
                       <span className="text-[8px] text-red-500/70 font-semibold">2 Clientes</span>
                    </div>
                 </div>

                 <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-3">
                   <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="font-bold flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-primary" /> OS-2491 · Solução Telecom</span>
                      <span className="bg-primary/20 text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full border border-primary/20">Em Campo</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="font-bold flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-emerald-400" /> OS-2490 · Hospital Central</span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">Concluído</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-10 bg-slate-950 border-y border-white/5 text-center relative z-10">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-6">Projetado especificamente para alta performance B2B e field service</p>
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 text-slate-300">
             <div className="text-base sm:text-lg font-black tracking-wider uppercase">📡 Provedores de Internet</div>
             <div className="text-base sm:text-lg font-black tracking-wider uppercase">⚙️ Manutenção Industrial</div>
             <div className="text-base sm:text-lg font-black tracking-wider uppercase">❄️ Climatização & HVAC</div>
             <div className="text-base sm:text-lg font-black tracking-wider uppercase">💻 Suporte de TI</div>
          </div>
        </div>
      </section>

      {/* Como funciona o ciclo de faturamento visual */}
      <section id="fluxo" className="py-24 bg-slate-900 relative">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-4">
              <Calendar className="w-3.5 h-3.5" /> Fluxo de Caixa Recorrente
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">O Fluxo Inteligente Mês N ➔ Mês N+1</h2>
            <p className="text-slate-300 text-sm md:text-base font-normal leading-relaxed">
              Diga adeus a planilhas soltas e esquecimento de cobranças. O QuickOps amarra o ciclo financeiro às ordens de serviço executadas, garantindo previsibilidade total.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-6 relative flex flex-col items-start transition-all hover:border-primary/20 group">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="absolute top-6 right-6 text-3xl font-black text-white/5 font-mono">01</div>
              <h3 className="text-lg font-bold mb-3 text-white">Execução (Mês N)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seus técnicos concluem as OSs em campo pelo aplicativo móvel. Todas as peças utilizadas e custos de viagem são integrados automaticamente ao chamado.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-6 relative flex flex-col items-start transition-all hover:border-primary/20 group">
              <div className="h-12 w-12 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center mb-6 text-violet group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="absolute top-6 right-6 text-3xl font-black text-white/5 font-mono">02</div>
              <h3 className="text-lg font-bold mb-3 text-white">Vencimento (Mês N+1)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No mês seguinte, as OSs concluídas geram o faturamento previsto do cliente. O vencimento ocorre no dia de pagamento acordado (`dia_pagamento`).
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-6 relative flex flex-col items-start transition-all hover:border-primary/20 group">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="absolute top-6 right-6 text-3xl font-black text-white/5 font-mono">03</div>
              <h3 className="text-lg font-bold mb-3 text-white">Conciliação Rápida</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você acompanha os pagamentos devidos de forma simples no topo do dashboard e faz a baixa do faturamento com um único clique.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Módulos do Sistema (Grid Robusto) */}
      <section id="modulos" className="py-24 bg-slate-950/40 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6">Um Sistema Completo de Ponta a Ponta</h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed font-normal">
              Todas as ferramentas que a sua operação e o seu time financeiro precisam para gerenciar equipes e faturamento de forma profissional, segura e rastreável.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="p-6 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-primary/20 hover:bg-slate-900/30 transition-all duration-300">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Dashboards Inteligentes</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-normal">
                Uma Torre de Controle estratégica para o analista acompanhar o status das OSs e um dashboard financeiro real para o gestor acompanhar faturamento e despesas.
              </p>
            </div>

            <div className="p-6 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-primary/20 hover:bg-slate-900/30 transition-all duration-300">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Monitor className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Painel de Atendimento Ágil</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-normal">
                Abertura, triagem e controle de chamados facilitados. Classificação inteligente por status e prioridades para que nenhum SLA seja estourado.
              </p>
            </div>

            <div className="p-6 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-primary/20 hover:bg-slate-900/30 transition-all duration-300">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Aplicativo do Técnico</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-normal">
                Interface simplificada focada em campo. O técnico recebe chamados, inicia rotas, insere fotos de evidências e finaliza assinaturas direto da rua.
              </p>
            </div>

            <div className="p-6 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-primary/20 hover:bg-slate-900/30 transition-all duration-300">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Box className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Gestão de Peças e Custos</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-normal">
                Registre os materiais utilizados em cada atendimento. O sistema vincula automaticamente o valor ao custo líquido final do chamado de forma transparente.
              </p>
            </div>

            <div className="p-6 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-primary/20 hover:bg-slate-900/30 transition-all duration-300">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">RBAC & Logs Imutáveis</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-normal">
                Controle rígido de acessos de acordo com a função do usuário e registro permanente de auditoria imutável que protege a operação contra exclusões e fraudes.
              </p>
            </div>

            <div className="p-6 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-primary/20 hover:bg-slate-900/30 transition-all duration-300">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Gestão de Clientes Completa</h3>
              <p className="text-slate-400 text-xs leading-relaxed font-normal">
                Histórico detalhado das manutenções, base de KM customizada para faturamento de frete e configurações individuais de cobrança.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Dive 1: Visão Financeira com Mockup de Cobranças */}
      <section id="solucoes" className="py-24 bg-slate-900 border-t border-white/5 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-16 items-center max-w-6xl mx-auto">
            
            <div className="lg:col-span-6 order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-primary/15 blur-3xl rounded-full transform -translate-x-10 translate-y-10" />
              <div className="relative bg-slate-950 border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                   <BarChart3 className="w-5 h-5 text-primary" />
                   <h3 className="text-sm font-bold">Resumo Financeiro (Visão do Gestor)</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-5">
                   <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3.5">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Faturamento Previsto</div>
                      <div className="text-lg font-black text-slate-100">R$ 84.500</div>
                      <span className="text-[8px] text-slate-500 font-medium">Ref. Mês Anterior</span>
                   </div>
                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5">
                      <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Receita do Mês</div>
                      <div className="text-lg font-black text-emerald-400">R$ 52.100</div>
                      <span className="text-[8px] text-emerald-500/60 font-medium">Pagos</span>
                   </div>
                </div>

                <div className="space-y-2.5">
                   <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex justify-between items-center text-xs">
                      <span className="font-bold text-red-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Faturamentos em Atraso</span>
                      <span className="font-black text-red-400">R$ 12.400</span>
                   </div>
                   <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex justify-between items-center text-xs">
                      <span className="font-bold text-primary flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Resultado Líquido</span>
                      <span className="font-black text-white">R$ 39.700</span>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-6">
                <Receipt className="w-3.5 h-3.5" /> Faturamento Integrado
              </div>
              <h2 className="text-3xl md:text-4.5xl font-black tracking-tight text-white mb-6">
                Transforme esforço de campo em números reais.
              </h2>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8">
                Não gaste dias no final do mês conciliando OSs e calculando quem deve pagar o quê. O QuickOps faz a contabilização contínua de ganhos, custos de KM de viagem e despesas de equipe na hora.
              </p>
              <ul className="space-y-4 text-sm font-medium">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-300">Conciliação simples com botão rápido de baixa de pagamento.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-300">KPIs de faturamento que respeitam de forma clara o ciclo N ➔ N+1.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-300">Diferenciação nítida entre receita prevista (concluído) e receita em caixa (pago).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Dive 2: Auditoria e Exportação */}
      <section className="py-24 bg-slate-950/40 overflow-hidden relative">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-16 items-center max-w-6xl mx-auto">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-6">
                <Shield className="w-3.5 h-3.5" /> Trilha de Rastreabilidade
              </div>
              <h2 className="text-3xl md:text-4.5xl font-black tracking-tight text-white mb-6">
                Segurança incontestável contra falhas e fraudes.
              </h2>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8">
                Operações de rua são difíceis de controlar. O QuickOps protege sua operação gravando cada alteração de status e materiais de forma imutável, além de isolar dados e funções.
              </p>
              <ul className="space-y-4 text-sm font-medium">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-300"><strong>Histórico de Logs:</strong> Descubra instantaneamente quem abriu, atualizou ou mudou a OS.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-300"><strong>Separação de Funções (RBAC):</strong> Técnicos só visualizam chamados atribuídos a eles.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-slate-300"><strong>Exportação Facilitada:</strong> Baixe planilhas prontas de faturamento para realizar o faturamento dos clientes.</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6 relative">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full transform translate-x-10 -translate-y-10" />
              <div className="relative bg-slate-950 border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
                 <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <FileDown className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold">Relatórios & Fechamentos</h3>
                 </div>
                 
                 <div className="space-y-2 mb-6">
                    <div className="bg-slate-900 border border-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
                       <span className="font-semibold text-slate-300">Cliente Alpha Telecom</span>
                       <span className="font-bold text-emerald-400 flex items-center gap-1.5 hover:underline cursor-pointer"><FileDown className="w-3.5 h-3.5" /> Baixar Faturamento</span>
                    </div>
                    <div className="bg-slate-900 border border-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
                       <span className="font-semibold text-slate-300">Hospital Municipal</span>
                       <span className="font-bold text-emerald-400 flex items-center gap-1.5 hover:underline cursor-pointer"><FileDown className="w-3.5 h-3.5" /> Baixar Faturamento</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-bold">Logs de Auditoria Imutáveis</h3>
                 </div>
                 <div className="space-y-2 text-[10px] text-slate-400 font-mono">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>[08:14] Técnico João: status ➔ "Em Deslocamento"</span>
                      <span className="text-slate-600">IP: 177.102.*.*</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>[09:30] Analista Maria: materiais adicionados OS-2490</span>
                      <span className="text-slate-600">IP: 189.14.*.*</span>
                    </div>
                    <div className="flex justify-between">
                      <span>[10:05] Gestor Pedro: baixou faturamento "Alpha Telecom"</span>
                      <span className="text-slate-600">IP: 201.55.*.*</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section Corporativa */}
      <section id="precos" className="py-24 bg-slate-900 border-y border-white/5 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary mb-6">
              Planos Desenhados para o seu Crescimento
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">O tamanho ideal para a sua operação.</h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed font-normal">
              Comece de graça e escale conforme a demanda. Acesse todos os recursos sem taxas escondidas ou sustos na fatura.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            
            {/* Free */}
            <div className="relative bg-slate-950/80 rounded-3xl border border-white/10 shadow-xl overflow-hidden flex flex-col hover:border-slate-700 transition-colors">
              <div className="p-8 border-b border-white/5 flex-1">
                <h3 className="text-xl font-bold mb-2 text-white">Free</h3>
                <p className="text-slate-400 text-xs mb-6 min-h-[40px]">Para profissionais independentes e técnicos solo.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black tracking-tighter text-white">R$ 0</span>
                  <span className="text-slate-500 font-semibold text-sm">/mês</span>
                </div>
                <ul className="space-y-4 text-sm text-slate-300">
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /> <span className="text-xs">Até 1 Técnico</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /> <span className="text-xs">Até 15 OS/mês</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /> <span className="text-xs">App Mobile</span></li>
                  <li className="flex items-start gap-3 opacity-40"><Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /> <span className="text-xs">Dashboard Operacional</span></li>
                  <li className="flex items-start gap-3 opacity-40"><Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /> <span className="text-xs">Módulo Financeiro</span></li>
                </ul>
              </div>
              <div className="p-6 mt-auto">
                <Link to="/login" className="block w-full">
                  <Button variant="outline" className="w-full rounded-xl h-12 border-white/10 text-white hover:bg-white/5 font-semibold text-sm transition-all">Começar Grátis</Button>
                </Link>
              </div>
            </div>

            {/* Starter */}
            <div className="relative bg-slate-950/80 rounded-3xl border border-white/10 shadow-xl overflow-hidden flex flex-col hover:border-primary/30 transition-colors">
              <div className="p-8 border-b border-white/5 flex-1">
                <h3 className="text-xl font-bold mb-2 text-white">Starter</h3>
                <p className="text-slate-400 text-xs mb-6 min-h-[40px]">Perfeito para pequenas equipes iniciando a digitalização.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black tracking-tighter text-white">R$ 99</span>
                  <span className="text-slate-500 font-semibold text-sm">/mês</span>
                </div>
                <ul className="space-y-4 text-sm text-slate-300">
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="text-xs">Até 3 Técnicos</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="text-xs">Até 50 OS/mês</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="text-xs text-white font-medium">Dashboard Operacional</span></li>
                  <li className="flex items-start gap-3 opacity-40"><Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /> <span className="text-xs">Módulo Financeiro</span></li>
                </ul>
              </div>
              <div className="p-6 mt-auto">
                <Link to="/login" className="block w-full">
                  <Button variant="outline" className="w-full rounded-xl h-12 border-primary/30 text-primary hover:bg-primary/10 font-semibold text-sm transition-all">Testar Starter</Button>
                </Link>
              </div>
            </div>

            {/* Pro */}
            <div className="relative bg-slate-950 rounded-3xl border border-primary/50 shadow-2xl overflow-hidden flex flex-col transform md:-translate-y-2 group">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-violet"></div>
              <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Mais Popular</div>
              <div className="absolute -inset-1.5 bg-gradient-to-r from-primary to-violet rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 -z-10"></div>
              
              <div className="p-8 border-b border-white/5 flex-1 bg-slate-900/40 relative z-10">
                <h3 className="text-xl font-bold mb-2 text-white">Pro</h3>
                <p className="text-slate-400 text-xs mb-6 min-h-[40px]">A solução completa com gestão operacional e financeira.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black tracking-tighter text-white">R$ 199</span>
                  <span className="text-slate-500 font-semibold text-sm">/mês</span>
                </div>
                <ul className="space-y-4 text-sm text-slate-300">
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="text-xs font-medium text-white">Até 10 Técnicos</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="text-xs font-medium text-white">Até 200 OS/mês</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="text-xs font-medium text-white">Dashboard Operacional</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span className="text-xs font-medium text-white">Módulo Financeiro N ➔ N+1</span></li>
                </ul>
              </div>
              <div className="p-6 mt-auto bg-slate-950 relative z-10">
                <Link to="/login" className="block w-full">
                  <Button className="w-full rounded-xl h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-[0_0_15px_rgba(111,0,255,0.4)] transition-all">Assinar Pro</Button>
                </Link>
              </div>
            </div>

            {/* Premium */}
            <div className="relative bg-slate-950/80 rounded-3xl border border-white/10 shadow-xl overflow-hidden flex flex-col hover:border-violet/30 transition-colors">
              <div className="p-8 border-b border-white/5 flex-1">
                <h3 className="text-xl font-bold mb-2 text-white">Enterprise</h3>
                <p className="text-slate-400 text-xs mb-6 min-h-[40px]">Para grandes operações de field service sem limites.</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black tracking-tighter text-white">R$ 299</span>
                  <span className="text-slate-500 font-semibold text-sm">/mês</span>
                </div>
                <ul className="space-y-4 text-sm text-slate-300">
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-violet shrink-0 mt-0.5" /> <span className="text-xs">Técnicos Ilimitados</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-violet shrink-0 mt-0.5" /> <span className="text-xs">OS Ilimitadas</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-violet shrink-0 mt-0.5" /> <span className="text-xs">Todos os Módulos Abertos</span></li>
                  <li className="flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-violet shrink-0 mt-0.5" /> <span className="text-xs">Suporte Prioritário</span></li>
                </ul>
              </div>
              <div className="p-6 mt-auto">
                <Link to="/login" className="block w-full">
                  <Button variant="outline" className="w-full rounded-xl h-12 border-violet/30 text-violet hover:bg-violet/10 font-semibold text-sm transition-all">Falar com Vendas</Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer B2B Gigante */}
      <footer className="bg-slate-950 text-slate-300 py-16 border-t border-white/5 relative z-10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/quickOpsLogo.png" alt="QuickOps" className="h-10 object-contain brightness-0 invert opacity-95" />
              </div>
              <p className="text-slate-400 text-xs md:text-sm leading-relaxed max-w-xs mb-6 font-normal">
                O sistema de gestão operacional definitivo para conectar seu backoffice a equipes de campo. Rastreabilidade, faturamento inteligente e performance garantida.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Produto</h4>
              <ul className="space-y-3 text-xs md:text-sm font-semibold text-slate-400">
                <li><a href="#modulos" className="hover:text-white transition-colors">Funcionalidades</a></li>
                <li><a href="#modulos" className="hover:text-white transition-colors">Aplicativo Técnico</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Preços</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Soluções</h4>
              <ul className="space-y-3 text-xs md:text-sm font-semibold text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Provedores de Internet</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Manutenção e HVAC</a></li>
                <li><a href="#" className="hover:text-white transition-colors">TI e Telecomunicações</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-xs">Empresa</h4>
              <ul className="space-y-3 text-xs md:text-sm font-semibold text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Fale com um Consultor</a></li>
                <li><Link to="/termos-de-uso" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacidade" className="hover:text-white transition-colors">Privacidade</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs md:text-sm font-semibold text-slate-500">
              © {new Date().getFullYear()} QuickOps SaaS. Todos os direitos reservados.
            </div>
            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
              Orgulhosamente construído para simplificar operações no Brasil.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
