# Processo spec-driven

## Objetivo

Reduzir perda de contexto, interpretações divergentes e regressões definindo o comportamento esperado antes de alterar áreas relevantes do sistema.

## Fluxo padrão

1. **Entender:** descrever problema, usuário afetado, evidências e resultado desejado.
2. **Definir escopo:** registrar o que entra e o que fica explicitamente fora.
3. **Especificar:** registrar atores, regras, estados, permissões, erros, casos extremos e dados afetados.
4. **Critérios de aceite:** criar cenários observáveis, preferencialmente no formato Dado/Quando/Então.
5. **Riscos e decisões:** marcar hipóteses, decisões de produto pendentes, efeitos em integrações e migrações.
6. **Implementar:** vincular mudanças de código, banco, interface e observabilidade aos requisitos.
7. **Verificar:** executar testes/build menores adequados e conferir cada critério; registrar limitações.
8. **Manter:** atualizar spec e documentos de contexto quando o comportamento real mudar.

## Quando criar uma spec própria

Crie uma página em `context/specs/` para uma funcionalidade que:

- atravesse interface, backend/banco ou vários papéis;
- envolva dinheiro, segurança, privacidade, exclusão ou migração;
- tenha estados de falha/retry, concorrência ou comportamento idempotente;
- seja grande o bastante para exigir critérios de aceite compartilhados.

Para mudança localizada e de baixo risco, documente os critérios na tarefa e atualize as páginas de contexto diretamente afetadas; evite burocracia desnecessária.

## Conteúdo mínimo de uma spec

- Nome, estado, data e responsáveis/atores.
- Problema, objetivo, escopo e não-objetivos.
- Requisitos numerados e regras de negócio.
- Critérios de aceite verificáveis e cenários negativos.
- Dados, autorização e efeitos colaterais.
- Implementação atual versus comportamento desejado.
- Testes e validações pendentes.
- Referências a código, migration e documentos relacionados.

## Estado das specs iniciais

- [Criação de OS sem duplicidade](./specs/criacao-os-sem-duplicidade.md)
- [Pagamentos de técnicos](./specs/pagamentos-de-tecnicos.md)

Essas specs foram reconstruídas depois da implementação. Servem como baseline e expõem lacunas; não significam que todos os critérios estejam completos ou testados.
