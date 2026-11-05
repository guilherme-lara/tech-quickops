# Spec: RLS do sistema

- **Estado:** inventário do comportamento inferido das migrations locais; pendente de conferência no Supabase.
- **Última revisão:** 4 de novembro de 2026.
- **Escopo:** Row Level Security em tabelas `public` e policies aplicadas a `storage.objects`.
- **Fonte:** migrations em [supabase/migrations/](../../supabase/migrations/), consideradas em ordem de nome e com `DROP POLICY` seguido de `CREATE POLICY` aplicado ao inventário.

## Objetivo

Manter uma referência única de todas as policies RLS do sistema, incluindo operações, filtros de tenant, papéis e limitações conhecidas. Esta spec descreve o estado inferido do histórico versionado; não substitui a consulta ao catálogo do banco em cada ambiente.

## Como interpretar

- Foram identificadas **79 policies ativas inferidas**: 63 em 16 tabelas de `public` e 16 em `storage.objects`.
- As 16 tabelas `public` listadas abaixo têm `ENABLE ROW LEVEL SECURITY` nas migrations. `storage.objects` é a tabela de Storage do Supabase; as migrations do projeto criam policies nela, mas não alteram sua habilitação de RLS.
- Policies permissivas na mesma tabela/ação são combinadas com **OR**. Portanto, uma policy antiga mais abrangente pode continuar permitindo uma operação mesmo quando outra policy mais restritiva também existe.
- `USING` filtra linhas existentes; `WITH CHECK` valida linhas inseridas ou resultantes de updates. Quando uma policy de update/all não especifica `WITH CHECK`, o PostgreSQL aplica a expressão de `USING` também à linha nova.
- “Todos da empresa” significa que a condição principal compara `empresa_id` com `public.get_current_empresa_id()`. Não significa necessariamente que a policy também valida papel.
- Os resumos abaixo registram as condições da policy, não os privilégios SQL (`GRANT`) nem os acessos de funções com privilégios elevados.

## Helpers de autorização

- `public.get_current_empresa_id()` retorna a empresa do perfil associado a `auth.uid()` ou, para técnico sem perfil, a empresa do registro em `public.tecnicos` associado por `user_id`. A função é `SECURITY DEFINER`, está limitada ao `search_path = public` e seu `EXECUTE` é concedido a `authenticated` nas migrations.
- `public.has_role(user_id, role)` consulta perfis e também reconhece técnicos vinculados. A implementação atual considera `admin` e `superadmin` como `gestor` quando a função é chamada com o papel `gestor`.
- Essas descrições refletem as migrations locais [20260716161000_fix_tecnico_rls_functions.sql](../../supabase/migrations/20260716161000_fix_tecnico_rls_functions.sql) e [20260716162000_admin_is_gestor.sql](../../supabase/migrations/20260716162000_admin_is_gestor.sql); verificar o corpo e os grants no ambiente de destino antes de depender deles.

## Inventário de policies

### `public.analistas_cliente`

RLS habilitada. As policies antigas por empresa coexistem com as policies com verificação de papel; por causa do OR, as antigas continuam permitindo CRUD a qualquer usuário autenticado da empresa corrente.

| Operação | Policies e condição |
|---|---|
| SELECT | `analistas_select_by_empresa`: empresa corrente, sem condição de papel. |
| INSERT | `analistas_insert_by_empresa`: empresa corrente, sem condição de papel. `gestor/analista insert analistas_cliente`: empresa corrente e papel gestor, analista, admin ou superadmin. |
| UPDATE | `analistas_update_by_empresa`: empresa corrente, sem condição de papel. `gestor/analista update analistas_cliente`: empresa corrente e papel gestor, analista, admin ou superadmin. |
| DELETE | `analistas_delete_by_empresa`: empresa corrente, sem condição de papel. `gestor/analista delete analistas_cliente`: empresa corrente e papel gestor, analista, admin ou superadmin. |

