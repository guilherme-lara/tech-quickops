# Guia de Teste - Importação com findOrCreateTecnico

## Objetivo

Verificar se a importação de planilhas cria técnicos automaticamente e se eles aparecem na tela de Equipe.

## Passo a Passo

### 1. Preparar Planilha de Teste

Crie um arquivo `teste_importacao.xlsx` com a seguinte estrutura:

| Local da Obra   | Descrição do Problema | Data Prevista | Responsável Técnico | Valor Acordado |
| --------------- | --------------------- | ------------- | ------------------- | -------------- |
| Cliente Teste 1 | Problema teste 1      | 15/06/2026    | João Silva          | 1250,00        |
| Cliente Teste 2 | Problema teste 2      | 16/06/2026    | Maria Souza         | 890,50         |
| Cliente Teste 3 | Problema teste 3      | 17/06/2026    | Pedro Santos        | 1500,00        |

**Importante:** Use nomes de técnicos que **NÃO existem** no banco de dados para testar a criação automática.

### 2. Executar Importação

1. Acesse o sistema como gestor
2. Vá para a página de Ordens de Serviço (`/os`)
3. Clique no botão "Importar planilha"
4. Arraste o arquivo `teste_importacao.xlsx` ou clique para selecionar
5. Aguarde o processamento

### 3. Verificar Resultados Esperados

#### Durante a Importação

Você verá toasts aparecendo:

- ✅ `Técnico João Silva criado automaticamente`
- ✅ `Técnico Maria Souza criado automaticamente`
- ✅ `Técnico Pedro Santos criado automaticamente`

#### Após Conclusão

A mensagem final deve mostrar:

```
Importadas: 3. Falhas: 0. 3 técnico(s) criado(s). 3 técnico(s) vinculado(s).
```

### 4. Validar na Tela de Equipe

1. Acesse a página Equipe (`/equipe`)
2. Verifique se os 3 técnicos aparecem na lista:
   - João Silva
   - Maria Souza
   - Pedro Santos

3. Clique em um técnico para editar e confira:
   - Nome está correto
   - Status "Ativo"
   - Campos `email` e `dados_adicionais` estão vazios (opcional)

### 5. Verificar Ordens Criadas

1. Volte para `/os`
2. Confira se as 3 ordens foram criadas
3. Clique em uma OS para ver detalhes
4. Verifique no campo `dados_adicionais`:
   ```json
   {
     "needs_validation": false,
     "_tecnico_nome_planilha": "João Silva"
   }
   ```

## Cenários de Teste

### ✅ Caso 1: Técnico Novo (deve criar)

- Nome na planilha: "Carlos Novo"
- Resultado: Cria técnico e vincula à OS

### ✅ Caso 2: Técnico Existente (deve vincular)

- Nome na planilha: "João Silva" (já existe)
- Resultado: Apenas vincula, não cria duplicata

### ✅ Caso 3: Nome Vazio (deve marcar para validação)

- Coluna "Responsável Técnico" vazia
- Resultado: `tecnico_id: null`, `needs_validation: true`

### ✅ Caso 4: Case Insensitive

- Nome na planilha: "joão silva" (minúsculo)
- Nome no banco: "João Silva" (normal)
- Resultado: Deve encontrar e vincular (graças ao `.ilike()`)

## Troubleshooting

### Se técnicos NÃO forem criados:

1. Verifique o console do navegador (F12) para erros
2. Verifique se a migration RLS foi aplicada no Supabase
3. Confira se o usuário está autenticado como gestor

### Se técnicos aparecem mas sem vinculação:

1. Verifique o campo `dados_adicionais` da OS
2. Deve conter `_tecnico_nome_planilha` com o nome original
3. Se `needs_validation: true`, houve erro na criação

### Para ver logs detalhados:

Abra o console do navegador e procure por:

- `"Erro ao buscar técnico:"` - erro na busca
- `"Erro ao criar técnico:"` - erro na inserção
- `"ERRO DETALHADO DO SUPABASE:"` - erro genérico

## Critérios de Sucesso

✅ Todos os técnicos novos são criados automaticamente  
✅ Técnicos existentes são vinculados (sem duplicatas)  
✅ Toasts informam claramente o que aconteceu  
✅ Técnicos aparecem na tela de Equipe após importação  
✅ Ordens são criadas com `tecnico_id` correto  
✅ Flag `needs_validation` marca casos de erro

## Próximos Passos (Milestone 4)

Após validar o funcionamento básico, o Milestone 4 irá:

- Implementar tela de validação para OS com `needs_validation: true`
- Permitir edição de técnicos criados automaticamente (preencher email, etc.)
- Adicionar botão "Atribuir técnico" nas OS pendentes de validação
