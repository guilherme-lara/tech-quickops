-- Seed Changelog
INSERT INTO public.changelog (versao, titulo, descricao, features)
VALUES 
('1.2.0', 'Sistema de Notificações e Histórico Total', 'Lançamento do painel de notificações integrado com realtime. Agora todas as alterações na plataforma (inclusive histórico da OS) são logadas e auditadas.', '["Crachá Digital do Técnico com QR Code", "Notificações em Tempo Real", "Modal de Novidades", "Auditoria Total do Banco de Dados"]'::jsonb),
('1.1.0', 'Gestão de Usuários e Equipe', 'Adicionado controle de equipe com definição de permissões (Técnico, Analista, Gestor, Admin).', '["Telas de Permissão", "Níveis de Acesso Dinâmicos"]'::jsonb);
