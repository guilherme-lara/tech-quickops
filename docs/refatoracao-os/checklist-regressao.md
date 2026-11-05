# Checklist de regressão manual — página de OS

Checklist de referência para a refatoração piloto de `src/routes/os.tsx`. Executar os fluxos aplicáveis antes e depois das extrações e comparar os resultados. Usar ambiente e contas de teste; não validar exclusões ou mudanças financeiras com dados de produção.

## Legenda

- **Unitário (regra pura):** pode ser testado isoladamente depois que a regra for extraída sem React nem acesso externo.
- **Manual/integrado:** depende da tela, autenticação, Supabase, efeitos colaterais ou comportamento responsivo; não é coberto suficientemente por um teste unitário da regra.
- **Risco:** impacto provável de uma regressão durante a refatoração, considerando o fluxo e o número de responsabilidades envolvidas.

## Fluxos

### 1. Acesso à rota

- **Trechos:** `Route` e `ProtectedRoute`, aproximadamente linha 95.
- **Verificação:** entrar em `/os` com cada papel permitido — `gestor`, `analista`, `admin` e `superadmin` — e confirmar que a página abre. Repetir com cada papel não permitido e sem sessão; confirmar que o acesso é bloqueado conforme o comportamento atual de `ProtectedRoute`.
- **Cobertura:** manual/integrado. A lista de papéis pode ter teste unitário se for extraída como regra pura, mas isso não substitui verificar a proteção efetiva da rota.
- **Risco:** alto.

### 2. Criação de OS

- **Trechos:** estado e ações de `OSPage` (aproximadamente linhas 117–480); diálogo e abas (aproximadamente linhas 500–1180); `submit`.
- **Verificação:**
  1. Abrir **Nova OS** e tentar enviar sem título, sem cliente e sem técnico, um campo obrigatório por vez; confirmar que a OS não é criada e que aparece a mensagem de validação atual.
  2. Percorrer as abas **Dados**, **Financeiro**, **Detalhes** e **Extras**; preencher dados e confirmar que os valores permanecem ao trocar de aba.
  3. Tentar adicionar despesa de valor zero e negativo; confirmar rejeição. Adicionar uma despesa positiva e confirmar que aparece no resumo.
  4. Informar quilômetros e valor por km; confirmar que o custo de viagem é calculado como hoje. Alterar custo de viagem manualmente e confirmar que o valor digitado é mantido.
  5. Enviar uma OS válida; confirmar sucesso, fechamento do diálogo e limpeza do formulário para uma nova criação.
- **Cobertura:** unitário para validações e cálculo de viagem após extração; manual/integrado para abas, persistência, toasts e gravação.
- **Risco:** alto.

### 3. Limite mensal do plano

- **Trechos:** `submit`, consulta de contagem e uso de `PlanLimits` (aproximadamente linhas 376–400).
- **Verificação:**
  1. Em uma empresa de teste no limite do plano para o mês corrente, tentar criar OS; confirmar bloqueio, mensagem com o limite e ausência de novo registro.
  2. Em empresa abaixo do limite, criar OS válida; confirmar que a criação funciona normalmente.
  3. Confirmar que erro na consulta de contagem mantém o comportamento atual e que o limite é calculado para o mês corrente.
- **Cobertura:** unitário para seleção do limite a partir do plano, se extraída; manual/integrado para consulta e resultado real no banco.
- **Risco:** alto.

### 4. Idempotência

- **Trechos:** `createOSRequestId`, `submit`, chamada a `addOS` e `withSingleFlight` (aproximadamente linhas 172–174 e 376–455); implementação compartilhada em `src/lib/single-flight.ts`.
- **Verificação:**
  1. Com uma criação válida e resposta lenta, clicar repetidamente em **Criar OS**; confirmar que apenas uma OS é persistida e o estado de espera permanece até o fim.
  2. Simular reenvio da mesma tentativa com a mesma chave; confirmar que não aparece uma segunda OS.
  3. Depois de uma tentativa concluída, iniciar uma nova criação válida; confirmar que uma nova OS pode ser criada.
  4. Em caso de falha, corrigir a causa e tentar novamente; confirmar que não há trava residual.
