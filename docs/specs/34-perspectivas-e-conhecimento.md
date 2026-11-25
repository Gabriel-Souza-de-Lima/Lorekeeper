# P10-B — Perspectivas e conhecimento dos personagens

- **Estado** — implementação autorizada. Integração acompanhada pelo check obrigatório.
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

A captura adicional durante o jogo pode aumentar a carga de cadastro, por isso as perspectivas ficam no detalhe e aceitam completar dados posteriormente.

## Decisões adotadas

| Decisão | Alternativas e consequências | Decisão |
| --- | --- | --- |
| Conhecimento do jogador | Inferir pela existência no acervo reduz cliques e confunde registro com conhecimento. Marcação explícita mantém os significados separados. | Usar marcação explícita e só mostrar «somente o jogador» após declaração de cobertura vazia. |
| Evolução individual | Guardar apenas uma etiqueta atual simplifica consultas e perde a ordem de descobertas. Eventos específicos preservam a sequência com poucas categorias. | Registrar as três categorias propostas por sujeito. Deferir crenças formais e perspectivas de grupos. |


## Implementação V17

- `perspective_heads` guarda versão e cobertura por informação. Informações legadas começam na versão zero, com cobertura indefinida e sem linhas de atribuição.
- `perspective_events` registra a descoberta ou declaração de cobertura, com ordem pela versão. Cada descoberta mantém enunciado observado, personagem ou jogador, UUID de evidência quando aplicável, sessão com título capturado, nota, data ficcional opcional e instante de gravação. Uma correção aponta para o evento anterior. O histórico global mostra os dois registros e a consulta específica usa as atribuições vigentes.
- `perspective_receipts` guarda o resultado por UUID da operação. Cabeça, evento e comprovante são transacionais. A falha em qualquer gravação reverte as demais.

O vínculo de evidência usa a chave composta campanha, informação e UUID. O personagem usa o documento existente do tipo `character`. Uma sessão na lixeira preserva a captura e volta a ser navegável após restaurar.

## Contratos

- `GET /api/campaigns/:campaignId/information/:id/perspectives` devolve versão, cobertura, marcação do jogador e histórico.
- `PUT` no mesmo caminho recebe versão e descoberta ou declaração de cobertura. Exige `Idempotency-Key`. Chave igual com conteúdo igual recupera o resultado anterior. Versão atrasada ou chave reutilizada com outro conteúdo retorna 409.
- `GET /api/campaigns/:campaignId/perspectives?characterId=...` devolve as descobertas vigentes atribuídas ao personagem. Omitir o filtro consulta o jogador. A resposta contém somente evidências conhecidas por esse sujeito. O acesso ao detalhe global é explícito.

A área **Perspectivas** fica no detalhe da informação. **Consultar conhecimento** abre uma vista separada da ficha global. O formulário compartilha a infraestrutura de IndexedDB e travas da P10-A, com banco local próprio e confirmação manual. Ao perder a resposta, guarda o envelope exato e oferece reenvio. Em conflito, mantém a edição e pede comparação com a versão atual. Na falha local, mantém a edição em memória e oferece download do rascunho.

## Evidências Red → Green → Refactor

- **Red** — a API devolveu 404, o banco legado continuou na V16 e o navegador não encontrou Perspectivas.
- **Green** — os testes confirmaram marcação explícita, cobertura indefinida, correção histórica, concorrência, isolamento e reenvio. As consultas mantiveram a evidência específica conhecida após correção na P10-A.
- **Refactor** — ambas as áreas usam as mesmas primitivas de rascunho, em bancos locais separados. A consulta usa a mesma regra de descobertas vigentes do detalhe. A regressão cobre falha de gravação, fontes na lixeira e restauração isolada.

Testes em `tests/unit/perspectives.test.ts`, `tests/integration/perspectives.test.ts` e `tests/e2e/perspectives.spec.ts`. Os comprovantes permanecem no SQLite pelo ciclo de vida do registro. A validação manual de P10-A e P10-B no Windows é a próxima etapa.


### Ensaio manual no Windows

Usar uma cópia isolada do banco. Criar uma informação fictícia com uma evidência global, registrar uma descoberta para um personagem e conferir que outro personagem só vê suas próprias atribuições. Repetir após recarregar o editor, simular desconexão e verificar reenvio. Arquivar ou mover a origem para a lixeira e restaurá-la. Conferir o ZIP e restaurar um backup em outro caminho para verificar fontes e descobertas.
