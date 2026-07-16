import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  component: Privacidade,
});

function Privacidade() {
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
          <h1 className="text-4xl font-black mb-2 text-slate-900 tracking-tight">Política de Privacidade (LGPD)</h1>
          <p className="text-slate-500 mb-10 font-medium uppercase tracking-wider text-xs">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
          
          <div className="prose prose-slate max-w-none text-base">
            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">1. Coleta de Dados</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD), a Tech QuickOps coleta dados pessoais essenciais para a prestação do serviço, como nome, e-mail e telefone. Também processamos dados operacionais de técnicos e clientes em nome da sua empresa (Controlador).
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">2. Uso dos Dados</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              Os dados coletados são utilizados exclusivamente para autenticação, gestão de ordens de serviço, comunicação de plataforma e emissão de relatórios operacionais.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">3. Compartilhamento</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              Não vendemos nem compartilhamos seus dados ou os dados dos seus clientes com terceiros para fins de marketing. O compartilhamento ocorre apenas com serviços de infraestrutura em nuvem necessários para manter a plataforma online.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">4. Segurança</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              Empregamos medidas técnicas e organizacionais rigorosas, como criptografia e controle de acesso baseado em funções, para proteger seus dados contra acessos não autorizados.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">5. Seus Direitos</h2>
            <p className="text-slate-600 leading-relaxed mb-6 font-medium">
              Você tem o direito de solicitar o acesso, correção, anonimização ou exclusão dos seus dados pessoais armazenados em nossa plataforma, entrando em contato com nosso suporte técnico.
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
