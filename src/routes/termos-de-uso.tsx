import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/termos-de-uso")({
  component: TermosDeUsoPage,
});

function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Início
          </Button>
        </Link>
        <h1 className="text-4xl font-black tracking-tight mb-8">Termos de Uso</h1>
        <div className="prose prose-slate max-w-none bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Aceitação dos Termos</h2>
          <p className="text-slate-600 mb-6">Ao acessar e usar a plataforma Tech QuickOps, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. Uso da Plataforma</h2>
          <p className="text-slate-600 mb-6">A plataforma destina-se ao gerenciamento de operações de campo. É responsabilidade do usuário garantir a veracidade dos dados inseridos, incluindo informações de clientes, ordens de serviço e movimentações de estoque.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Contas e Segurança</h2>
          <p className="text-slate-600 mb-6">Você é responsável por manter a confidencialidade de sua conta e senha. O sistema possui trilha de auditoria (logs) para garantir a rastreabilidade das ações, e qualquer atividade suspeita será registrada.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Planos e Assinaturas</h2>
          <p className="text-slate-600 mb-6">O acesso ao sistema é regido por licenças de uso. O não pagamento ou expiração da licença resultará no bloqueio temporário do acesso, resguardando integralmente os dados até a regularização.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Limitação de Responsabilidade</h2>
          <p className="text-slate-600 mb-6">O Tech QuickOps não se responsabiliza por prejuízos diretos ou indiretos decorrentes do uso inadequado da ferramenta por parte dos usuários cadastrados na empresa assinante.</p>
        </div>
      </div>
    </div>
  );
}
