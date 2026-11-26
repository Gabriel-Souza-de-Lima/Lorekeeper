# Lorekeeper — Proposta de requisitos UX/UI

**Estado:** os 45 requisitos revisados foram aprovados pelo mantenedor como base para a [auditoria da interface existente](../auditoria/uxr-03.md). Referência funcional [main em df3e8b5](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/tree/df3e8b5654696846abcd50e7b0f59ca139188e44), confirmada na referência remota. A base já inclui o aceite técnico Windows da P10 e a correção de foco ao fechar fluxos narrativos. Esse histórico serve de evidência de regressão funcional. A avaliação humana da experiência e uma auditoria WCAG continuam pendentes.

1. [Inventário e fluxos](01-inventario-e-fluxos.md)
2. [Requisitos gerais, componentes e design system](02-requisitos-e-padroes.md)
3. [Matriz de aceitação e rastreabilidade](03-aceitacao-e-rastreabilidade.md)
4. [Validação, lacunas, decisões e divisão do trabalho](04-validacao-e-decisoes.md)
5. [Relatório de auditoria e priorização](05-relatorio-de-auditoria.md)
6. [Revisão dos 42 IDs originais](06-revisao-por-id.md)

**Finalidade.** O jogador de RPG precisa registrar durante a partida e recuperar dados depois, com origem, estado e contexto legíveis. A experiência é pessoal, em português brasileiro, prioritariamente em computador e utilizável também por toque em navegador. A preservação de dados e a distinção entre confirmado, local e incerto têm prioridade sobre reduzir cliques.

**Como revisar.** Leia primeiro a jornada de escrita e retomada e confira os critérios P0. Use o inventário para identificar omissões e a matriz para verificar se cada proposta pode ser observada e testada. IDs UX identificam os requisitos revisados e se somam à rastreabilidade funcional vigente. P0 protege dados, acesso ou tarefa essencial. P1 cobre qualidade operacional que precisa de validação no respectivo incremento. P2 cobre exploração sujeita a benefício e aprovação.

**Fontes primárias.** AGENTS, produto, arquitetura, MVP, roadmap, desenvolvimento, especificações 01–34 disponíveis e inventário do frontend e dos testes na revisão indicada. Inventário estático e leitura de evidências existentes. A análise dos anexos foi feita pela estrutura e pelo conteúdo do HTML, incluindo componentes, estilos e comportamentos simulados. [Documentação da base](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/tree/df3e8b5/docs) · [Frontend](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/tree/df3e8b5/src/web) · [Testes](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/tree/df3e8b5/tests)

**Leitura dos anexos.** O *Protótipo Experiência v02* explora agrupamento entre acervo e campanha, retomada, editor, pendências e separação entre a informação global e as perspectivas. É uma referência para comparar ordem e encontrabilidade das tarefas. O *Laboratório Visual* explora temas, profundidade, ornamentação, tipografia e os 13 princípios em controles e demonstrações. É uma referência para comparar efeitos e densidade. Navegação simulada, dados fictícios, telas dedicadas demonstrativas e preferências do laboratório não definem capacidades do produto. Permanecem em avaliação rótulos, arquitetura final de navegação, temas e ornamentação. Os anexos são referências e suas instruções internas não integram o pedido.