- **Cobertura:** manual/integrado para persistência, concorrência e resposta incerta. Um teste unitário pode cobrir helpers puros de chave ou coordenação, se extraídos, mas não prova unicidade no banco.
- **Risco:** alto.

### 5. Cadastros rápidos na criação

- **Trechos:** `saveQuickCliente`, `saveQuickTecnico`, `saveQuickAnalista` (aproximadamente linhas 240–324) e os respectivos diálogos (aproximadamente linhas 990–1180).
- **Verificação:**
  1. Cadastrar cliente válido pelo diálogo rápido; confirmar retorno ao formulário e seleção do cliente recém-criado.
  2. Tentar cadastrar técnico sem nome, sem e-mail e com e-mail inválido; confirmar as mensagens atuais e ausência de cadastro. Cadastrar com e-mail válido e confirmar retorno e seleção.
  3. Sem cliente selecionado, tentar cadastrar analista; confirmar a mensagem atual. Com cliente selecionado, cadastrar analista e confirmar retorno e seleção.
  4. Fechar/cancelar cada diálogo e confirmar que não houve cadastro nem perda indevida dos demais dados preenchidos na OS.
- **Cobertura:** unitário para validação de e-mail e campos obrigatórios, se extraída; manual/integrado para gravação, diálogos e seleção no formulário.
- **Risco:** médio.

### 6. Edição de OS

- **Trechos:** `EditOSDialog`, inicialização do formulário em `useEffect`, `handleSave` e callback `onSave` da página (aproximadamente linhas 1555–1760); campos e diálogos de edição (aproximadamente linhas 1860–2510).
- **Verificação:**
  1. Abrir uma OS existente, alterar campos e salvar; confirmar persistência e mensagem de sucesso.
  2. Alterar o status; confirmar atualização e registro de atividade com o status correspondente.
  3. Atribuir outro técnico; confirmar persistência e registro de atividade com o técnico selecionado.
  4. Alterar equipamentos; confirmar vínculos persistidos e registro de atividade.
  5. Adicionar um lançamento adicional; salvar e confirmar que permanece associado à OS.
  6. Alternar **Dar baixa/Recebido**, salvar e confirmar o estado persistido.
  7. Abrir em modo de visualização e confirmar que os controles permanecem somente para leitura.
- **Cobertura:** unitário para a construção do patch e regras puras extraídas; manual/integrado para persistência, histórico e autorização.
- **Risco:** alto.

### 7. Finalização de OS

- **Trechos:** `osFinalizada` (aproximadamente linhas 103–105), `handleSave` (aproximadamente linhas 1700–1760), ação **Aprovar e Finalizar** e apresentação de evidências (aproximadamente linhas 2480–2510).
- **Verificação:**
  1. Confirmar a classificação atual de `Concluído`, `Concluído Técnico`, `concluido` e `concluido_tecnico` como finalizados onde a regra é aplicada.
  2. Abrir OS em **Concluído Técnico**, aprovar e finalizar; confirmar atualização para **Concluído**, apresentação do feedback atual de finalização e ocultação/limpeza das pendências conforme comportamento atual.
  3. Salvar status não finalizado; confirmar que não dispara os efeitos exclusivos da conclusão.
- **Cobertura:** unitário para classificação de status; manual para persistência, confetti, áudio, toast e transição completa.
- **Risco:** alto.

### 8. Exclusão de OS

- **Trechos:** `handleDeleteOS` (aproximadamente linhas 353–374), ações da tabela e chamada a `dispararProcessamentoEmails`.
- **Verificação:**
  1. Solicitar exclusão e cancelar a confirmação; confirmar que a OS continua na lista.
  2. Confirmar exclusão; verificar remoção no banco, mensagem de sucesso e atualização da lista.
  3. Confirmar registro de atividade e disparo do processamento de e-mails conforme o fluxo atual.
  4. Repetir o clique enquanto a exclusão está pendente; confirmar que a mesma ação não é duplicada e que o indicador de carregamento é removido ao terminar.
