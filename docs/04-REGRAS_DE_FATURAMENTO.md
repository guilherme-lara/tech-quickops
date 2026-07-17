# Regras de Faturamento e Controle de Pagamentos

Este documento consolida as regras de negócio financeiro da plataforma, abrangendo os fluxos de faturamento cíclico e de pagamentos avulsos/antecipados.

---

## 1. Regra de Ciclo de Faturamento Padrão (Mês N ➔ Mês N+1)
O faturamento padrão da empresa segue um ciclo em que as ordens de serviço (OS) prestadas em um determinado mês são faturadas e cobradas no mês seguinte. 

- **Mês de Execução (Mês N):** Os técnicos executam os atendimentos em campo.
- **Mês de Cobrança (Mês N+1):** O sistema varre as OS com status `Concluído` do Mês N, soma os seus valores (serviço + viagem + despesas), e gera a previsão de receita com base no(s) `dias_pagamento` configurados no perfil de cada cliente.

### Lidando com Múltiplos Dias de Pagamento
Se um cliente possui em seu cadastro a propriedade `dias_pagamento` contendo múltiplas datas (ex: `10, 20`), o sistema inteligente calcula o vencimento considerando sempre a **data mais próxima a vencer**. Assim que o dia 10 passar ou for quitado, o sistema muda automaticamente o foco de cobrança para a próxima data (dia 20).

---

## 2. Pagamentos Imediatos / Avulsos (Exceção à Regra)
Há casos em que o cliente solicita um serviço urgente e paga de imediato, ignorando o ciclo normal de fechamento (Mês N+1).

### Como funciona:
- Ao criar ou editar uma Ordem de Serviço, o Gestor pode marcar a caixa **Pagamento Imediato**.
- Essa OS ganha a propriedade oculta `dados_adicionais: { pago_imediatamente: true }`.
- **Efeito no Sistema:** O faturamento dessa OS passa a ser contabilizado como receita recebida no **mesmo mês** em que foi executada, ignorando qualquer restrição de data de pagamento do cadastro geral do cliente.

---

## 3. Lógica dos KPIs Financeiros do Dashboard

Ao selecionar um mês de referência no dashboard principal, os KPIs aplicam as seguintes regras lógicas:

### 3.1. Faturamento Previsto
- **O que é:** Valor bruto total de serviços que a empresa tem a receber (ou recebeu) cobrados no mês atual.
- **Cálculo:** Soma das OS concluídas no mês anterior (Mês N-1).

### 3.2. Receita do Mês e Pendências
- **Receita (Valor Pago):** Verifica se o faturamento geral do cliente foi marcado como pago via sistema (propriedade `ultimo_mes_pago`), e inclui automaticamente qualquer OS que tenha o checkbox de `Pagamento Imediato` marcado.
- **Pendências:** Subtrai da receita bruta os faturamentos ainda não pagos. OS marcadas como `Pagamento Imediato` nunca constarão nas pendências.

### 3.3. Comissões e Resultado Líquido
- **Custo Total:** Soma de `custo_viagem` + `despesas`.
- **Comissão:** Calculada em cima do valor base do serviço do técnico (descontando viagens e despesas extras), baseada no formato de comissão (Fixo vs Porcentagem).
- **Resultado Líquido / Ganho Real:** `Receita Bruta - (Custos + Comissões)`.

---

## 4. O Painel Financeiro Estratégico

Logo abaixo dos gráficos de evolução, o Gestor encontra o Painel Estratégico. 
Ele lista cada cliente em que houve faturamento gerado para o mês selecionado, provendo as colunas:

- **OS Solicitadas:** Volume bruto de demandas do cliente.
- **Fatura Total:** Somatório do que foi faturado (bruto).
- **Valor Pago:** O quanto da fatura total já está no caixa.
- **Valor Pendente:** O valor que ainda resta ser pago pela fatura.

Se um cliente pagou sua fatura geral, as colunas "Valor Pago" e "Fatura Total" se igualam. Se houveram OS avulsas pagas imediatamente, o "Valor Pago" já virá parcialmente ou totalmente preenchido mesmo que a fatura geral ainda esteja como Pendente.
