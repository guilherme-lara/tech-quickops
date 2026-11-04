# Regras de negócio

Este arquivo consolida regras conhecidas. Onde a documentação antiga não coincide necessariamente com o comportamento atual, isso está sinalizado como ponto de confirmação.

## Ordem de Serviço

- A OS associa uma empresa a cliente, técnico e, opcionalmente, analista, endereço, agenda, equipamentos e dados adicionais.
- A conclusão do técnico (`concluido_tecnico`) e a conclusão gerencial (`concluido`) representam momentos diferentes no fluxo documentado.
- Dashboards gerenciais calculam indicadores com base em OS concluídas. Confirmar filtros e datas na rota antes de reutilizar um cálculo.
- Despesas, viagem e valores de serviço são componentes distintos e não devem ser somados à comissão sem uma regra explícita.

## Ciclo de cobrança de clientes

Regras documentadas em `docs/04-REGRAS_DE_FATURAMENTO.md`:

- O ciclo padrão considera OS concluídas em um mês e cobrança no ciclo seguinte, conforme a configuração de pagamento do cliente.
- `dias_pagamento` pode conter mais de um dia de vencimento; o cálculo exato de vencimento precisa ser conferido no código que constrói as faturas.
- `ultimo_mes_pago` representa um mês de cobrança no formato `YYYY-MM`.
- Pagamento imediato pode ser indicado por `dados_adicionais.pago_imediatamente` e classificado como recebido no mês da execução.

**Atenção:** o documento legado descreve cálculos em termos gerais e pode não refletir todas as alterações atuais. Antes de mudar faturamento, conferir `src/routes/dashboard.tsx`, `src/routes/gestor-dashboard.tsx` e os campos da tabela cliente/OS.

## Remuneração e pagamentos de técnicos

- O ranking considera comissão fixa ou percentual, lançamentos adicionais, hora extra, valor fixo mensal e bônus por meta, conforme implementação do dashboard.
- Comissão percentual é calculada sobre o valor do serviço, separada de custos de viagem/despesas no cálculo documentado.
- Pagamentos registrados para um técnico e mês reduzem o saldo daquele mês; o saldo exibido não deve ficar abaixo de zero.
- Tipos registrados: pagamento `integral` e `adiantamento`.
- Adiantamento deve ser positivo e não exceder saldo. Atualmente há validação na UI; o limite acumulado precisa ser garantido no servidor/banco para suportar concorrência.
- A regra de inclusão no ranking de técnicos sem OS concluída no mês, especialmente para valor fixo, continua pendente de decisão.

## Idempotência e mutações

- Chamadas concorrentes equivalentes podem compartilhar a Promise local por `withSingleFlight`.
- A trava é de processo/aba e deve ser complemento, não substituto, de validações no servidor.
- Para operação que pode ser repetida após timeout, definir chave idempotente persistida e forma segura de distinguir repetição de nova intenção.
- Efeitos colaterais (notificação, e-mail, log) devem acontecer uma vez por operação lógica.

## Regras que devem ser esclarecidas antes de alterações financeiras

- Qual é a data de referência da OS: agenda, conclusão ou faturamento?
- Quais custos entram na base da comissão?
- Valor fixo é devido sem OS concluída?
- Como corrigir, estornar ou auditar um pagamento já registrado?
- Como tratar pagamentos simultâneos e pagamentos que excedam o saldo em disputa?

## Fonte de verdade

Para comportamento executável, verificar a rota/mutação e schema atual. Para intenção e critérios de aceite do fluxo de pagamentos, consultar [spec específica](./specs/pagamentos-de-tecnicos.md).
