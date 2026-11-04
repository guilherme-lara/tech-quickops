# Fluxos operacionais

## Ciclo da Ordem de Serviço

O ciclo documentado separa execução em campo e validação gerencial. Os nomes de status exibidos podem ser traduzidos e diferem dos valores persistidos em alguns casos; conferir a normalização em `src/lib/useData.tsx` e as migrations de enum.

1. **Abertura/planejamento:** usuário autorizado cria OS, define cliente, técnico, serviço e agenda.
2. **Atendimento em campo:** técnico consulta OS atribuída, inicia deslocamento quando disponível e faz check-in/início.
3. **Execução:** técnico registra informações, despesas e evidências; solicita suporte quando necessário.
4. **Entrega técnica:** técnico envia RAT, anexos e assinatura conforme regras configuradas; a OS pode passar para `concluido_tecnico`.
5. **Revisão:** gestor confere o atendimento e os valores antes da conclusão gerencial (`concluido`).
6. **Acompanhamento:** dashboards, faturamento e histórico refletem status e regras de datas aplicáveis.

Os requisitos completos de não duplicidade, incluindo limites atuais, estão em [spec de criação de OS](./specs/criacao-os-sem-duplicidade.md).

## Pagamento de técnico

1. Gestor escolhe o mês de referência no dashboard.
2. O ranking calcula o devido a partir das OS concluídas e parâmetros do técnico.
3. Gestor escolhe pagamento integral do saldo ou informa valor de adiantamento.
4. Aplicação valida valor, registra lançamento com chave idempotente e atualiza/recupera o estado.
5. O saldo e o histórico são mostrados para o técnico e mês selecionados.

Regras, permissões e critérios pendentes em [spec de pagamentos](./specs/pagamentos-de-tecnicos.md).

## Fluxos em andamento

Importação de OS, upload de arquivos, edição de cadastro e transições de status também são operações assíncronas. Cada uma precisa:

- exibir estado de espera;
- impedir duplicação da mesma ação;
- permitir ações diferentes intencionais;
- manter erros visíveis e permitir recuperação;
- atualizar consultas e dados derivados depois do resultado persistido.

## Mudanças de status

Não presumir que qualquer papel pode executar todas as transições. Validar ator, estado atual, novo estado, dados obrigatórios e policy/RPC antes de implementar uma ação.
