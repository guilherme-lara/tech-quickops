# Arquitetura e tecnologia

## Stack observada

O projeto é uma aplicação TypeScript com React, Vite e TanStack Start/Router. A interface usa Tailwind CSS, componentes Radix/shadcn e ícones Lucide. Dados e autenticação são integrados ao Supabase (PostgreSQL, Auth e Storage). TanStack Query é usado em páginas e componentes para consultas/cache; `src/lib/useData.tsx` centraliza parte do estado e das mutações compartilhadas.

As versões concretas e scripts ficam em `package.json` e no lockfile. Documentos anteriores que mencionam React 18, Zustand ou Leaflet podem estar desatualizados; confirme dependências e imports antes de assumir uma biblioteca.

## Organização relevante

- `src/routes/`: páginas e endpoints; TanStack Router usa convenções de arquivo.
- `src/components/`: componentes reutilizáveis e UI.
- `src/hooks/`: hooks para consultas e ações.
- `src/lib/`: autenticação, estado, validações e utilitários.
- `src/integrations/supabase/`: clientes, middleware e tipos do banco.
- `supabase/migrations/`: mudanças versionadas de schema, políticas e funções.
- `context/`: visão consolidada e specs comportamentais.

## Limites entre camadas

- A interface pode validar para feedback rápido, mas autorização e invariantes críticas precisam de enforcement no servidor/banco.
- As policies RLS e funções/RPC do banco são parte do contrato de segurança.
- A tipagem gerada auxilia o desenvolvimento, mas migrations aplicadas e schema remoto determinam o estado real do banco.
- `withSingleFlight` em `src/lib/single-flight.ts` compartilha uma Promise concorrente dentro da mesma instância JavaScript. Não é lock distribuído e não substitui idempotência/constraints no banco.

## Convenções de manutenção

- Prefira helpers, hooks e padrões já usados no repositório.
- Para mutações, trate erros explicitamente, invalide/refresque consultas afetadas e forneça feedback de espera e resultado.
- Para novas invariantes entre clientes/dispositivos, prefira constraints ou operações transacionais no banco.
- Mudanças de schema devem ter migration clara e atualizações das tipagens geradas quando aplicável.
- Mudanças de comportamento devem atualizar a spec correspondente e os critérios de aceite.
