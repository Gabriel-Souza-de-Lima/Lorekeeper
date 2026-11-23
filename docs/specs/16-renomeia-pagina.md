# I3-09 — Renomear páginas vinculadas

- **Estado** — implementada, com CI remoto pendente.
- **Objetivo** — corrigir o título de uma página e continuar encontrando as sessões relacionadas.
- **Rastreabilidade** — MVP-10 e MVP-11.

| ID | Critério | Teste |
| --- | --- | --- |
| I3-09a | Renomear preserva UUID, corpo, vínculos, tags e rótulos Markdown; a busca passa a usar o título novo. | Integração |
| I3-09b | Campanhas arquivadas, títulos vazios e páginas de outra campanha são rejeitados; uma alteração concorrente não é sobrescrita. | Integração |
| I3-09c | A interface renomeia e permite percorrer a menção original, o backlink e o resultado da busca com o nome novo. | E2E |

O título original serve de condição da gravação. Repetir uma gravação já aplicada devolve o estado atual. Ao detectar conflito, a interface conserva o texto proposto e permite consultar o título atual antes de reenviar.

## Evidências de TDD

- **Red** — a rota de alteração retornou 404 e o navegador não encontrou a ação de renomear.
- **Green** — o teste integrado confirmou a preservação das relações; o E2E navegou pela menção original e pela busca atualizada.
- **Refactor** — o teste de navegador também exercita o conflito e confirma que a proposta permanece editável após consultar o título atual.
