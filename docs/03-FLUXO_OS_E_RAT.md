# Fluxo da OS e Relatório de Atendimento Técnico (RAT)

O fluxo principal do QuickOps acontece entre a criação de uma OS pelo Gestor e a execução e finalização pelo Técnico.

## 1. Ciclo de Vida da OS (Status)
A Ordem de Serviço transita entre diferentes status para indicar em qual fase da operação se encontra:

1. **Orçamento / Pendência / Agendamento / Reagendado**: Status iniciais. Indicam que a OS ainda não começou a ser executada em campo.
2. **Em andamento**: O técnico realizou o Check-in no local.
3. **Concluído_tecnico**: O técnico finalizou o RAT e pegou a assinatura do cliente, mas o gestor ainda não revisou ou aprovou os custos extras.
4. **Concluído**: O Gestor revisou a OS, faturou e ela agora contabiliza oficialmente nos dashboards e metas.
5. **Cancelado**: A OS foi abortada.

---

## 2. Visão do Técnico (Priorização e Execução)
A interface `/tecnico/dashboard` e `/tecnico/os` foi projetada em **Mobile-first**. É aqui que o Técnico de Campo passará 99% do seu tempo.

### Painel Principal e Histórico
- **Painel de Acesso Rápido:** Apenas OS ativas (pendentes ou agendadas) aparecem na fila principal do técnico.
- **Histórico:** OSs já finalizadas (com status `concluido` ou `concluido_tecnico`) são enviadas para a aba "Histórico", garantindo que a tela principal não fique poluída com trabalhos antigos.

### A Jornada de Execução (O Fluxo do RAT)
Quando o técnico acessa uma OS pendente e decide iniciar o trabalho, ele aciona o preenchimento do **RAT (Relatório de Atendimento Técnico)**, dividido em etapas interativas e obrigatórias:

1. **Check-in via GPS**
   - Para iniciar o atendimento (`status = "Em andamento"`), o técnico precisa clicar em Check-in.
   - O sistema exige acesso à geolocalização do navegador/celular e capta automaticamente a hora de início.
   
2. **Execução e Suporte**
   - O técnico pode visualizar a descrição do problema e qualquer campo personalizado enviado pelo Gestor.
   - Caso possua dúvidas, o botão **"Falar com Suporte"** direciona o técnico para o WhatsApp do Analista com uma mensagem pré-preenchida contendo os dados da OS.

3. **Check-out, Evidências e Assinatura**
   - O técnico anexa fotos/arquivos como **Evidências** do serviço realizado.
   - Uma tela de "Canvas" permite que o cliente **assine com o dedo ou caneta touch** diretamente na tela do celular do técnico.
   - Ao finalizar, o check-out registra o horário final e o status da OS passa automaticamente para `concluído_tecnico`.

---

> [!WARNING]
> Sem Check-in e sem Assinatura do cliente, o sistema trava o botão de concluir, garantindo conformidade e segurança jurídica sobre as ordens de serviço executadas.
