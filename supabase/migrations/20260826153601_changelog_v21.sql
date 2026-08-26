-- Novidades v0.0.1.21
INSERT INTO public.changelog (versao, titulo, descricao, features, created_at)
VALUES 
('0.0.1.21', 'Ajustes Finos e Notificações Inquebráveis', 'Lançamos um pacote de correções estruturais para garantir que o sistema de notificações e histórico funcione sem falhas e com precisão cronológica.', 
'["Forçamento e reestruturação da Trigger de alertas (fn_notify_os_changes)", "Otimização do Modal de Notificações com eventos de Dispatch integrados às Novidades", "Correção da ordenação cronológica decrescente no Histórico de Versões", "Atualização global da etiqueta de versão para v0.0.1.21 no painel lateral"]'::jsonb, now());
