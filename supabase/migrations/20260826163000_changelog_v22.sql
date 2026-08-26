INSERT INTO public.changelog (versao, titulo, descricao, features)
VALUES (
  'v1.0.22',
  'Deep-link em Notificações, Toasts Configuráveis e Correções do Técnico',
  'Esta atualização traz melhorias importantes na usabilidade das notificações. Agora, os alertas direcionam exatamente para a OS informada, os técnicos recebem avisos consistentes e os pop-ups irritantes podem ser desligados.',
  '[
    "Notificações de Mão Dupla: Técnicos agora são devidamente notificados quando uma OS é atribuída a eles ou quando o Gestor altera o status.",
    "Deep-Linking: Clicar em uma notificação de OS agora abre a Ordem de Serviço específica automaticamente na sua tela.",
    "Controle de Pop-ups (Toasts): Adicionado um novo controle em Configurações > Preferências de Notificação para desativar os balões flutuantes sem perder o histórico do Sino.",
    "Correção de Vínculo: O sistema agora garante que técnicos antigos tenham seu acesso corretamente vinculado para recebimento de notificações."
  ]'::jsonb
);