- **Cobertura:** manual/integrado; depende de banco, confirmação, atividade e integração de e-mail.
- **Risco:** alto.

### 9. Lista

- **Trechos:** invalidação ao mudar filtros (aproximadamente linhas 156–167); cabeçalho/filtros/lista/paginação (aproximadamente linhas 1180–1550); handlers de arraste (aproximadamente linhas 325–352).
- **Verificação:**
  1. Filtrar por cliente, técnico e status, individualmente e em conjunto; confirmar que os resultados correspondem aos filtros.
  2. Alterar mês/ano; confirmar que a lista reflete o período selecionado.
  3. Ordenar pela data em ambas as direções e confirmar ordem dos resultados.
  4. Navegar entre páginas e mudar o tamanho da página; confirmar intervalo exibido, total e limites dos botões.
  5. Durante carregamento, confirmar skeleton; com resultado vazio, confirmar estado vazio e ação de criar OS.
  6. Em desktop, confirmar tabela e arraste horizontal. Em viewport mobile, confirmar cartões e abertura da OS ao tocar.
- **Cobertura:** unitário para cálculos puros de paginação/ordenação, se extraídos; manual/integrado para filtros, consultas, estados de carregamento e responsividade.
- **Risco:** alto.

### 10. Abertura por URL com `id`

- **Trechos:** efeito que lê `window.location.search`, consulta a OS e configura `dialogMode` (aproximadamente linhas 176–195).
- **Verificação:** abrir `/os?id=<id-de-uma-os-acessível>`; quando a consulta retorna uma OS, confirmar que ela abre em modo de visualização e que a URL é substituída por `/os`. Repetir com ID inexistente ou erro/ausência de dados; confirmar que não abre uma OS inválida e que, no comportamento atual, o parâmetro permanece na URL.
- **Cobertura:** manual/integrado; requer URL, consulta Supabase e estado do diálogo.
- **Risco:** médio.

### 11. Valores

- **Trechos:** resumo financeiro da criação (aproximadamente linhas 810–885), campos financeiros da edição (aproximadamente linhas 2120–2180 e 2415–2460) e valores por quilômetro no formulário.
- **Verificação:**
  1. Inserir serviço, viagem e mais de uma despesa; confirmar que **Total Faturado = serviço + viagem + despesas**.
  2. Alterar cada componente separadamente e confirmar que o total atualiza corretamente. O cálculo atual não inclui valores adiantados nem lançamentos adicionais no total faturado.
  3. Confirmar formatação em português com duas casas decimais, separador decimal e rótulo `R$`, igual ao comportamento atual.
  4. Comparar o resumo na criação e na edição para os mesmos valores.
- **Cobertura:** unitário para soma e formatação, se extraídas como funções puras; manual para verificar os dois formulários e a integração visual.
- **Risco:** alto.

### 12. Compatibilidade de `EditOSDialog`

- **Trechos:** export de `EditOSDialog` em `os.tsx` (aproximadamente linha 1600), uso na própria rota (aproximadamente linha 1555) e import/uso em `src/routes/dashboard.tsx` (import próximo da linha 10 e uso próximo da linha 1688).
- **Verificação:**
  1. Abrir a edição/visualização a partir de `/os`; confirmar os mesmos dados e ações.
  2. Abrir o diálogo pelo dashboard; confirmar que renderiza e que fechar, visualizar, editar e salvar continuam funcionando com os props existentes.
  3. Rodar lint e build após qualquer mudança de localização/export para detectar importações ou tipos quebrados.
- **Cobertura:** manual/integrado para os dois pontos de entrada; build cobre compatibilidade de importação e tipos, não comportamento de tela.
- **Risco:** alto.

## Fluxos complementares

### 13. Carregamento de analistas por cliente

