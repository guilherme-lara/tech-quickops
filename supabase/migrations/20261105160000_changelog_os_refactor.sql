INSERT INTO public.changelog (versao, titulo, descricao, features)
SELECT
  '0.0.1.56',
  'Ordens de Serviço mais simples de criar e editar',
  'A página de Ordens de Serviço foi reorganizada por responsabilidade, mantendo seus fluxos existentes e tornando a criação e a edição mais claras.',
  '[
    "A página de OS foi separada em componentes de interface, hooks de dados e ações, e regras puras para facilitar manutenção.",
    "A criação de OS agora conduz o usuário pelas etapas Dados, Financeiro, Detalhes e Extras, com navegação para avançar e voltar.",
    "Os campos obrigatórios são validados antes de avançar da etapa Dados, e o botão Criar OS aparece somente na etapa Extras.",
    "Na visualização de uma OS, há agora uma ação explícita Editar para abrir o formulário de edição sem fechar o diálogo.",
    "Notificações para técnicos agora verificam se o perfil vinculado existe, evitando que um vínculo inválido interrompa a criação da OS.",
    "As listas de status de criação e edição foram centralizadas para permanecerem consistentes."
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM public.changelog
  WHERE versao = '0.0.1.56'
);
