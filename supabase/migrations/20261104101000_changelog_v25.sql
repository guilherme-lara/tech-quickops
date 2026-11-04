INSERT INTO public.changelog (versao, titulo, descricao, features)
VALUES (
  '0.0.1.55',
  'Mais segurança nas ações e pagamentos dos técnicos',
  'Melhoramos os envios e as atualizações do sistema para evitar ações duplicadas e facilitar o acompanhamento dos pagamentos da equipe.',
  '[
    "Proteção contra cliques repetidos em ações como salvar cadastros, atualizar informações e criar ou excluir Ordens de Serviço.",
    "A criação de uma Ordem de Serviço agora evita gerar uma cópia quando o mesmo envio é repetido por uma falha de conexão.",
    "No ranking mensal, agora é possível registrar o pagamento integral ou um adiantamento ao técnico.",
    "O saldo pendente é atualizado após cada pagamento, e os pagamentos ficam disponíveis no histórico do mês selecionado."
  ]'::jsonb
);
