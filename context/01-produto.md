# Visão do produto

## Propósito

O Tech QuickOps é um sistema multiempresa para organizar serviços em campo: gestão de clientes e técnicos, criação e execução de Ordens de Serviço (OS), Relatório de Atendimento Técnico (RAT), acompanhamento operacional e controles financeiros.

## Usuários e papéis

Os papéis encontrados no produto incluem `gestor`, `admin`, `superadmin`, `analista` e `tecnico`. A permissão efetiva varia por rota e por política do banco; a lista não implica que todos tenham os mesmos acessos.

- **Gestor:** acompanha a operação da empresa, gerencia OS e equipe e consulta indicadores e valores financeiros.
- **Administrador:** executa operações administrativas permitidas pela empresa; determinadas rotas tratam `admin` como gestor.
- **Superadmin:** possui acessos de administração da plataforma definidos no código e no banco.
- **Técnico:** usa principalmente a experiência móvel para consultar OS atribuídas e registrar execução, despesas, arquivos e evidências.
- **Analista:** atua no suporte relacionado a clientes e OS. A disponibilidade de login e permissões deve ser confirmada por rota e banco; documentos antigos divergem quanto a isso.

## Módulos funcionais

- Clientes, contatos/analistas e configurações de cobrança.
- Equipe técnica, perfis, acesso e parâmetros de remuneração.
- Ordens de serviço, equipamentos do cliente, estoque e ferramentas.
- Execução da OS, RAT, anexos, evidências e assinatura.
- Dashboards operacionais e financeiros.
- Notificações, atividade administrativa e changelog.

## Prioridades de experiência

- A tela do técnico deve funcionar bem em celular e manter o foco nas tarefas de campo.
- A visão gerencial deve tornar status, saldos e pendências claros.
- Operações assíncronas devem indicar espera, impedir submissões repetidas equivalentes e reportar falhas.
- Não esconder falhas de persistência com mensagens de sucesso ou estado local que pareça definitivo.

## Referências

- Rotas em `src/routes/`.
- Proteção de rotas em `src/components/ProtectedRoute.tsx`.
- Tipos de papéis e dados no código e nas migrations Supabase.