Fontes: [20260702034248_7e4a4566-2395-4a0e-9735-88edb436278d.sql](../../supabase/migrations/20260702034248_7e4a4566-2395-4a0e-9735-88edb436278d.sql), [20260714000006_security_audit_fixes_v4.sql](../../supabase/migrations/20260714000006_security_audit_fixes_v4.sql).

### `public.changelog`

RLS habilitada.

| Operação | Policies e condição |
|---|---|
| SELECT | `Todos autenticados podem ver o changelog`: qualquer usuário `authenticated`. |
| ALL | `Admins podem gerenciar changelog`: `has_role` para superadmin, admin ou gestor. Inclui operações de leitura e escrita. |

Fonte: [20260826143000_add_notifications_and_changelog.sql](../../supabase/migrations/20260826143000_add_notifications_and_changelog.sql).

### `public.clientes`

RLS habilitada.

| Operação | Policies e condição |
|---|---|
| SELECT | `tenant select`: empresa corrente, sem condição de papel. |
| INSERT | `gestor/analista insert clientes`: empresa corrente e papel gestor, analista, admin ou superadmin. |
| UPDATE | `gestor/analista update clientes`: empresa corrente e papel gestor, analista, admin ou superadmin. |
| DELETE | `gestor/analista delete clientes`: empresa corrente e papel gestor, analista, admin ou superadmin. |

Fontes: [20260515040622_dc328b1c-254d-4ba6-afdd-9b4f8baa5e3f.sql](../../supabase/migrations/20260515040622_dc328b1c-254d-4ba6-afdd-9b4f8baa5e3f.sql), [20260714000006_security_audit_fixes_v4.sql](../../supabase/migrations/20260714000006_security_audit_fixes_v4.sql).

### `public.email_queue`

RLS habilitada. As duas policies de SELECT são permissivas e se combinam com OR; assim, a policy de gestor/admin/superadmin não restringe a policy por empresa.

| Operação | Policies e condição |
|---|---|
| SELECT | `Usuarios veem fila da propria empresa`: empresa corrente, sem condição de papel. `Gestores veem emails da sua empresa`: empresa corrente e papel gestor, admin ou superadmin. |

Fontes: [20260826211442_f08321dc-3557-4b21-b9f3-a3f6d0f4332e.sql](../../supabase/migrations/20260826211442_f08321dc-3557-4b21-b9f3-a3f6d0f4332e.sql), [20260903031020_b7c7edbd-3766-42d9-9bc8-6fe59fe990cf.sql](../../supabase/migrations/20260903031020_b7c7edbd-3766-42d9-9bc8-6fe59fe990cf.sql).

### `public.empresas`

RLS habilitada.

| Operação | Policies e condição |
|---|---|
| SELECT | `view own empresa`: empresa corrente. `superadmin_select_all`: perfil do usuário com papel superadmin. |
| INSERT | `signup insert empresa`: não existe perfil para `auth.uid()`. `superadmin_insert_all`: perfil do usuário com papel superadmin. |
| UPDATE | `update own empresa`: linha da empresa corrente. `superadmin_update_all`: superadmin na linha existente e na linha nova. |
| DELETE | `superadmin_delete_all`: perfil do usuário com papel superadmin. |

Fontes: [20260515040622_dc328b1c-254d-4ba6-afdd-9b4f8baa5e3f.sql](../../supabase/migrations/20260515040622_dc328b1c-254d-4ba6-afdd-9b4f8baa5e3f.sql), [20260522185215_56dbb273-d5c3-4048-8ca2-d1d4c9a97b59.sql](../../supabase/migrations/20260522185215_56dbb273-d5c3-4048-8ca2-d1d4c9a97b59.sql), [20260713000000_add_superadmin_features.sql](../../supabase/migrations/20260713000000_add_superadmin_features.sql).

### `public.equipamentos_clientes`

RLS habilitada. Apesar dos nomes das policies, as condições visíveis são de empresa; elas não verificam papel. A policy `FOR ALL` permite operações além de SELECT para registros da empresa corrente.

