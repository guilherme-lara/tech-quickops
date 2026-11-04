# Integrações e serviços externos

## Supabase

- **PostgreSQL:** entidades, views, funções/RPCs, constraints e policies.
- **Auth:** sessão e identidade dos usuários; contexto de papel/empresa é carregado pela aplicação.
- **Storage:** arquivos de RAT, evidências, assinaturas, fotos e assets.
- **Realtime:** usado para atualizações/notificações em determinadas superfícies. Confirmar canais e tabelas específicos antes de depender da entrega em tempo real.

Cliente web em `src/integrations/supabase/client.ts`; código server-side e middleware estão em arquivos separados dentro de `src/integrations/supabase/`. Nunca importar credenciais privadas para componentes do navegador.

## E-mail

Há fila/tabela `email_queue`, endpoint `src/routes/api/process-email-queue.ts` e disparador `src/lib/email-trigger.ts`. O fluxo pode ser assíncrono e depender de variáveis/serviços externos; verificar resposta, autenticação do endpoint e comportamento de retry antes de alterar notificações.

Uma recuperação idempotente de OS não deve disparar de novo e-mails de criação como se fosse uma operação nova.

## WhatsApp

Alguns fluxos de suporte geram links para WhatsApp com mensagem preenchida. A saída ocorre no dispositivo/navegador e não comprova entrega ou leitura da mensagem.

## Arquivos

- Upload e download usam Supabase Storage e tabela de metadados (por exemplo, `rat_arquivos`).
- O fluxo deve considerar falha parcial entre Storage e banco, nomes/path únicos, compressão, permissões e limpeza de objetos.
- URL/path salvo no banco não é automaticamente público; observar políticas e componente de acesso usado.

## Configuração

- Variáveis de ambiente públicas precisam do prefixo/documentação esperado pela ferramenta de build e jamais podem conter secrets privados.
- Faltas de configuração devem falhar com mensagem explícita; não substituir por sucesso simulado.
- Registrar as dependências externas, limites de retry e responsável por manutenção quando uma integração nova for adicionada.
