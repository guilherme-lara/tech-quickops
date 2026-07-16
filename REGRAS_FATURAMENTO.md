# Regras de Faturamento e Controle de Pagamentos

Este documento explica de forma detalhada o fluxo financeiro, a lógica de vencimentos e o cálculo de indicadores (KPIs) implementados no dashboard do **Tech QuickOps**.

---

## 📅 1. Regra de Ciclo de Faturamento (Mês N ➔ Mês N+1)

O faturamento da empresa segue um ciclo em que as ordens de serviço (OS) prestadas em um determinado mês são faturadas e cobradas no mês seguinte. 

* **Mês de Execução (Mês N)**: Os técnicos executam os atendimentos em campo e concluem as ordens de serviço.
* **Mês de Vencimento/Pagamento (Mês N+1)**: A cobrança é gerada com vencimento no dia de pagamento acordado com o cliente (`dia_pagamento`).

**Exemplo Prático**:
* Um serviço é executado e concluído no dia **07/07/2026** (Julho - Mês N).
* O pagamento correspondente a este serviço ocorrerá em **Agosto** (Mês N+1), no dia de pagamento cadastrado do cliente (ex: dia **17/08/2026**).

---

## 📊 2. Lógica dos KPIs Financeiros do Dashboard

Quando você filtra o dashboard por um mês de referência (ex: **Julho de 2026**), os indicadores financeiros refletem o ciclo correspondente:

### 💰 Faturamento Previsto
* **O que é**: O valor bruto total de serviços concluídos que a empresa tem a receber naquele mês.
* **Regra**: Soma de todas as OSs com status **"Concluído"** que foram executadas no mês anterior (Junho). 
* **Legenda no Dashboard**: *Total Concluído (Ref. Mês Anterior)*.

### 💵 Receita do Mês
* **O que é**: O valor que já entrou em caixa (recebido de fato).
* **Regra**: Soma de todas as OSs com status **"Concluído"** do mês anterior (Junho) cujo cliente já foi marcado como **Pago**.
* **Legenda no Dashboard**: *Pagamentos recebidos (Ref. Mês Anterior)*.

### 📉 Resultado Líquido & Ganho Real
* **Resultado Líquido**: A receita bruta real (recebida) menos os custos de viagem e despesas das OSs pagas daquele período.
* **Ganho Real**: O resultado líquido obtido pela empresa deduzindo as comissões pagas aos técnicos referentes apenas às OSs pagas daquele período.

### ⚠️ Pendências de Pagamento
* **O que é**: A contagem de faturamentos que venceram e ainda não foram pagos.
* **Regra**: Conta os faturamentos concluídos do mês anterior (M-1) que ainda não foram marcados como pagos e cuja data de vencimento (`dia_pagamento` do mês selecionado) já passou em relação à data atual.

---

## 🔔 3. Painel de Alertas de Pagamentos Próximos (`PagamentoAlerts`)

Exibido no topo do dashboard, este painel ajuda a gerenciar ativamente as cobranças que vencem no mês corrente.

### Como funciona:
1. **Filtro automático**: Exibe apenas os clientes cuja data de vencimento (`dia_pagamento`) no mês atual é em até 5 dias ou já está vencida/atrasada.
2. **Identificação de Status**:
   * **Pago (Verde)**: O cliente realizou o pagamento. O faturamento correspondente (serviços do mês anterior) foi recebido.
   * **Em Atraso (Vermelho)**: O dia de pagamento no mês atual já passou e o cliente ainda não pagou.
   * **Vence Hoje (Amarelo)** ou **A vencer (Azul)**: Pagamento pendente dentro do prazo.
3. **Botão de Alternância Rápida (Ação)**:
   * Clicar no ícone de check (`✓`) ao lado do cliente altera instantaneamente o status do faturamento correspondente para **Pago** ou **Pendente** no banco de dados, recalculando os KPIs do dashboard na hora.

---

## 🖥️ 4. Detalhes Técnicos e Banco de Dados

* **Coluna `ultimo_mes_pago` (Tabela `clientes`)**:
  * Armazena uma string representando o mês/ano de faturamento pago (ex: `"2026-06"`).
  * Se o mês de faturamento do período anterior estiver gravado nessa coluna, todos os cálculos consideram a receita daquele cliente como realizada. Se estiver vazio ou for outro mês, é considerada pendente.