| Operação | Policies e condição |
|---|---|
| SELECT | `Gestores podem ver equipamentos_clientes`: empresa corrente. `Gestores podem gerenciar equipamentos_clientes` (`FOR ALL`): empresa corrente. |
| INSERT, UPDATE, DELETE | `Gestores podem gerenciar equipamentos_clientes` (`FOR ALL`): empresa corrente; INSERT/UPDATE também validam a empresa da linha nova. |

Fonte: [20260813161500_fases_inventario_equipamentos.sql](../../supabase/migrations/20260813161500_fases_inventario_equipamentos.sql).

### `public.itens_inventario`

RLS habilitada. Não foi encontrada policy de SELECT no conjunto inferido: usuários comuns não têm linhas visíveis por SELECT enquanto RLS estiver ativa, mesmo que possuam privilégio SQL de leitura.

| Operação | Policies e condição |
|---|---|
| INSERT | `gestor/analista insert itens_inventario`: empresa corrente e papel gestor, analista, admin ou superadmin. |
| UPDATE | `gestor/analista update itens_inventario`: empresa corrente e papel gestor, analista, admin ou superadmin. |
| DELETE | `gestor/analista delete itens_inventario`: empresa corrente e papel gestor, analista, admin ou superadmin. |

Fonte: [20260714000006_security_audit_fixes_v4.sql](../../supabase/migrations/20260714000006_security_audit_fixes_v4.sql).

### `public.logs_administrativos`

RLS habilitada. As policies de INSERT são permissivas e se combinam com OR; a policy `inserir_logs_empresa` permite inserir na empresa corrente sem exigir papel.

| Operação | Policies e condição |
|---|---|
| SELECT | `visualizar_logs_empresa`: empresa corrente ou superadmin. `superadmin_select_logs`: papel superadmin. |
| INSERT | `inserir_logs_empresa`: empresa corrente, sem condição de papel. `superadmin_insert_logs`: papel superadmin, sem filtro de empresa. |

Fontes: [20260713000002_superadmin_logs.sql](../../supabase/migrations/20260713000002_superadmin_logs.sql), [20260716183000_fix_logs_rls_visibility.sql](../../supabase/migrations/20260716183000_fix_logs_rls_visibility.sql).

### `public.notificacoes`

RLS habilitada. Não foi encontrada policy de INSERT. As três policies existentes associam o registro ao usuário por `perfil_id = auth.uid()`.

| Operação | Policies e condição |
|---|---|
| SELECT | `Usuários veem suas próprias notificações`: perfil associado ao usuário autenticado. |
| UPDATE | `Usuários podem atualizar suas notificações (ex: marcar lida)`: perfil associado ao usuário autenticado. |
| DELETE | `Usuários podem deletar suas notificações`: perfil associado ao usuário autenticado. |

Fonte: [20260826143000_add_notifications_and_changelog.sql](../../supabase/migrations/20260826143000_add_notifications_and_changelog.sql).

### `public.ordens_servico`

RLS habilitada. Há sete policies ativas inferidas. As policies antigas `tenant insert`, `tenant update` e `tenant delete` não restringem o papel e continuam permissivas junto das policies posteriores com papel; logo, as últimas não impõem sozinhas a restrição de papel pretendida.

| Operação | Policies e condição |
|---|---|
| SELECT | `tenant select os`: empresa corrente e papel gestor, analista, admin, superadmin ou técnico vinculado à OS. |
| INSERT | `tenant insert`: empresa corrente, sem condição de papel. `tenant insert os`: empresa corrente e papel gestor, analista, admin ou superadmin. A policy antiga por empresa mantém o acesso mais amplo. |
| UPDATE | `tenant update`: empresa corrente, sem condição de papel. `tenant update os`: empresa corrente e papel gestor, analista, admin, superadmin ou técnico vinculado à OS. A policy antiga por empresa mantém o acesso mais amplo. |
| DELETE | `tenant delete`: empresa corrente, sem condição de papel. `tenant delete os`: empresa corrente e papel gestor, analista, admin ou superadmin. A policy antiga por empresa mantém o acesso mais amplo. |

Na policy de SELECT e na policy de UPDATE por papel, o técnico é comparado com `tecnicos.id` ou `tecnicos.user_id`, ligado a `ordens_servico.tecnico_id`. Os vínculos também exigem que `empresa_id` da OS seja a empresa corrente.