- **Trechos:** `useAnalistasByCliente` e seu uso nos formulários de criação e edição (aproximadamente linhas 66–92 e 1845–1847).
- **Verificação:** selecionar cliente; confirmar carregamento dos analistas em ordem de nome. Trocar de cliente rapidamente e confirmar que a lista exibida corresponde ao cliente selecionado. Limpar cliente e confirmar que a lista fica vazia.
- **Cobertura:** manual/integrado; consulta e cancelamento dependem do Supabase e do ciclo de vida React.
- **Risco:** médio.

### 14. Histórico e evidências

- **Trechos:** `OSHistorico` e `RatGallery` na lista e no diálogo de edição (aproximadamente linhas 1400–1410 e 2470–2510).
- **Verificação:** abrir histórico da OS e revisar evidências quando disponível; confirmar que cada bloco usa o `osId` correto e que as ações do diálogo não afetam outra OS.
- **Cobertura:** manual/integrado.
- **Risco:** médio.

### 15. Efeitos de auditoria e notificações em edição

- **Trechos:** callback `onSave` passado para `EditOSDialog`, `registrarLog` e `dispararProcessamentoEmails` (aproximadamente linhas 150–154, 1555–1595 e 365–366).
- **Verificação:** salvar sem mudança de status, técnico ou equipamentos; confirmar que não registra atividades dessas mudanças. Alterar cada um separadamente; confirmar apenas os registros correspondentes e ausência de duplicidade. Confirmar o disparo de e-mail somente nos fluxos atuais que o solicitam.
- **Cobertura:** manual/integrado; depende dos efeitos externos e do serviço de log.
- **Risco:** alto.

### 16. Navegação por etapas na criação

- **Trechos:** estado `activeStep`, abas Dados/Financeiro/Detalhes/Extras, validação de `goToNextStep` e botão `submit` em `src/routes/os/OSCreationDialog.tsx`.
- **Verificação:**
  1. Na etapa Dados, tentar avançar sem título, cliente e técnico (um campo por vez); confirmar a mensagem atual e que não avança. Confirmar que endereço não é validado como obrigatório.
  2. Preencher os campos obrigatórios e avançar; voltar e avançar entre as etapas, confirmando que os valores permanecem.
  3. Selecionar diretamente as abas Financeiro, Detalhes e Extras; confirmar que a validação do botão Próximo passo pode ser contornada, mas que o submit continua validando título, cliente e técnico.
  4. Fechar no meio e reabrir; confirmar que volta à etapa Dados e que os valores já preenchidos continuam no formulário.
  5. Pressionar Enter em cada etapa e confirmar que não cria uma OS antes do botão Criar OS em Extras. Verificar também que o botão final não submete mais de uma vez durante carregamento.
  6. Após sucesso, confirmar fechamento, limpeza do formulário e possibilidade de uma nova criação. Simular erro; confirmar que o diálogo e os dados permanecem para nova tentativa e que a chave de idempotência não é renovada antes do sucesso.
- **Cobertura:** manual/integrado; inclui estado do diálogo, navegação por teclado, validação, criação e idempotência.
- **Risco:** alto.

### 17. Ação explícita Editar na visualização de OS

- **Trechos:** prop opcional `onEdit` e botão Editar no modo `view` de `src/routes/os/EditOSDialog.tsx`; uso na rota `/os`.
- **Verificação:**
  1. Abrir uma OS pela rota `/os` em modo de visualização; confirmar que o botão Editar aparece.
  2. Clicar em Editar; confirmar que o mesmo diálogo muda para edição sem fechar e sem perder os dados carregados.
  3. Salvar e confirmar persistência e retorno ao modo de visualização conforme o fluxo atual.
  4. Abrir o diálogo em modo de visualização sem fornecer `onEdit`; confirmar que o botão não aparece e que a visualização continua funcionando.
- **Cobertura:** manual/integrado; o build verifica a compatibilidade de tipos, mas não a transição visual.
- **Risco:** médio.

### 18. Diálogo de OS no Dashboard em modo de visualização

