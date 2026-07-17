# Entidades Base do Sistema

O Tech QuickOps opera ao redor de 3 pilares de usuários além da própria Ordem de Serviço (OS): **Clientes**, **Técnicos** e **Analistas**. Este documento detalha as configurações e propriedades únicas de cada um.

## 1. Clientes
O cadastro de clientes possui parâmetros cruciais que definem como o sistema vai calcular custos adicionais e a que momentos as OS do cliente devem ser cobradas.

- **Base KM:** (Opcional) Indica o raio em Quilômetros que a empresa atende sem cobrar deslocamento extra.
- **Valor por KM:** Caso a viagem exceda o Base KM, o sistema multiplica automaticamente esse valor pelo excedente (ou pelo total, dependendo da configuração) no momento de criação/edição da OS.
- **Dias de Pagamento (`dias_pagamento`):** 
  - Pode conter múltiplas datas separadas por vírgula (ex: `10, 20, 30`).
  - O sistema automaticamente vasculha qual destas datas está mais próxima ao dia de hoje para exibir alertas no Dashboard Estratégico.
- **Último Mês Pago (`ultimo_mes_pago`):** É um ponteiro (string) no formato `YYYY-MM`. Se a string aqui corresponder ao mês de cobrança, o sistema considera que todas as pendências padronizadas do cliente naquele mês já foram quitadas.

## 2. Técnicos de Campo
Os técnicos são a força de trabalho e possuem métricas de comissionamento associadas ao seu perfil.

- **Perfil:** Pode ser "Técnico de Campo", "Técnico Especializado", etc.
- **Comissão e Tipo de Comissão:**
  - `porcentagem`: O técnico recebe `X%` sobre o "Valor do Serviço" (descontando viagens e despesas).
  - `fixo`: O técnico recebe um valor fixo de `R$ X` para cada OS concluída.
- **Chave PIX:** Utilizado para facilitar o pagamento das comissões diretamente pelo Gestor.

## 3. Analistas (Suporte Responsável)
Os analistas servem como ponte entre a execução em campo e a resolução técnica profunda ou negociação com o cliente.

- **Vínculo por Cliente:** Diferente dos técnicos que são "globais", os analistas pertencem a um determinado cliente. Um cliente (ex: "Renner") pode ter múltiplos analistas responsáveis pelo seu TI.
- **Integração WhatsApp:** Ao atribuir um Analista a uma OS, a interface do Técnico exibe o botão "Falar com Suporte", acionando um link direto para o WhatsApp do analista passando automaticamente o Título e o Número da OS na mensagem.

---

> [!TIP]
> No formulário de Criação de OS, existem botões "Cadastrar novo" ao lado de Clientes, Técnicos e Analistas. Isso é intencional para evitar a quebra de fluxo do gestor. Ele não precisa sair da tela de OS para cadastrar um novo integrante.
