# Contexto do Tech QuickOps

Este diretório reúne o contexto funcional e técnico que deve orientar manutenção e novas melhorias. Consulte-o antes de alterar fluxos importantes; atualize os documentos relevantes na mesma mudança que altera uma regra ou arquitetura.

## Mapa

- [Visão do produto](./01-produto.md) — usuários, módulos e objetivos.
- [Arquitetura e tecnologia](./02-arquitetura.md) — stack, organização do código e limites entre camadas.
- [Segurança e permissões](./03-seguranca.md) — autenticação, papéis, isolamento por empresa e RLS.
- [Regras de negócio](./04-regras-de-negocio.md) — OS, faturamento, comissões e pagamentos de técnicos.
- [Banco de dados](./05-banco-de-dados.md) — entidades principais, relações, migrations e fonte de verdade do schema.
- [Fluxos operacionais](./06-fluxos-operacionais.md) — ciclo da OS, RAT, pagamentos e estados de carregamento.
- [Integrações e serviços externos](./07-integracoes.md) — Supabase, arquivos, notificações, e-mail e comunicação.
- [Interface e experiência](./08-interface-e-experiencia.md) — princípios de UX e comportamento esperado de ações assíncronas.
- [Especificação e processo de mudança](./09-spec-driven.md) — como propor, implementar e validar mudanças.

## Como interpretar

- Os documentos distinguem **comportamento confirmado**, **regra documentada que requer conferência** e **pendência/decisão**.
- O código e o schema efetivamente aplicado são a fonte de verdade para o comportamento atual. Este contexto explica a intenção conhecida e não substitui testes, migrations ou políticas no Supabase.
- `src/integrations/supabase/types.ts` é tipagem gerada para o cliente, não prova de que uma migration já foi aplicada ao banco remoto.
- Specs de funcionalidades específicas ficam em `context/specs/` e incluem critérios de aceite.
- O changelog explica o que foi anunciado/entregue; não substitui regras, arquitetura ou critérios de aceite.
- Ao encontrar divergência, corrija a documentação na mesma mudança ou registre claramente a pendência. Não transforme uma hipótese em regra.

## Atualização

1. Leia este índice e os documentos da área afetada.
2. Confirme fatos no código, migrations e políticas vigentes.
3. Atualize uma spec quando houver mudança de comportamento.
4. Atualize as páginas de contexto afetadas quando uma regra geral, integração ou arquitetura mudar.
5. Valide os critérios da spec e registre o que não foi possível verificar.
