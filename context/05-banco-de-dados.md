# Banco de dados

## Plataforma e acesso

- PostgreSQL via Supabase.
- A aplicação usa cliente tipado em `src/integrations/supabase/client.ts`.
- Migrations versionadas estão em `supabase/migrations/`.
- Tipos gerados ficam em `src/integrations/supabase/types.ts`; não editar manualmente sem necessidade e seguir o processo de regeneração usado pelo projeto.

## Entidades observadas

Principais tabelas presentes nos tipos atuais:

- **Tenant e identidade:** `empresas`, `perfis`.
- **Operação:** `clientes`, `analistas_cliente`, `tecnicos`, `ordens_servico`, `os_historico`, `rat_arquivos`.
- **Equipamentos e estoque:** `equipamentos_clientes`, `itens_inventario`, `os_inventario`, `tecnico_ferramentas`.
- **Comunicação e auditoria:** `notificacoes`, `email_queue`, `logs_administrativos`, `changelog`.
- **Financeiro:** `pagamentos_tecnicos`.
- **Leituras agregadas:** views de dashboard, ranking e produtividade.

As colunas e relações completas devem ser consultadas nos tipos gerados e no schema do ambiente alvo. Esta lista é um mapa, não inventário exaustivo.

## Relações e tenant

- Registros operacionais pertencem a uma empresa, diretamente ou por relação com uma entidade tenant-owned.
- Antes de criar relações, definir integridade referencial, comportamento de exclusão e validação de tenant.
- `empresa_id` deve ser protegido por RLS; defaults baseados em `get_current_empresa_id()` ajudam, mas precisam ser acompanhados de policies.
- Pagamentos guardam snapshot de `tecnico_nome` e uma relação opcional com `tecnicos`; a exclusão do técnico deve preservar o histórico segundo a FK definida na migration.

## Migrations

- Migrations SQL são o histórico de mudanças, não necessariamente o estado remoto atual.
- Um `CREATE TABLE IF NOT EXISTS` impede erro se a tabela já existir, mas não adiciona colunas, constraints ou índices ausentes a uma tabela antiga.
- Para corrigir schema existente, criar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, índices e policies idempotentes conforme a mudança necessária; validar dependências e compatibilidade antes de executar.
- Policies com o mesmo nome devem ser explicitamente removidas/recriadas ou alteradas de forma segura para reexecução.
- Nunca substituir uma tabela com dados por uma recriação destrutiva para contornar divergência sem plano de migração e autorização.
- Não marcar uma migration como aplicada sem verificar execução e estado resultante no ambiente pretendido.

## Idempotência e integridade

- `ordens_servico.idempotency_key` tem índice único parcial para permitir registros antigos sem chave e impedir repetição de uma chave preenchida.
- `pagamentos_tecnicos.idempotency_key` é única e obrigatória na migration.
- Restrições de formato, tipo, valor e chaves estrangeiras devem existir no banco quando representarem invariantes de negócio.
- A verificação de saldo de pagamentos precisa ser transacional ou equivalente no servidor; validação React sozinha não previne concorrência.

## Padrão para uma nova tabela

Documentar:

1. Finalidade e dono dos dados.
2. Chave primária, relações, `empresa_id` e política de exclusão.
3. Campos obrigatórios, formatos, valores permitidos e índices.
4. Grants e policies RLS por operação e papel.
5. Migração para bancos já existentes, reexecução e rollback/recuperação.
6. Atualização dos tipos e testes de acesso multiempresa.

## Mapa de fontes

- Schema tipado: `src/integrations/supabase/types.ts`.
- DDL e policies: `supabase/migrations/`.
- Uso e consultas: `src/lib/useData.tsx`, hooks e rotas.
- Estado aplicado: SQL Editor/CLI e catálogo do banco Supabase correspondente.
