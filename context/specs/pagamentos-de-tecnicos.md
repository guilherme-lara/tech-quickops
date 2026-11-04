# Spec: pagamentos de técnicos

- **Estado:** piloto — fluxo implementado; regras de consistência financeira e validação no banco ainda pendentes.
- **Última revisão:** 4 de novembro de 2026.
- **Atores:** gestor, administrador ou superadministrador da empresa.
- **Implementação principal:** `src/routes/gestor-dashboard.tsx`.
- **Dados e autorização:** tabela `public.pagamentos_tecnicos` definida em `supabase/migrations/20261104100000_create_pagamentos_tecnicos.sql`.
- **Regra financeira relacionada:** [Regras de negócio](../04-regras-de-negocio.md).

## Problema e objetivo

O gestor precisa registrar pagamentos devidos aos técnicos e acompanhar o saldo mensal, inclusive quando paga uma parte antes de quitar o restante. O histórico deve permitir identificar quem recebeu, quanto, quando e a qual mês o lançamento se refere.

## Escopo

Inclui consulta do ranking mensal, registro de pagamento integral ou adiantamento, abatimento do saldo e apresentação do histórico por técnico e mês.

Não inclui folha de pagamento, transferências bancárias, comprovantes, estorno/edição de pagamento nem aprovação por múltiplos usuários.

## Regras de negócio

### PG-01 — Total devido do mês

Para os técnicos que aparecem no ranking, o total devido é calculado a partir das OS concluídas no mês selecionado e dos parâmetros contratuais do técnico:

- comissão fixa ou percentual sobre o valor do serviço;
- lançamentos adicionais associados à OS;
- horas extras calculadas conforme limite e valor por hora do técnico;
- valor fixo mensal;
- bônus por OS acima da meta configurada.

O faturamento gerado no ranking inclui valor do serviço, custo de viagem e despesas. O total devido ao técnico não deve ser confundido com esse faturamento.

**Situação atual:** cálculo realizado no dashboard. O ranking é montado a partir das OS concluídas no mês; técnicos sem OS concluída nesse período podem não aparecer, mesmo que haja valor fixo ou histórico de pagamento.

### PG-02 — Saldo pendente

`saldo pendente = máximo entre zero e (total devido do mês - pagamentos registrados para o técnico e mês)`.

Adiantamentos e pagamentos integrais são ambos abatidos do total devido do mês correspondente. Não há abatimento entre meses.

**Situação atual:** cálculo no dashboard a partir dos pagamentos registrados naquele `mes_referencia`.

### PG-03 — Pagamento integral

Um pagamento integral registra exatamente o saldo pendente mostrado no momento da confirmação. O saldo resultante é zero.

**Situação atual:** o botão envia o saldo calculado pela interface.

### PG-04 — Adiantamento

Um adiantamento deve ser maior que zero e não pode exceder o saldo pendente. Um adiantamento não quita automaticamente o restante; ele continua visível no histórico e o saldo é recalculado.

**Situação atual:** validação feita na interface, usando centavos para comparar valores.

**Pendente:** validar e garantir o limite também no banco/servidor sob concorrência. A validação somente no cliente permite que sessões simultâneas tentem registrar valores cujo total ultrapasse o devido.

### PG-05 — Histórico imutável

Cada pagamento bem-sucedido gera um lançamento com técnico, nome registrado, empresa, mês, tipo, valor, usuário responsável e data/hora. Lançamentos existentes não podem ser alterados ou removidos pelo cliente comum.

**Situação atual:** tabela com `SELECT` e `INSERT` concedidos a `authenticated`, sem políticas de `UPDATE` ou `DELETE`; o banco registra autor pela sessão e data pelo relógio do servidor.

### PG-06 — Empresa e permissões

Somente gestor, admin ou superadmin autenticado da empresa corrente pode consultar e registrar pagamentos dessa empresa. O técnico associado ao lançamento deve pertencer à mesma empresa. `registrado_por` precisa corresponder ao usuário autenticado.

**Situação atual:** essas condições estão nas políticas RLS da migration. Ainda não foram validadas no ambiente Supabase real.

### PG-07 — Reenvio idempotente

Uma repetição da mesma tentativa, após timeout ou resposta incerta, deve resultar em um único pagamento. Uma nova decisão de pagamento, mesmo que tenha o mesmo valor e tipo, precisa receber uma chave nova e deve continuar permitida.

**Situação atual:** há chave única no banco e a UI tenta localizar o pagamento existente depois de conflito. A chave da tentativa fica em memória da tela e é removida após sucesso.