Fontes: [20260626173000_audit_multitenancy_and_cleanup.sql](../../supabase/migrations/20260626173000_audit_multitenancy_and_cleanup.sql), [20260715000001_fix_os_policies_and_pgcrypto.sql](../../supabase/migrations/20260715000001_fix_os_policies_and_pgcrypto.sql), [20260716024837_eccbf25d-18f5-4dd0-bb5b-b208f1ab8451.sql](../../supabase/migrations/20260716024837_eccbf25d-18f5-4dd0-bb5b-b208f1ab8451.sql).

### `public.os_historico`

RLS habilitada; apenas SELECT está coberto pelas policies encontradas.

| Operação | Policies e condição |
|---|---|
| SELECT | `os_historico select gestores`: empresa corrente e papel gestor, analista, admin ou superadmin. `os_historico select tecnico`: empresa corrente e papel técnico com vínculo à OS pelo `tecnico_id` ou `user_id`. |

Fonte: [20260716030149_120d2389-b284-4e80-9404-6580a8dc67a3.sql](../../supabase/migrations/20260716030149_120d2389-b284-4e80-9404-6580a8dc67a3.sql).

### `public.pagamentos_tecnicos`

RLS habilitada. Grants da migration concedem SELECT e INSERT a `authenticated`; as policies limitam essas operações. Não foram encontradas policies de UPDATE ou DELETE.

| Operação | Policies e condição |
|---|---|
| SELECT | `Gestores podem consultar pagamentos de técnicos`: empresa corrente e papel gestor, admin ou superadmin. |
| INSERT | `Gestores podem registrar pagamentos de técnicos`: empresa corrente, `registrado_por = auth.uid()`, papel gestor/admin/superadmin e, se `tecnico_id` não for nulo, técnico pertencente à mesma empresa. |

Fonte: [20261104100000_create_pagamentos_tecnicos.sql](../../supabase/migrations/20261104100000_create_pagamentos_tecnicos.sql).

### `public.perfis`

RLS habilitada. Na policy cujo nome diz “Gestores e Admins”, o predicado explícito chama `has_role(..., 'gestor')`; a implementação atual do helper também considera admin e superadmin como gestor.

| Operação | Policies e condição |
|---|---|
| SELECT | `view own perfil`: `id = auth.uid()`. `Gestores e Admins podem ver todos os perfis da empresa`: empresa corrente e `has_role(auth.uid(), 'gestor')`. |
| INSERT | `insert own perfil`: `id = auth.uid()` e papel `tecnico` ou nulo. |
| UPDATE | `update own perfil`: `USING` seleciona `id = auth.uid()`; `WITH CHECK` mantém empresa e papel iguais aos valores atuais do usuário, sem repetir explicitamente a condição de `id`. `Gestores podem atualizar perfis da empresa`: empresa corrente e papel gestor ou superadmin. |

Fontes: [20260519113012_2b8ae1b9-6487-45ee-b0c5-75aae7112637.sql](../../supabase/migrations/20260519113012_2b8ae1b9-6487-45ee-b0c5-75aae7112637.sql), [20260714000004_security_audit_fixes_v2.sql](../../supabase/migrations/20260714000004_security_audit_fixes_v2.sql), [20260714000005_security_audit_fixes_v3.sql](../../supabase/migrations/20260714000005_security_audit_fixes_v3.sql), [20260716163000_gestor_admin_select_perfis.sql](../../supabase/migrations/20260716163000_gestor_admin_select_perfis.sql).

### `public.rat_arquivos`

RLS habilitada. As policies verificam se a OS referenciada pertence à empresa corrente; não restringem por papel nem por técnico. Não foi encontrada policy de UPDATE.

| Operação | Policies e condição |
|---|---|
| SELECT | `tenant select rat_arquivos`: a OS referenciada pertence à empresa corrente. |
| INSERT | `tenant insert rat_arquivos`: a OS referenciada pertence à empresa corrente. |
| DELETE | `tenant delete rat_arquivos`: a OS referenciada pertence à empresa corrente. |

