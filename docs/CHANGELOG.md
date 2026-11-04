# Changelog — Proteção contra ações repetidas e pagamentos de técnicos

## 4 de novembro de 2026

### Proteção contra envios repetidos

- Criado `src/lib/single-flight.ts`: chamadas simultâneas com a mesma chave compartilham a mesma `Promise`; chamadas diferentes continuam independentes. A entrada é removida tanto quando a operação termina com sucesso quanto quando falha, permitindo novas tentativas.
- Aplicada a proteção a operações compartilhadas de clientes, técnicos, itens, equipamentos, ferramentas e ordens de serviço em `src/lib/useData.tsx`. As chaves incluem a entidade e os dados da operação para que um segundo envio igual seja deduplicado sem suprimir um cadastro ou uma edição diferente.
- Adicionadas travas e estados de carregamento aos fluxos de clientes, equipe técnica, estoque, criação e exclusão de OS, importação de OS, anexos RAT, despesas e mudanças de status na tela do técnico.
- Protegidas também a geração de chave de licença e as alterações de plano e status de licença no painel administrativo.

### Idempotência de ordens de serviço

- A migration adiciona `ordens_servico.idempotency_key` e um índice único parcial para essa chave.
- A criação de OS conserva uma chave durante a tentativa de envio. Se o servidor gravar a OS, mas a resposta não chegar e o cliente repetir a solicitação, a aplicação procura e reutiliza a OS original em vez de criar outra.
- A recuperação de uma OS existente não dispara novamente o processamento de e-mails como se fosse uma nova criação.

### Registro de pagamentos de técnicos

- A migration cria `pagamentos_tecnicos` para registrar empresa, técnico, nome no momento do pagamento, mês de referência, tipo (`integral` ou `adiantamento`), valor, chave idempotente, autor e data.
- O acesso à tabela é protegido por RLS: gestores, administradores e superadministradores podem consultar e registrar pagamentos apenas na empresa corrente; o autor do registro precisa corresponder ao usuário autenticado e o técnico informado deve pertencer à mesma empresa.
- O ranking mensal do gestor exibe o total devido, valores pagos e saldo pendente. Permite quitar o saldo ou registrar um adiantamento limitado ao saldo disponível e mostra o histórico mensal.
- O envio do pagamento também usa proteção contra chamadas repetidas e chave idempotente no banco. Após uma resposta interrompida, a aplicação consulta o registro existente antes de atualizar o saldo exibido, evitando contabilizá-lo duas vezes.

### Correção para reaplicar o SQL

- A migration agora usa `CREATE TABLE IF NOT EXISTS` para não falhar se `pagamentos_tecnicos` já tiver sido criada.
- O índice mensal também usa `IF NOT EXISTS`.
- As políticas de consulta e inserção são removidas e recriadas com suas definições atuais, permitindo reaplicar o script e atualizar as regras de RLS sem o erro `42P07` nem erros de política já existente.
- O script continua incluindo a coluna/chave idempotente de OS e seu índice; ambos já eram definidos com `IF NOT EXISTS`.

### Arquivos de implementação

- `src/lib/single-flight.ts`
- `src/lib/useData.tsx`
- `src/routes/os.tsx`
- `src/routes/clientes.tsx`
- `src/routes/equipe.tsx`
- `src/routes/estoque.tsx`
- `src/routes/tecnico.os.$id.tsx`
- `src/routes/gestor-dashboard.tsx`
- `src/routes/admin-sistema.tsx`
- `src/components/ImportarOSDialog.tsx`
- `src/components/RatGallery.tsx`
- `src/hooks/useTecnicos.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/20261104100000_create_pagamentos_tecnicos.sql`

### Validação e pendências

- `npm run build` concluiu com sucesso após as alterações de implementação.
- `git diff --check` concluiu sem erros de whitespace.
- A validação não aplicou o SQL a um banco Supabase real. Execute o conteúdo atualizado de `supabase/migrations/20261104100000_create_pagamentos_tecnicos.sql` no SQL Editor e valide permissões e os fluxos de pagamento no ambiente antes de disponibilizá-los.
- A auditoria cobriu os fluxos de escrita descritos acima, mas não significa que todas as mutações diretas de todo o sistema foram convertidas para a mesma proteção.