**Pendente:** persistir/recuperar a chave se houver recarga ou fechamento da tela antes da resposta, e distinguir com segurança uma nova decisão de uma repetição.

### PG-08 — Erros e feedback

Enquanto o lançamento estiver pendente, os controles devem mostrar espera e impedir cliques duplicados. Se o banco rejeitar o pagamento, o usuário deve receber uma mensagem e os dados exibidos devem ser atualizados a partir da fonte persistida.

**Situação atual:** o envio é protegido por `withSingleFlight`, há estado de carregamento, mensagens de sucesso/erro e recarga dos dados após a tentativa.

## Critérios de aceite

1. **Pagamento integral**
   - Dado um técnico com saldo pendente positivo no mês selecionado,
   - quando o gestor confirmar o pagamento integral,
   - então é criado um lançamento do tipo `integral` no valor exato do saldo e o saldo exibido passa a zero.

2. **Adiantamento parcial**
   - Dado um técnico com saldo pendente de R$ 500,00,
   - quando o gestor registrar um adiantamento de R$ 125,50,
   - então o histórico mostra R$ 125,50 como adiantamento e o saldo passa a R$ 374,50.

3. **Validação de adiantamento**
   - Dado um saldo de R$ 500,00,
   - quando o gestor informar zero, valor negativo, valor inválido ou R$ 500,01,
   - então nenhum pagamento é registrado e uma mensagem explica a validação.

4. **Sem saldo**
   - Dado que o saldo pendente é zero,
   - quando a tela for exibida,
   - então não é possível registrar outro pagamento para aquele mês e técnico.

5. **Isolamento por mês**
   - Dado que existe um pagamento registrado em um mês,
   - quando outro mês for selecionado,
   - então o pagamento anterior não reduz o saldo do novo mês e não aparece no histórico daquele mês.

6. **Repetição após resposta incerta**
   - Dado que o banco gravou um pagamento, mas a resposta não chegou,
   - quando a mesma tentativa for reenviada com a mesma chave,
   - então existe um único lançamento e o saldo é abatido uma única vez.

7. **Acesso entre empresas**
   - Dado um usuário sem permissão ou pertencente a outra empresa,
   - quando tentar consultar ou registrar um pagamento,
   - então o banco rejeita ou não retorna os registros de outra empresa.

8. **Técnico de outra empresa**
   - Dado um pagamento para a empresa corrente,
   - quando o `tecnico_id` apontar para um técnico pertencente a outra empresa,
   - então o banco rejeita o lançamento.

9. **Concorrência e limite**
   - Dado um saldo pendente de R$ 500,00,
   - quando duas sessões tentarem registrar simultaneamente adiantamentos de R$ 300,00,
   - então o total persistido não excede R$ 500,00.
   - **Estado:** pendente; a validação atual não é transacional nem imposta pelo banco.

10. **Técnico sem OS concluída no mês**
    - Dado um técnico com valor fixo mensal ou pagamento histórico, mas sem OS concluída no mês,
    - quando o ranking mensal carregar,
    - então a regra de inclusão do técnico e a composição do saldo são explícitas e consistentes.
    - **Decisão de produto pendente:** definir se esses técnicos devem aparecer no ranking e receber pagamento do valor fixo.

## Dados e privacidade

A tabela guarda um retrato do nome do técnico no momento do pagamento, além do relacionamento opcional com o registro do técnico. A exclusão de um técnico não deve apagar o histórico financeiro. A empresa e o autor devem ser obtidos/validados no servidor sempre que possível; não confiar em identificadores enviados pelo navegador sem RLS.

Valores são monetários com duas casas decimais. Comparações e validações de entrada devem usar centavos inteiros sempre que forem feitas no cliente; a persistência continua em `NUMERIC(12,2)`.

`CREATE TABLE IF NOT EXISTS` evita erro quando a tabela já existe, mas não atualiza uma tabela criada anteriormente com colunas ou restrições diferentes. Antes de considerar a migration aplicada, confirmar no banco as colunas, constraints, índice e policies definidos nesta spec.

## Validação pendente

- Aplicar a migration no Supabase e confirmar que ela executa tanto em uma base limpa quanto no cenário em que a tabela já existe.
- Validar policies com perfis gestor, admin, superadmin, técnico e usuário de outra empresa.
- Validar pagamentos integral e parcial, nova tentativa após timeout e histórico após recarregar a página.
- Impor limite acumulado de pagamento no servidor/banco de forma segura sob concorrência.
- Decidir a inclusão de técnicos sem OS concluída e como calcular/representar o valor fixo nesses meses.
- Avaliar recuperação idempotente após reload e concorrência entre abas/dispositivos.