Fonte: [20260525164832_e6e0aa4b-b1e6-4f78-bc09-556d30aecfa1.sql](../../supabase/migrations/20260525164832_e6e0aa4b-b1e6-4f78-bc09-556d30aecfa1.sql).

### `public.tecnico_ferramentas`

RLS habilitada. As condições são de empresa e não incluem verificação de papel, apesar dos nomes das policies.

| Operação | Policies e condição |
|---|---|
| SELECT | `Gestores podem ver ferramentas de tecnicos`: empresa corrente. `Gestores podem gerenciar ferramentas de tecnicos` (`FOR ALL`): empresa corrente. |
| INSERT, UPDATE, DELETE | `Gestores podem gerenciar ferramentas de tecnicos` (`FOR ALL`): empresa corrente; INSERT/UPDATE também validam a empresa da linha nova. |

Fonte: [20260813161500_fases_inventario_equipamentos.sql](../../supabase/migrations/20260813161500_fases_inventario_equipamentos.sql).

### `public.tecnicos`

RLS habilitada. Policies antigas por empresa coexistem com as policies com verificação de papel. O OR permite que as antigas mantenham operações mais amplas para usuários autenticados da empresa.

| Operação | Policies e condição |
|---|---|
| SELECT | `tenant select` e `view own tecnicos`: empresa corrente; nenhuma das duas limita a leitura a um técnico individual. |
| INSERT | `authenticated insert tecnico`: empresa presente no perfil do usuário, sem condição de papel. `gestor/analista insert tecnicos`: empresa corrente e papel gestor, analista, admin ou superadmin. |
| UPDATE | `update own tecnicos`: empresa presente no perfil do usuário, sem condição de papel. `gestor/analista update tecnicos`: empresa corrente e papel gestor, analista, admin, superadmin ou `id = auth.uid()`. |
| DELETE | `delete own tecnicos`: empresa presente no perfil do usuário, sem condição de papel. `gestor/analista delete tecnicos`: empresa corrente e papel gestor, analista, admin ou superadmin. |

Fontes: [20260515040622_dc328b1c-254d-4ba6-afdd-9b4f8baa5e3f.sql](../../supabase/migrations/20260515040622_dc328b1c-254d-4ba6-afdd-9b4f8baa5e3f.sql), [20260626170000_fix_tecnico_insert_rls.sql](../../supabase/migrations/20260626170000_fix_tecnico_insert_rls.sql), [20260714000006_security_audit_fixes_v4.sql](../../supabase/migrations/20260714000006_security_audit_fixes_v4.sql).

### `storage.objects`

As policies abaixo são aplicadas à tabela de objetos do Supabase Storage. Policies permissivas para a mesma operação também se combinam com OR.

| Operação | Policies e condição |
|---|---|
| SELECT | `Acesso publico assets` e `Public Access`: bucket `assets`, sem restrição de autenticação ou empresa. `Authenticated` não é requisito nessas duas policies. `contratos_select_backoffice`: bucket `contratos` e papel gestor, analista, admin ou superadmin. `equipamentos_select_tenant`: bucket `equipamentos` e primeiro segmento do caminho igual à empresa corrente, ou objeto referenciado em `equipamentos_clientes.fotos` da empresa corrente. `Tenant download rats and fotos`: bucket `rats` ou `fotos`, primeira parte do caminho corresponde a uma OS da empresa corrente e ator é gestor, analista, admin, superadmin ou técnico vinculado à OS. |
| INSERT | `Authenticated users can upload`: bucket `assets`, qualquer `authenticated`. `Tenant manage assets` (`FOR ALL`): bucket `assets`, qualquer `authenticated`. `contratos_insert_backoffice`: bucket `contratos` e papel gestor, analista, admin ou superadmin. `equipamentos_insert_tenant`: bucket `equipamentos` e primeiro segmento do caminho igual à empresa corrente. `Tenant insert/update/delete rats and fotos` (`FOR ALL`): bucket `rats` ou `fotos`, OS do caminho pertence à empresa corrente e ator autorizado como descrito em SELECT. |
| UPDATE | `Authenticated users can update` e `Tenant manage assets` (`FOR ALL`): bucket `assets`, sem restrição de empresa ou caminho. `contratos_update_backoffice`: bucket `contratos` e papel gestor, admin ou superadmin. `equipamentos_update_tenant`: bucket `equipamentos` e primeiro segmento do caminho igual à empresa corrente, tanto para a linha existente quanto para a nova. `Tenant insert/update/delete rats and fotos` (`FOR ALL`): valida bucket, OS, empresa e ator tanto pela linha existente quanto pela nova. |
| DELETE | `Authenticated users can delete`: bucket `assets`, qualquer `authenticated`. `Tenant manage assets` (`FOR ALL`): bucket `assets`, sem restrição de empresa ou caminho. `contratos_delete_backoffice`: bucket `contratos` e papel gestor, admin ou superadmin. `equipamentos_delete_tenant`: bucket `equipamentos` e primeiro segmento do caminho igual à empresa corrente. `Tenant insert/update/delete rats and fotos` (`FOR ALL`): bucket `rats` ou `fotos`, OS do caminho pertence à empresa corrente e ator autorizado. |

