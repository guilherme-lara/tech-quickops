# Tech QuickOps 🚀

> **O Sistema Definitivo para Gestão de Operações de Campo e Ordens de Serviço**

O **Tech QuickOps** é um sistema completo e inteligente de gestão operacional em modelo SaaS (Software as a Service) focado em revolucionar como empresas gerenciam suas equipes técnicas, ordens de serviço, clientes e estoque. 

Desenhado com uma interface premium e pensado para o máximo de usabilidade, o QuickOps conecta a base gerencial (backoffice) com a equipe que está na rua, garantindo fluidez, rastreabilidade e segurança em cada etapa do processo.

---

## 📚 Documentação Oficial

Para entender a fundo como a plataforma foi desenhada, suas regras de negócio e fluxos, consulte nossa documentação completa na pasta **`docs/`**:

- [Visão Geral e Arquitetura](docs/01-VISAO_GERAL.md)
- [Entidades Base (Clientes, Técnicos, Analistas)](docs/02-ENTIDADES_BASE.md)
- [Fluxo de OS e RAT (Visão Mobile)](docs/03-FLUXO_OS_E_RAT.md)
- [Regras de Faturamento e KPIs](docs/04-REGRAS_DE_FATURAMENTO.md)

---

## 🎯 Por que escolher o Tech QuickOps?

Diferente de sistemas engessados, o Tech QuickOps foi construído para ser o coração da sua operação técnica. Ele não apenas registra dados, mas orquestra todo o ciclo de vida do seu atendimento de campo:

- **Controle Total de Acessos (RBAC):** Cada membro da sua equipe vê apenas o que precisa ver, com perfis isolados de Técnico, Analista, Gestor e Admin.
- **Rastreabilidade Absoluta:** Todas as ações, exclusões e acessos deixam um rastro em um sistema de auditoria à prova de fraudes.
- **Ecossistema Fechado (Licenças):** Sistema robusto de bilhetagem e bloqueio inteligente. O sistema se auto-gerencia e bloqueia o acesso após o vencimento da assinatura da empresa.

---

## 🏢 Visão Geral dos Módulos

### 1. 📊 Dashboards e Visões Estratégicas
O sistema entende que quem planeja não é quem executa. Por isso, oferecemos visões separadas e dedicadas:
- **Torre de Controle (Analista):** Visão operacional do dia a dia, monitorando gargalos, produtividade técnica e chamados urgentes.
- **Visão Estratégica (Gestor):** Visão de alto nível financeiro e gerencial, onde o foco está no crescimento e na saúde da empresa, métricas de fechamento e análises macro.
- **Visão do Técnico (Mobile-first):** Dashboard focado e minimalista para os técnicos saberem para onde devem ir, o que devem fazer, e registrarem seus apontamentos com facilidade.

### 2. 📋 Gestão de Ordens de Serviço (OS)
O coração da operação.
- Acompanhamento desde a abertura, agendamento, até a finalização da OS.
- Fluxo dinâmico de status (Em andamento, Pendência, Concluído).
- Registro fotográfico, log de materiais utilizados e assinaturas/avaliações (RAT) totalmente digitais no celular do técnico.

### 3. 👥 Gestão de Equipe e Técnicos
- Mapeamento de técnicos, níveis de permissão e perfis.
- Histórico de serviços de cada técnico para métricas de desempenho.

### 4. 📦 Inventário e Estoque
- Controle rígido de peças e equipamentos.
- Consumo de materiais amarrado a cada Ordem de Serviço, deduzindo do estoque automaticamente e precificando o custo de operação.

### 5. 🤝 Clientes e Unidades
- Gestão centralizada dos seus clientes.
- Histórico completo de quais Ordens de Serviço foram realizadas para qual cliente, garantindo um relacionamento transparente.

### 6. 🔒 Acessos e Auditoria
- Log imutável de todas as ações de impacto (Quem gerou OS? Quem mudou a licença? Quem alterou estoque?).

### 7. ⚙️ Assinatura e Paywall Integrado
Para donos de franquias e franqueadores:
- O painel de Configurações permite que o cliente renove sua própria assinatura de forma rápida, bastando inserir a chave de ativação comprada.
- Bloqueio automático, travando a interface ao expirar o tempo sem comprometer nenhum dado histórico.

---

## 🛡️ Painel Master (Exclusivo do Dono do Software)
Por baixo dos panos, o dono do SaaS (Superadmin) tem uma central de comando invisível aos clientes: o **Painel Master**.
- Listagem global de todas as empresas e inquilinos ativos usando o software.
- Botão "Kill Switch" que ativa ou suspende contas instantaneamente.
- Geração de licenças encriptadas que destravam o sistema por exatos +30 dias usando lógicas de hash proprietárias.

---

## 💻 Diferenciais Técnicos (Para a Área de TI)
O Tech QuickOps é uma aplicação web moderna construída com o estado da arte do desenvolvimento web:
- **Core Engine:** React + TypeScript.
- **Roteamento Inteligente:** TanStack Router com file-based routing e code-splitting nativo para velocidade relâmpago.
- **Estilização e Design System:** Tailwind CSS e componentes da biblioteca premium Shadcn-UI. Garantia de um visual que impressiona.
- **Banco de Dados Seguro:** PostgreSQL rodando no motor do Supabase, protegido com Row-Level Security (RLS) impenetrável por tenant (arquitetura Multi-Tenant). Operações críticas como renovação de licenças rodam direto no servidor via procedures nativas.

---

### Quer levar a sua operação para o próximo nível?
O **Tech QuickOps** não é apenas uma ferramenta, é a base onde sua empresa vai escalar de forma organizada. 🚀
