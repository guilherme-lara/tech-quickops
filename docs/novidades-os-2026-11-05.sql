UPDATE public.changelog
SET
  titulo = 'Ordens de Serviço mais simples de criar e editar',
  descricao = 'A criação e a edição de Ordens de Serviço foram reorganizadas para deixar cada etapa mais clara, facilitar a conferência das informações e reduzir aberturas acidentais do formulário de edição.',
  features = '[
    "O formulário de criação agora está dividido em Dados, Financeiro, Detalhes e Extras. Use Próximo passo e Voltar para percorrer as etapas; os campos preenchidos são mantidos durante a navegação.",
    "Título, cliente e técnico são os campos obrigatórios verificados antes de avançar da etapa Dados e novamente ao criar a OS. O botão Criar OS aparece na etapa Extras.",
    "As informações financeiras ficam agrupadas na etapa Financeiro, enquanto descrição do serviço e dados adicionais podem ser conferidos nas etapas seguintes antes de criar a OS.",
    "Ao fechar e abrir novamente o formulário de criação, ele retorna à etapa Dados e mantém os dados que ainda não foram enviados.",
    "Na página /os, abrir uma OS mostra primeiro os detalhes em modo de visualização. A ação Editar permite mudar para o formulário de edição sem fechar o diálogo.",
    "As opções de status usadas na criação e na edição foram centralizadas para manter os dois formulários consistentes.",
    "A implementação da página foi separada em componentes de interface, hooks para dados e ações, e regras reutilizáveis, facilitando a manutenção e futuras melhorias."
  ]'::jsonb
WHERE versao = '0.0.1.56'
RETURNING id, versao, titulo;
