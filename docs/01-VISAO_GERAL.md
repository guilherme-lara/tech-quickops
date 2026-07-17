# Visão Geral e Arquitetura

Bem-vindo à documentação do **Tech QuickOps**, um sistema completo e responsivo (SaaS) voltado para o gerenciamento de serviços em campo, ordens de serviço (OS) e relatórios de atendimento técnico (RAT).

## 1. Stack Tecnológica
O Tech QuickOps foi construído utilizando as melhores práticas e bibliotecas modernas para garantir performance, escalabilidade e excelente UI/UX:

- **Frontend:** React 18, Vite, TypeScript.
- **Roteamento:** `@tanstack/react-router` para roteamento tipado via sistema de arquivos.
- **Gerenciamento de Estado:** Zustand para stores globais (`useStore` em `src/lib/useData.tsx`).
- **Estilização e Componentes:** Tailwind CSS, shadcn/ui (Radix UI), Lucide React (Ícones).
- **Gráficos e Mapas:** Recharts, Leaflet / React-Leaflet.
- **Backend / Banco de Dados:** Supabase (PostgreSQL, Auth, Storage).

## 2. Estrutura de Pastas Principal (`src/`)

- `/components`: Componentes reutilizáveis, painéis, modais (ex: `ui/`, `Layout.tsx`, `TecnicoLayout.tsx`).
- `/integrations/supabase`: Configurações de conexão e tipagens auto-geradas do banco de dados (`types.ts`, `client.ts`).
- `/lib`: Utilitários gerais, store de estado (`useData.tsx`), integrações com mapas/geolocalização.
- `/routes`: Componentes de páginas. Devido ao TanStack Router, os nomes dos arquivos definem a rota (ex: `os.tsx` roteia para `/os`, `tecnico.dashboard.tsx` roteia para `/tecnico/dashboard`).

## 3. Papéis de Usuário (Roles)

O sistema possui controle de acesso rigoroso dividido em três perfis:

### 3.1. Gestor (Admin)
- **Acesso:** Painel estratégico completo via desktop e mobile.
- **Permissões:** 
  - Visualizar dashboards financeiros e operacionais.
  - Criar, editar, faturar e excluir Ordens de Serviço.
  - Cadastrar clientes, técnicos e analistas.
  - Definir configurações globais do sistema.

### 3.2. Técnico de Campo
- **Acesso:** Interface **Mobile-first** (otimizada para celular, mas com suporte a expansão desktop em `TecnicoLayout.tsx`).
- **Permissões:**
  - Visualização apenas das suas próprias OS (Atribuídas a ele).
  - Execução de RAT (Relatório de Atendimento Técnico).
  - Realizar Check-in (com geolocalização) e captura de evidências.
  - Coletar assinatura digital do cliente na finalização.
  - Visualizar o histórico das OS que já concluiu.

### 3.3. Analista / Suporte
- **Acesso:** Não possui acesso de login interativo atualmente, mas atua como a ponta de comunicação.
- **Permissões/Funções:**
  - É vinculado a clientes e atribuído a determinadas Ordens de Serviço.
  - Fornece suporte ao técnico via WhatsApp (acionado por botão direto no app do técnico).

---
> [!NOTE]
> A filosofia de design prioriza a "Visão do Técnico" para ser extremamente limpa, rápida e focada nas OS ativas. A "Visão do Gestor" é orientada a dados, faturamento e visão macro da empresa.
