INSERT INTO public.changelog (versao, titulo, descricao, features)
VALUES (
  'v1.0.23',
  'Envio de E-mails Automático via Resend',
  'Adicionamos a integração direta com o Resend. Agora, o QuickOps envia e-mails automaticamente informando seus clientes quando uma Ordem de Serviço é concluída.',
  '[
    "Integração Resend: Envio de e-mails de forma nativa e automática usando a infraestrutura do banco de dados (pg_net).",
    "Notificação ao Cliente: Assim que a OS é movida para ''Concluído'', se o cliente tiver e-mail, ele é avisado do término do serviço.",
    "Controle Anti-Duplicação: Sistema garante que um e-mail só seja enviado uma única vez mudando o status na fila para ''enviado''."
  ]'::jsonb
);