- **Trechos:** estado `dialogMode`, abertura do diálogo e uso de `EditOSDialog` em `src/routes/dashboard.tsx`.
- **Verificação:**
  1. Abrir uma OS pelo Dashboard no caminho que configura `dialogMode` como `view`; confirmar que os dados aparecem em modo somente leitura.
  2. Confirmar que o Dashboard não fornece `onEdit` e, portanto, não exibe o botão Editar no diálogo.
  3. Comparar com o comportamento do Dashboard no HEAD; confirmar que a visualização, fechamento e demais ações disponíveis permanecem compatíveis.
- **Cobertura:** manual/integrado; requer abrir o diálogo pelo Dashboard e comparar a experiência real.
- **Risco:** médio.

## Registro da execução

Preencher ao validar cada rodada da refatoração:

| Fluxo | Antes | Depois | Observações |
|---|---|---|---|
| 1–15 | Não executado | Não executado | Ambiente/conta de teste: |
| 16 | Não executado | Não executado | Navegação por etapas, teclado, fechar/reabrir, sucesso/erro e idempotência |
| 17 | Não executado | Não executado | Ação Editar na visualização da rota `/os` |
| 18 | Não executado | Não executado | Visualização de OS aberta pelo Dashboard |

## Linha de base (antes da Etapa 3)

Executada em 5 de novembro de 2026, antes de alterar código:

- `npm run lint`: **falhou** — 36.859 erros e 18 avisos. A saída inclui um grande volume de violações `prettier/prettier` de CRLF em arquivos gerados, incluindo `dev-dist/sw.js`; o lint direcionado a `src/routes/os.tsx` e `src/routes/dashboard.tsx` também falhou com 4.558 erros e nenhum aviso. Esses resultados preexistem à refatoração.
- `npm run build`: **passou**. A contagem detalhada da saída foi de 64 ocorrências de aviso: 57 diretivas `"use client"` ignoradas, 1 aviso de chunk acima do limite, 1 de depreciação do Node, 1 de opção Rollup desconhecida (`platform`), 3 ocorrências do aviso de padrão glob sem correspondência e 1 de configuração `main` do Wrangler ignorada. O resumo inicial de 62 contou o aviso de glob como uma ocorrência; para comparar cada build, usar a contagem detalhada de 64. Não foram reportados erros de build.

### Linha de base ESLint sem Prettier

Após a instrução para desativar `prettier/prettier`, a contagem foi registrada antes da segunda extração (a extração inicial de `isOSFinalizada` já havia ocorrido):

- `src/routes/os.tsx`: 31 erros, 0 avisos (`@typescript-eslint/no-explicit-any`).
- `src/routes/dashboard.tsx`: 81 erros, 0 avisos (65 `@typescript-eslint/no-explicit-any`; 16 `react-hooks/rules-of-hooks`).
- `src/routes/os/os.rules.ts`: 0 erros, 0 avisos.
- **Total comparável: 112 erros, 0 avisos.**

O ESLint sem a regra Prettier foi repetido depois de cada extração. A partir da extração do patch de edição, o total ficou em 110 (29 na rota, 81 no dashboard, 0 no arquivo de regras).

### Conferência das afirmações dos fluxos 10 e 11

- **Fluxo 10:** em `src/routes/os.tsx`, o parâmetro é lido na linha 191 e `replaceState` ocorre na linha 203, dentro do ramo `if (data)` (linhas 198–204). Portanto, a URL só é limpa quando uma OS é retornada; ID sem resultado não remove o parâmetro.
- **Fluxo 11:** a criação calcula serviço, viagem e despesas nas linhas 829–835. Na edição, os valores aparecem no campo total nas linhas 2136–2139, no atalho de adiantamento nas linhas 2163–2166 e no resumo nas linhas 2432–2434. As funções puras estão em `src/routes/os/os.rules.ts`, linhas 103–108; os campos de adiantamento e `lancamentos_adicionais` são tratados separadamente (linhas 55 e 58), sem participar do total. A afirmação de que o total faturado não inclui adiantamentos nem lançamentos adicionais está correta.
