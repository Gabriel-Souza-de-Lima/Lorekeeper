# P10-B — Perspectivas e conhecimento dos personagens

- **Estado** — proposta posterior, com aprovação própria. Critérios e testes planejados.
- **Objetivo** — consultar o que o jogador e cada personagem souberam, quando souberam e quais evidências conheceram.
- **Dependência** — [P10-A](33-fatos-rumores-e-teorias.md) integrada e validada. Esta etapa acrescenta atribuições em relação aos UUIDs de informações e evidências da P10-A.

## Regras e experiência propostas

O acervo reúne informações registradas. Uma marcação explícita indica conhecimento do jogador. Sem essa marca ou atribuições a personagens, o conhecimento fica **Ainda não definido**. O rótulo **Somente o jogador** exige marcação positiva do jogador e declaração explícita de ausência de personagens conhecidos. Uma atribuição a um personagem deixa o estado do jogador independente. Dois ou mais personagens têm atribuições individuais. Marcar um personagem preserva as atribuições dos demais.

No detalhe da informação, **Perspectivas** oferece registro explícito de descobertas. A consulta **O que Marina sabe** mostra as informações atribuídas a Marina e as evidências que ela conhece. Exemplo fictício. Marina ouviu o rumor sobre o farol na sessão 4. O jogador registrou uma refutação na sessão 7. A vista de Marina continua mostrando que ela ouviu a afirmação. Ela passa a mostrar a contestação quando alguém a conta à personagem, e indica conhecimento da refutação somente após vínculo explícito à evidência correspondente.

## Modelo mínimo para avaliação

Uma relação por informação e sujeito, com o sujeito sendo jogador ou personagem existente da mesma campanha. Cada descoberta acrescenta um registro à perspectiva com tipo **Ouviu a afirmação**, **Soube da contestação** ou **Conheceu evidência**. O terceiro tipo exige o UUID da evidência e mostra se ela sustenta, contradiz ou contextualiza a afirmação. O registro contém instante real, sessão e data ficcional opcionais e origem manual ou vinculada. As descobertas compõem uma sequência, inclusive quando uma evidência é conhecida antes de alguém comunicar formalmente uma contestação. O sistema mostra o que se conhece e deixa a crença do personagem para interpretação do usuário.

Um campo explícito de cobertura na informação indica se o conjunto de personagens conhecidos é indeterminado ou foi declarado vazio. Acrescentar atribuições substitui a declaração de vazio, preservando seu registro histórico. O modelo mantém descobertas anteriores ao corrigir a perspectiva, usa o controle de concorrência aprovado para a etapa e conserva fontes arquivadas ou na lixeira. O escopo é individual. Grupos, facções, compartilhamento automático, inferência, regras automáticas de metagaming, grafos e IA ficam fora do recorte inicial.

## Matriz de critérios e testes planejados

| ID | Comportamento e cenário principal | Alternativa e falha | Dependência | Nível e evidência esperada |
| --- | --- | --- | --- | --- |
| P10-03 | Registrar descoberta e consultar jogador, um personagem e vários personagens. | Data ficcional ausente é válida. Personagem ou evidência de outra campanha é rejeitado. | P10-A, wiki de personagens | SQLite e E2E com perspectivas distintas, origem e filtros após recarregar. |
| P10-13 | Um registro sem atribuição apresenta conhecimento ainda não definido. | Marcação explícita permite mostrar somente o jogador. Campo ausente em dados antigos mantém o estado indefinido. | P10-03, regra de cobertura | Unitário e SQLite com combinações indefinido, jogador, um e mais personagens. |
| P10-15 | Preservar a sequência em que o personagem ouviu, soube da contestação e conheceu a evidência. | A refutação global muda enquanto a perspectiva permanece igual. UUID de evidência inválido ou conflito deixa o histórico intacto. | P10-03 e P10-A/P10-07 | SQLite e E2E com sequência, comparação entre perspectivas e recuperação após reabrir. |
| P10-16 | Exportar e restaurar atribuições, fontes e descobertas. | Sessão da descoberta na lixeira mantém sua captura. Falha de restauração preserva a origem. | P10-15 e portabilidade | ZIP e SQLite com restauração isolada e comparação de IDs. |

Durante a implementação futura, o ciclo Red → Green → Refactor produzirá evidências para cada critério. A captura adicional durante o jogo pode aumentar a carga de cadastro, por isso as perspectivas ficam no detalhe e aceitam completar dados posteriormente.

## Decisões que exigem aprovação do mantenedor

| Decisão | Alternativas e consequências | Recomendação |
| --- | --- | --- |
| Conhecimento do jogador | Inferir pela existência no acervo reduz cliques e confunde registro com conhecimento. Marcação explícita mantém os significados separados. | Usar marcação explícita e só mostrar «somente o jogador» após declaração de cobertura vazia. |
| Evolução individual | Guardar apenas uma etiqueta atual simplifica consultas e perde a ordem de descobertas. Eventos específicos preservam a sequência com poucas categorias. | Registrar as três categorias propostas por sujeito. Deferir crenças formais e perspectivas de grupos. |