Observações específicas:

- As policies de `assets` permitem leitura pública e operações de escrita para qualquer usuário autenticado; as condições não vinculam o objeto a uma empresa.
- As policies de `contratos` verificam papel e bucket, mas não verificam `empresa_id` nem prefixo de caminho.
- As policies de `equipamentos` verificam o prefixo de empresa no caminho para INSERT/UPDATE/DELETE. SELECT também pode ocorrer se o objeto estiver referenciado em `equipamentos_clientes.fotos` da empresa.
- Para `rats` e `fotos`, a relação é feita usando o primeiro segmento do caminho como ID da OS. A policy `FOR ALL` inclui SELECT além da policy de SELECT separada.

Fontes: [20260703180109_add_config_fields_and_storage.sql](../../supabase/migrations/20260703180109_add_config_fields_and_storage.sql), [20260714000004_security_audit_fixes_v2.sql](../../supabase/migrations/20260714000004_security_audit_fixes_v2.sql), [20260716163000_fix_storage_tecnico_id_policies.sql](../../supabase/migrations/20260716163000_fix_storage_tecnico_id_policies.sql), [20260825183703_9550b885-f674-41fb-acad-693163921eaf.sql](../../supabase/migrations/20260825183703_9550b885-f674-41fb-acad-693163921eaf.sql), [20260902174629_796d237e-4e00-4647-a212-11e3d8eaeed7.sql](../../supabase/migrations/20260902174629_796d237e-4e00-4647-a212-11e3d8eaeed7.sql).

## Critérios de aceite para mudanças de RLS

1. Toda tabela acessível por clientes declara habilitação de RLS, policies por operação necessária e grants compatíveis.
2. Cada operação valida empresa, papel e vínculo entre entidades conforme o fluxo; valores enviados pelo cliente não substituem validação no banco.
3. Policies permissivas duplicadas são revisadas considerando OR; adicionar uma policy mais restritiva não reduz o acesso se uma policy mais ampla continuar ativa.
4. Policies Storage são validadas por bucket, empresa, caminho e ator para cada operação, inclusive leitura pública intencional.
5. Testes cobrem usuário anônimo, autenticado sem papel, cada papel permitido, outro tenant e referências cruzadas entre empresas.
6. A validação registra migrations aplicadas e compara o catálogo do ambiente com este inventário; migrations locais isoladamente não provam o estado remoto.

## Conferência pendente

- Consultar no projeto Supabase de cada ambiente `pg_class.relrowsecurity`, `pg_policies`, permissões da tabela e policies em `storage.objects`.
- Confirmar quais policies e grants estão realmente aplicados e corrigir este inventário se houver divergência.
- Revisar explicitamente as policies permissivas antigas em `analistas_cliente`, `email_queue`, `ordens_servico` e `tecnicos`, além do alcance das policies de Storage.
- Definir se a ausência de SELECT em `itens_inventario` é intencional.
