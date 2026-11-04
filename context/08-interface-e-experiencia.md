# Interface e experiência

## Diretrizes

- **Técnico:** interface mobile-first, conteúdo prioritário por OS e ações rápidas em campo.
- **Gestor:** foco em acompanhamento, pesquisa, ranking, indicadores e ações claras.
- **Consistência:** reutilizar componentes e padrões de formulários, diálogos, toasts e estados já presentes no projeto.

## Ações assíncronas

Toda ação que grava, envia ou processa dados deve tornar seu estado observável:

1. Validar entradas antes do envio e explicar o que falta.
2. Desabilitar o controle que enviou enquanto a mesma operação está pendente.
3. Mostrar progresso/carregamento sem bloquear ações não relacionadas.
4. Evitar dois efeitos idênticos causados por double click.
5. Mostrar sucesso apenas quando houver confirmação suficiente do resultado persistido.
6. Exibir erros recuperáveis e permitir nova tentativa sem travas residuais.
7. Atualizar dados derivados, histórico e contadores após a resposta.

Uma trava local não evita repetição entre abas, dispositivos ou workers; a UX deve ser complementada por idempotência e integridade no backend quando necessário.

## Acessibilidade e feedback

- Botões devem ter rótulos que expressem a ação, não apenas ícones quando o contexto não for inequívoco.
- Estados de carregamento devem ser visíveis e controles precisam manter comportamento de teclado/foco conforme o componente base.
- Diálogos com gravação pendente não devem fechar silenciosamente e perder o contexto da operação.
- Para valores financeiros, exibir moeda e precisão em formato localizado, mantendo validação exata em centavos.
- Confirmar operações destrutivas e distinguir cancelamento pelo usuário de falha do servidor.

## Critérios para revisar telas

- É possível perceber que o clique foi recebido?
- Há bloqueio da repetição sem impedir uma ação legítima diferente?
- A interface evita mostrar dados locais como se já fossem persistidos?
- O usuário entende a consequência, sucesso, falha e próximo passo?
- Layout e controles continuam utilizáveis no celular e com leitor de tela?
