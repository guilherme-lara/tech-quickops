# Spec: criação de OS sem duplicidade

- **Estado:** piloto — comportamento atual documentado; critérios pendentes destacados.
- **Última revisão:** 4 de novembro de 2026.
- **Atores:** gestor, administrador ou outro perfil autorizado a criar Ordem de Serviço.
- **Implementação principal:** `src/routes/os.tsx`, `src/lib/useData.tsx`, `src/lib/single-flight.ts`.
- **Dados:** `ordens_servico.idempotency_key`, migration `supabase/migrations/20261104100000_create_pagamentos_tecnicos.sql`.

## Problema e objetivo

Uma resposta lenta ou interrompida pode levar a pessoa a clicar várias vezes em **Criar OS**. A operação deve dar feedback enquanto está em andamento e uma repetição da mesma tentativa não pode gerar múltiplas Ordens de Serviço.

O bloqueio não deve descartar uma ação intencionalmente diferente feita depois. A proteção contra repetição de uma tentativa e a criação legítima de duas OS distintas são casos diferentes.

## Escopo

Inclui envio do formulário de criação de OS, repetição concorrente do mesmo pedido e recuperação quando o banco confirmou a criação, mas a resposta não chegou ao navegador.

Não define critérios para edições, exclusões, importação em lote ou prevenção de OS semanticamente parecidas criadas como operações novas.

## Requisitos

### OS-01 — Feedback e envio em andamento

Enquanto o envio estiver pendente, a interface deve indicar que está criando e impedir novos envios do mesmo formulário.

**Situação atual:** a rota usa estado `creatingOS`, protege o callback com `withSingleFlight` e apresenta controle de envio pendente.

### OS-02 — Uma tentativa lógica tem uma chave estável

Cada tentativa lógica de criação deve possuir uma chave de idempotência. Repetir a mesma tentativa deve reutilizar a chave; uma nova criação ou uma tentativa com conteúdo alterado deve receber uma chave nova.

**Situação atual:** a rota mantém a chave em uma `useRef` até o sucesso e a tabela tem um índice único parcial. A chave é criada no cliente e enviada junto à OS.

**Pendente:** a chave não é persistida fora da memória da tela e a implementação atual pode reaproveitá-la se o formulário for alterado após uma falha incerta. Definir e implementar a renovação segura da chave quando os dados mudarem e a recuperação após recarregar ou reabrir a tela.

### OS-03 — Repetição da mesma chave não cria outra OS

O banco deve rejeitar uma segunda inserção com a mesma chave. Se a primeira inserção já tiver sido confirmada, a aplicação deve localizar e devolver/reutilizar a OS existente, em vez de tratar o conflito como uma criação nova.

**Situação atual:** índice único parcial e busca por `idempotency_key` quando a inserção retorna conflito de unicidade.

### OS-04 — Efeitos colaterais ocorrem uma vez

Somente a criação efetiva deve disparar efeitos de criação, como log de OS criada, processamento de e-mails e vínculo de equipamentos. Recuperar uma OS existente não deve parecer uma nova criação.

**Situação atual:** o processamento de e-mails da mutação compartilhada é ignorado ao recuperar a OS existente. A rota registra o log após `addOS` resolver; validar que uma repetição recuperada não produz log de criação duplicado nem repete outros efeitos associados.

### OS-05 — Falhas são apresentadas e permitem nova tentativa

Falhas de validação, rede, banco ou permissões devem ser mostradas ao usuário. Uma operação que falhou não pode deixar a trava em memória presa; deve ser possível tentar novamente.

**Situação atual:** `withSingleFlight` limpa a chave após resolução ou rejeição e a rota informa erro via toast. Não há confirmação do comportamento contra falhas reais de rede no Supabase.

### OS-06 — Operações diferentes continuam independentes

Submissões com conteúdo ou intenção diferentes não devem compartilhar uma chave de trava nem ser descartadas como duplicatas.

**Situação atual:** `useData` inclui os dados da OS na chave local quando não há chave de idempotência; a rota usa uma chave compartilhada pela empresa enquanto a criação está pendente. Validar o comportamento ao trocar dados rapidamente ou abrir mais de um formulário/tela.

## Critérios de aceite

1. **Clique repetido durante a espera**
   - Dado um formulário válido e um pedido de criação ainda pendente,
   - quando o usuário clicar novamente em Criar OS,
   - então apenas uma OS é gravada e a interface mantém o estado de espera até a operação terminar.

2. **Resposta interrompida após confirmação do banco**
   - Dado que o banco gravou a OS, mas o navegador não recebeu a resposta,
   - quando a mesma tentativa for reenviada com a mesma chave,
   - então o sistema retorna a OS já gravada e não cria uma segunda OS.

3. **Falha antes da gravação**
   - Dado que a tentativa falhou antes de criar a OS,
   - quando a causa da falha for corrigida e a pessoa tentar novamente,
   - então o envio é aceito e cria uma OS, sem trava residual.

4. **Criação intencional distinta**
   - Dado que a pessoa concluiu uma criação e iniciou outro formulário ou alterou a intenção da criação,
   - quando enviar a nova tentativa,
   - então ela recebe uma nova chave e pode criar uma OS separada.

5. **Efeitos colaterais**
   - Dado que a mesma tentativa foi enviada mais de uma vez,
   - quando a OS existente for recuperada,
   - então não se repetem notificações ou logs que indiquem múltiplas criações.

6. **Persistência da tentativa**
   - Dado que a aplicação foi recarregada após uma resposta incerta,
   - quando o usuário retomar a mesma tentativa,
   - então a aplicação reconhece a chave anterior ou consulta o estado antes de permitir uma nova inserção.
   - **Estado:** pendente; a chave atual vive apenas na memória da tela.

7. **Concorrência entre clientes**
   - Dado que duas abas/dispositivos tentam repetir a mesma intenção,
   - quando ambas enviarem a mesma chave,
   - então o índice único permite somente uma OS.
   - **Limite:** não há, no estado atual, mecanismo para compartilhar automaticamente a chave entre abas/dispositivos.

## Segurança e dados

- A chave é UUID e deve ser única no banco somente quando não for nula; registros antigos sem chave continuam válidos.
- A leitura de recuperação deve continuar submetida às políticas de acesso por empresa já existentes.
- A proteção em memória evita concorrência apenas dentro da instância do app; não substitui a restrição única do banco.
- Não registrar a chave como credencial ou segredo.

## Validação pendente

- Testar no ambiente Supabase: clique repetido, resposta interrompida após commit, erro anterior ao commit e repetição após recarregar.
- Testar dois clientes concorrentes com a mesma chave.
- Confirmar contagem de logs, e-mails e vínculos de equipamentos em recuperação idempotente.
- Definir como invalidar uma chave se o conteúdo da OS mudar depois de uma falha de resultado incerto.
