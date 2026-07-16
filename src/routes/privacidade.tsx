import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacidade")({
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Início
          </Button>
        </Link>
        <h1 className="text-4xl font-black tracking-tight mb-8">Política de Privacidade</h1>
        <div className="prose prose-slate max-w-none bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Coleta de Informações</h2>
          <p className="text-slate-600 mb-6">Coletamos informações que você nos fornece diretamente ao utilizar o sistema, incluindo dados de cadastro de usuários (Gestores, Analistas, Técnicos) e dados operacionais de clientes cadastrados por você na plataforma.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. Uso dos Dados</h2>
          <p className="text-slate-600 mb-6">Os dados coletados são utilizados exclusivamente para o funcionamento do sistema Tech QuickOps, garantindo a gestão de ordens de serviço, rastreabilidade de ações (logs de auditoria) e geração de relatórios.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Proteção de Dados (LGPD)</h2>
          <p className="text-slate-600 mb-6">Estamos comprometidos com a segurança de seus dados. Utilizamos criptografia e arquitetura multi-tenant (banco de dados com Row-Level Security) para garantir que os dados da sua empresa jamais sejam acessados por terceiros.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Compartilhamento de Informações</h2>
          <p className="text-slate-600 mb-6">Não vendemos ou compartilhamos os dados de seus clientes ou sua operação com terceiros. As informações pertencem exclusivamente à empresa contratante da licença.</p>
        </div>
      </div>
    </div>
  );
}
