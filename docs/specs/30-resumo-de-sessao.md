# P7 — Resumo de sessão

- **Estado** — proposta para detalhar antes do Red.
- **Rastreabilidade** — MVP-03, MVP-08, MVP-12 e [P1](24-retomar-campanha.md).

Resumo opcional em texto e destaques opcionais são campos da sessão. A proposta é guardá-los como metadados no SQLite com migração aditiva e incluir ambos no mesmo rascunho protegido, confirmação e controle de versão já usados pelo editor. Cada destaque é uma linha escrita pelo usuário com referência à sessão de origem. A retomada usa o resumo confirmado ou o trecho literal atual. Uma revisão textual existente mantém sua semântica. O contrato de restauração e compatibilidade de rascunhos deve ser detalhado antes da implementação.

| ID | Critério | Teste planejado |
| --- | --- | --- |
| P7-01 a P7-04 | Resumo opcional, edição explícita, prioridade na retomada e trecho alternativo. | E2E e SQLite |
| P7-05 e P7-06 | Destaques explicitamente escritos e ausência de rascunhos na retomada. | E2E |
| P7-07 | Versão, conflito e revisões preservados. | SQLite e E2E |
| P7-08 e P7-09 | Portabilidade, lixeira e restauração refletem os dados confirmados. | SQLite |
