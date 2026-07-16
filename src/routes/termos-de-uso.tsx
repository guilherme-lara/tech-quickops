import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/termos-de-uso")({
  component: Termos,
});

function Termos() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-semibold text-slate-600 hover:text-slate-900">Voltar para o Início</span>
          </Link>
          <img src="/quickOpsLogo.png" alt="Tech QuickOps" className="h-10 object-contain" />
        </div>
      </header>

      <main className="container mx-auto px-6 py-20 max-w-4xl">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-4xl font-black mb-2 text-slate-900 tracking-tight">Termos de Uso</h1>
          <p className="text-slate-500 mb-10 font-medium uppercase tracking-wider text-xs">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
          
          <div className="prose prose-slate max-w-none text-base">
            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">1. Aceitação dos Termos</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              Ao acessar e usar a plataforma Tech QuickOps, você concorda em cumprir e ficar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deve usar nosso serviço.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">2. Uso do Serviço</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              A Tech QuickOps fornece um sistema de gestão B2B focado em operações de campo (Field Service), controle de ordens de serviço, técnicos e inventário. Você concorda em usar o serviço apenas para fins legais, corporativos e de acordo com as leis brasileiras vigentes.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">3. Contas de Usuário e Segurança</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              Você é integralmente responsável por manter a confidencialidade de sua conta, credenciais de acesso e das contas criadas para seus funcionários (técnicos, analistas, etc). A Tech QuickOps não será responsável por qualquer perda ou dano decorrente do acesso não autorizado causado pelo compartilhamento de credenciais.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">4. Propriedade Intelectual</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              Todo o código-fonte, design, interface (UI/UX), textos, gráficos, logos e software são de propriedade exclusiva da Tech QuickOps e estão protegidos pelas leis de propriedade intelectual.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">5. Limitação de Responsabilidade</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              A plataforma é fornecida "no estado em que se encontra". A Tech QuickOps se esforça para manter a alta disponibilidade do sistema (uptime), mas não se responsabiliza por lucros cessantes, perdas financeiras ou outros danos indiretos decorrentes de eventuais instabilidades ou incapacidade momentânea de usar o serviço.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800 text-center">
        <p className="text-sm font-medium">
          © {new Date().getFullYear()} Tech QuickOps SaaS. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
