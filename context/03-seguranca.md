# Segurança e permissões

Este documento descreve os princípios observados e requisitos de manutenção. Não é uma auditoria completa de todas as rotas e policies.

## Identidade e papéis

- A aplicação usa Supabase Auth; a sessão é persistida e o token é renovado pelo cliente configurado em `src/integrations/supabase/client.ts`.
- O perfil da aplicação contém papel e contexto da empresa. Os papéis observados incluem `gestor`, `admin`, `superadmin`, `analista` e `tecnico`.
- `ProtectedRoute` controla a navegação e acesso à interface. Esse controle melhora UX, mas não substitui a autorização nas policies, RPCs e endpoints.
- A regra `admin` como gestor existe em certas rotas; não extrapolar a equivalência para o banco sem verificar a policy relevante.

## Isolamento multiempresa

- Operações de usuário devem ser limitadas à empresa autorizada.
- O banco usa funções como `get_current_empresa_id()` e `has_role(...)` em policies e funções.
- Em novas tabelas, verificar `empresa_id`, relações entre entidades da empresa e políticas separadas para cada operação necessária.
- Não confiar em `empresa_id`, papel, `registrado_por` ou proprietário enviados pelo navegador sem validá-los no servidor/banco.
- Consultas de recuperação por uma chave idempotente também devem continuar sujeitas às policies da entidade.

## Row Level Security (RLS)

- RLS é necessária para tabelas acessíveis pelo cliente autenticado. Confirmar habilitação e policies para `SELECT`, `INSERT`, `UPDATE` e `DELETE`.
- Conceder apenas os privilégios SQL necessários; grant não substitui policy.
- Funções `SECURITY DEFINER` exigem revisão de `search_path`, permissões de execução e validação de papel/empresa.
- Políticas devem ser testadas com papéis autorizados e não autorizados, incluindo usuário de outra empresa.
- A lista de migrations históricas não prova que o banco remoto tem o mesmo estado; conferir ambiente e histórico de aplicação.

## Segredos e clientes

- Valores `VITE_*` são entregues ao navegador: só podem conter URL e chave publicável/anônima conforme o modelo Supabase.
- Nunca colocar service-role key, tokens privados, senhas ou secrets em código cliente, commits, logs ou documentos de contexto.
- Endpoints server-side devem manter credenciais privilegiadas no servidor e autenticar/autorizar cada operação.
- Mensagens de erro não devem vazar tokens, segredos ou dados de outro tenant.

## Dados pessoais e arquivos

- OS, RAT, assinatura, documentos e perfil podem conter dados sensíveis/pessoais. Coletar somente o necessário e respeitar o escopo da empresa e do usuário.
- Arquivos privados devem usar policies de Storage e links temporários/autorizados conforme o caso; não presumir que todo bucket é privado ou público.
- Ao remover registros, considerar retenção de histórico, logs e arquivos associados.

## Controles específicos documentados

- A tabela `pagamentos_tecnicos` foi projetada com RLS para consulta e inserção por gestor/admin/superadmin da empresa corrente, com validação do autor e do vínculo do técnico.
- A policy e as permissões devem ser confirmadas no Supabase real; executar uma migration ou gerar tipos localmente não comprova a implantação.
- O índice único de idempotência de OS evita repetir a mesma chave no banco, mas não detecta duas solicitações sem a mesma chave.

## Checklist de segurança para mudanças

1. Quem pode executar a ação e em qual tenant?
2. A regra está aplicada no banco/servidor, além da UI?
3. Há validação para referências cruzadas entre empresas?
4. Dados retornados incluem somente campos necessários?
5. Uploads e downloads obedecem ao escopo esperado?
6. Falhas e logs evitam expor dados privados?
7. Testes cobrem usuário sem papel e usuário de outra empresa?
