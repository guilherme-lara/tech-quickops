# Bugs e inconsistências encontrados na página de OS

Registro de comportamento suspeito identificado durante a refatoração. Os itens abaixo não foram corrigidos; mudanças funcionais precisam de confirmação própria.

## OS-REF-001 — Endereço marcado como obrigatório sem validação

- **Evidência:** o formulário de criação descreve o endereço do serviço como “Obrigatório” (`src/routes/os.tsx`, linha 554), mas `submit` valida somente título, cliente e técnico (linha 393). O formulário de edição também verifica somente esses três campos (linha 1712), embora o rótulo do endereço tenha asterisco (linha 1883).
- **Comportamento observado no código:** criação e edição podem prosseguir sem endereço, apesar da indicação visual de campo obrigatório.
- **Tratamento nesta refatoração:** não alterar validação, texto nem persistência. Confirmar com o responsável pelo produto se o endereço deve ser obrigatório antes de uma correção funcional.

## OS-REF-002 — Salvamento de OS sempre registra alteração de equipamentos

- **Evidência no original (`git show HEAD:src/routes/os.tsx`):** `handleSave` sempre inclui `equipamentosClienteIds: form.equipamentosIds` no patch (linha 1729); o callback considera que houve alteração se `patch.equipamentosClienteIds !== undefined` (linha 1582). Como a propriedade sempre está presente, essa condição é verdadeira em todo salvamento que chega ao callback.
- **Comportamento observado no código:** salvar a OS sem alterar equipamentos também registra `os_equipamentos_alterados`.
- **Equivalência da extração:** o patch continua incluindo `equipamentosClienteIds` (`src/routes/os/os.rules.ts`, linha 57), e `detectOSEditChanges` preserva o mesmo teste de presença (`linha 66`). Não é uma regressão da Etapa 3; o comportamento já existia no HEAD.
- **Outros consumidores/efeitos:** na página, `equipmentChanged` é consumido somente para decidir o log `os_equipamentos_alterados`. Não condiciona e-mail, notificação ou invalidação de cache. Independentemente desse booleano, `updateOS` em `src/lib/useData.tsx` atualiza a coluna de equipamentos e sincroniza as linhas da tabela `equipamentos_clientes` sempre que `patch.equipamentosClienteIds !== undefined` (linhas 1139 e 1167–1180); o `onSuccess` dessa mutação invalida `ordens_servico` e `equipamentos_clientes` e dispara processamento de e-mails em toda atualização (linhas 1186–1189). Não foi encontrado envio de notificação condicionado a `equipmentChanged`.
- **Tratamento nesta refatoração:** não corrigir. Confirmar se o log deve comparar a lista anterior e a nova antes de alterar a regra.

## OS-REF-003 — Auditoria de edição difere entre `/os` e Dashboard

- **Evidência em `src/routes/dashboard.tsx`:** o `onSave` registra somente `os_atualizada` com a descrição "atualizada rapidamente pelo Dashboard", fecha o diálogo e atualiza consultas de pendências e logs.
- **Evidência em `src/routes/os/use-os-edit-save.ts`:** o `onSave` da rota `/os` registra `os_status_alterado`, `os_tecnico_alterado` e `os_equipamentos_alterados` conforme as condições detectadas, sem registrar o evento genérico `os_atualizada`; o hook não faz refetch específico das consultas do Dashboard.
- **Efeitos compartilhados:** ambos chamam `updateOS`, cujo `onSuccess` invalida `ordens_servico` e `equipamentos_clientes` e dispara processamento de e-mails. Portanto, esses efeitos do backend/cache não dependem do callback da tela.
- **Relação com OS-REF-002:** o log indevido `os_equipamentos_alterados` em todo salvamento aplica-se ao `onSave` de `/os`, que usa `detectOSEditChanges`. O `onSave` do Dashboard não chama essa regra e não emite esse log; em vez disso, emite o log genérico `os_atualizada` em qualquer salvamento.
- **Comportamento observado:** a trilha de auditoria depende de onde a OS é editada; alterações no Dashboard não produzem os mesmos eventos granulares de status, técnico ou equipamentos, e a rota `/os` não produz o evento genérico do Dashboard.
- **Tratamento nesta verificação:** não corrigir. Confirmar se a auditoria deve ser uniforme entre as duas telas antes de alterar os eventos ou seus efeitos.
