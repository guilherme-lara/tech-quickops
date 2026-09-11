INSERT INTO public.changelog (versao, titulo, descricao, features)
VALUES (
  '0.0.1.54',
  'Melhorias na Ordem de Serviço e Histórico',
  'Implementamos novidades na Ordem de Serviço e corrigimos alguns problemas importantes relatados pelos usuários.',
  '[
    "Novo Status da OS: Agora você pode classificar uma OS como ''Aguardando Confirmação''.",
    "Histórico Legível: O histórico de eventos da OS foi reescrito para exibir os dados de forma amigável, traduzindo nomes técnicos, formatando datas e valores em Reais (R$).",
    "Persistência de Abas: Corrigimos o problema onde os dados preenchidos no formulário da OS sumiam ao mudar de aba. Agora suas digitações estão seguras.",
    "Correção no Cadastro: O sistema voltou a criar corretamente o perfil administrativo no ato de cadastro de uma nova empresa."
  ]'::jsonb
);
