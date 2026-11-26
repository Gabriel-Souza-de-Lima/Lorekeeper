# Lorekeeper — Documentação de UX/UI

**Os 45 requisitos revisados foram aprovados pelo mantenedor como base para a auditoria da interface existente.**

Esta área reúne os requisitos de experiência, interação e consistência visual, do MVP à P10. Para retomar o assunto em uma conversa com acesso ao repositório, comece por `docs/ux-ui/README.md`. A UXR-02 é a referência de requisitos para a auditoria. As [especificações funcionais](../specs/README.md) continuam sendo a referência para o comportamento do produto.

## Ordem de leitura

1. [Contexto e fontes da UXR-02](revisada/README.md)
2. [Inventário e fluxos](revisada/01-inventario-e-fluxos.md)
3. [Requisitos, padrões de interação e princípios do Design System](revisada/02-requisitos-e-padroes.md)
4. [Matriz de aceitação e rastreabilidade vigente](revisada/03-aceitacao-e-rastreabilidade.md)
5. [Estratégia de validação e decisões pendentes](revisada/04-validacao-e-decisoes.md)
6. [Relatório dos 13 achados](revisada/05-relatorio-de-auditoria.md) e [revisão individual dos 42 IDs originais](revisada/06-revisao-por-id.md)

7. [UXR-03 — Auditoria da interface existente e matriz de conformidade](auditoria/uxr-03.md)

8. [UXR-04 — Arquitetura de informação e protótipo navegável](prototipos/README.md)

9. [UXR-05 — Arquivo Narrativo Vivo e decisões conceituais](prototipos/uxr-05.md)

10. [Design System Codex — referência selecionada e plano incremental](design-system-codex.md)

## Histórico e rastreabilidade

A [UXR-01 original](historico/uxr-01-proposta-original/README.md) preserva as 19 superfícies, os oito contextos e os 42 requisitos levantados. Sua matriz é histórica. Para comparar uma mudança, procure o mesmo ID na [matriz original](historico/uxr-01-proposta-original/03-aceitacao-e-rastreabilidade.md), na revisão individual e na matriz vigente. O relatório AUD identifica evidência, severidade e correção proposta. A matriz vigente detalha funcionalidades afetadas, método e evidência necessária.

Os 42 IDs originais são classificados na revisão individual como **Manter**, **Revisar** ou **Condicionar**. A UXR-02 acrescenta **UX-G13**, **UX-G14** e **UX-G15**. O aceite de cada requisito é avaliado separadamente na matriz de conformidade.

## Estados e próximos passos

| Estado | Significado |
| --- | --- |
| Levantado | Registrado como proposta inicial. |
| Revisado | Conferido documentalmente, com ajustes propostos ou manutenção do texto. |
| Aprovado | Aceito explicitamente pelo mantenedor com escopo definido. |
| Implementado | Entregue em código e rastreado ao critério correspondente. |
| Validado | Evidência de aceitação registrada para o contexto e método aplicáveis. |

A UXR-03 registrou as evidências da interface atual. O mantenedor aprovou o diagnóstico da UXR-03 e autorizou a prototipação. A UXR-04 foi entregue e o mantenedor aprovou sete padrões de experiência no plano conceitual. O mantenedor aprovou a UXR-05, o Design System Codex e as decisões de experiência, incluindo destinos, navegação móvel, perspectivas, ambientes, tipografia híbrida e tema único. A implementação autorizada se limita à [UXR-06.1](../specs/35-uxr-06-1-fundamentos-codex.md). As lacunas incluem usabilidade por tarefa, leitores de tela, acessibilidade, toque, teclado virtual, dispositivos reais e avaliação estética humana. Consulte o [ciclo no roadmap](../ROADMAP.md#ciclo-de-uxui) para acompanhar as etapas. O aceite documental e o CI têm escopos diferentes da aprovação estética ou da conformidade WCAG 2.2 AA.
