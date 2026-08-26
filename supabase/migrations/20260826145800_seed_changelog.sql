-- Seed Changelog: Histórico Completo de 20 Atualizações
INSERT INTO public.changelog (versao, titulo, descricao, features)
VALUES 
('0.0.1.20', 'Fila de E-mails e Monitoramento de OS', 'Concluímos o módulo de rastreamento absoluto de Ordens de Serviço, garantindo que nada passe batido.', '["Sistema de Diff Automático JSONB: Registra exatamente o que mudou na OS (De -> Para)", "Fila de e-mails engatilhada automaticamente na Conclusão da OS", "Notificação imediata para Gestores e Analistas a qualquer alteração crítica"]'::jsonb),

('0.0.1.19', 'Auditoria Universal (Logs Administrativos)', 'Adicionamos um sistema de rastreabilidade completa (estilo Zabbix) no banco de dados.', '["Triggers de auditoria anexados em Clientes, Técnicos, Insumos e Equipamentos", "Captura automática de inserção, deleção e edição", "Registro do usuário exato que fez a alteração via sessão do Supabase"]'::jsonb),

('0.0.1.18', 'Modal Interativo de Notificações', 'As notificações agora ganharam vida própria e abrem um modal dedicado com detalhes ricos.', '["Clique na notificação para abrir um modal centralizado", "Botão de redirecionamento dinâmico para a página relacionada", "Layout otimizado para evitar perda do contexto da tela atual"]'::jsonb),

('0.0.1.17', 'Integração Realtime e WebSockets', 'A partir de hoje, a plataforma recebe atualizações instantâneas sem necessidade de recarregar a página.', '["Habilitação da Publication supabase_realtime no Postgres", "Inscrição em Canais Realtime no NotificationBell", "Alerta via Toast animado assim que a notificação é disparada no banco"]'::jsonb),

('0.0.1.16', 'Tabela de Changelog e Modal de Novidades', 'Sistema próprio para engajamento da equipe, informando tudo o que acontece de novo na plataforma.', '["Criação da Tabela Changelog (PostgreSQL)", "Criação do componente ChangelogModal", "Notificação global disparada sempre que uma nova versão é lançada"]'::jsonb),

('0.0.1.15', 'Atualização do Crachá Digital: QR Code e Fullscreen', 'O crachá do técnico ganhou funções de validação em campo e design mais imersivo.', '["Adição da API geradora de QR Code apontando para o sistema", "Modo Tela Cheia (Fullscreen API) no navegador do celular", "Design responsivo em gradiente estilo cartão de visita"]'::jsonb),

('0.0.1.14', 'Crachá Digital do Técnico (v1)', 'Primeira versão da página de identificação do técnico em formato digital.', '["Criação da Rota /tecnico/cracha protegida", "Busca dinâmica de dados adicionais e foto de perfil", "Apresentação dos dados do técnico, RG, CPF e Empresa associada"]'::jsonb),

('0.0.1.13', 'Refatoração UI: Adeus window.confirm', 'Melhoramos drasticamente a experiência do usuário removendo alertas horríveis do navegador.', '["Desenvolvimento do ConfirmDialogProvider global", "Substituição de alertas nativos nas rotas de Clientes, Estoque e Equipe", "Animação suave em modais de deleção e inativação"]'::jsonb),

('0.0.1.12', 'Controle de Permissões e Perfis (Roles)', 'Segurança e direcionamento reforçados com base no cargo do funcionário.', '["Papéis implementados: Superadmin, Admin, Gestor, Analista e Técnico", "Redirecionamento automático após login (GestorDashboard vs TecnicoDashboard)", "Proteção robusta de rotas via Middleware do TanStack Router"]'::jsonb),

('0.0.1.11', 'Dashboard de Produtividade', 'Visão gerencial do desempenho da sua equipe técnica em tempo real.', '["Cálculo automático de chamados fechados por técnico", "Indicadores de tempo médio de atendimento", "Layout com gráficos e métricas destacadas"]'::jsonb),

('0.0.1.10', 'Relatórios Financeiros: Despesas e Lucro', 'As OSs agora calculam automaticamente os custos envolvidos.', '["Campo para cadastro de Despesas de Viagem", "Adição do campo Custo por KM rodado", "Cálculo de margem de lucro subtraindo o custo dos materiais (insumos)"]'::jsonb),

('0.0.1.9', 'Módulo de Estoque (Insumos e Ferramentas)', 'Controle rigoroso do que entra e sai da empresa.', '["Tabela de Itens de Inventário (Insumos, EPIs, Ferramentas)", "Atribuição de insumos em cada Ordem de Serviço", "Baixa automática e cálculo do custo na fatura da OS"]'::jsonb),

('0.0.1.8', 'Gestão de Equipamentos do Cliente', 'Agora os clientes podem ter múltiplos equipamentos cadastrados e mapeados no sistema.', '["Tabela relacional de Equipamentos (Marca, Modelo, Número de Série)", "Associação de Equipamento na abertura de chamado (OS)", "Fotos e anexos atrelados ao equipamento"]'::jsonb),

('0.0.1.7', 'Painel Temático (Dark/Light Mode)', 'Adição da opção de tema visual para os usuários da plataforma.', '["Alternância suave entre temas nativos", "Salvamento do estado em LocalStorage", "Adaptação do Tailwind CSS para todos os componentes (Shadcn UI)"]'::jsonb),

('0.0.1.6', 'Abertura e Edição de Ordens de Serviço', 'Módulo central do aplicativo implementado.', '["CRUD completo de Ordens de Serviço", "Status dinâmico (Pendente, Em Andamento, Concluído, etc)", "Atribuição de OS para Técnicos"]'::jsonb),

('0.0.1.5', 'Módulo de Equipe (Técnicos)', 'Controle dos funcionários, técnicos de campo e senhas.', '["Tabela de Técnicos integrada ao Auth do Supabase", "Criação de botão (Gerar Acesso) para envio de credenciais ao técnico", "Listagem e inativação de usuários da equipe"]'::jsonb),

('0.0.1.4', 'Módulo de Clientes', 'Gestão completa da base de consumidores e faturamento.', '["Formulário de cadastro validando CPF/CNPJ", "Tabela responsiva de Clientes com busca e paginação", "Rastreio de planos de licença e datas de vencimento"]'::jsonb),

('0.0.1.3', 'Componentização com Tailwind e Shadcn', 'Fundação do Design System estabelecida.', '["Instalação do shadcn/ui", "Implementação de botões, modais, inputs e formulários padrão", "Variáveis de cores CSS e sistema de grid Tailwind"]'::jsonb),

('0.0.1.2', 'Integração de Backend via Supabase', 'Conexão do aplicativo web com o banco de dados e autenticação.', '["Configuração do supabase-js client", "Integração do Auth (Login, Sessões seguras)", "Scripts iniciais (Migrations) para tabelas base e RLS policies"]'::jsonb),

('0.0.1.1', 'Nascimento do Projeto (Bootstrap)', 'Estrutura inicial do código criada com ferramentas modernas.', '["Configuração do React com Vite", "Adição do TypeScript para tipagem forte", "Roteamento Client-side com TanStack Router configurado"]'::jsonb);
