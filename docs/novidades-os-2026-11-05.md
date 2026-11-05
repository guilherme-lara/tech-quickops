# Novidades — 5 de novembro de 2026

## Ordens de Serviço mais simples de criar e editar

Organizamos a página de Ordens de Serviço e deixamos os principais fluxos mais claros, sem mudar os dados e regras de negócio da OS.

- **Criação guiada por etapas:** o formulário está organizado em Dados, Financeiro, Detalhes e Extras, com opções para avançar e voltar.
- **Validação dos dados essenciais:** título, cliente e técnico são verificados antes da criação. O botão **Criar OS** fica na etapa Extras.
- **Mais segurança ao navegar:** os dados preenchidos são mantidos ao trocar de etapa. Ao fechar e abrir o formulário novamente, ele retorna à primeira etapa.
- **Edição por ação explícita:** ao visualizar uma OS pela página de OS, use o botão **Editar** para entrar no modo de edição sem fechar o diálogo.
- **Mais consistência:** as opções de status foram centralizadas para manter criação e edição alinhadas.
- **Melhoria de manutenção:** a página foi separada em componentes, hooks e regras específicas, facilitando futuras melhorias.

> A ação **Editar** está disponível na visualização pela página `/os`. O diálogo aberto pelo Dashboard mantém o comportamento próprio dessa tela.
