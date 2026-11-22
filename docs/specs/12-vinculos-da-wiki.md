# I3-05 — Vínculos manuais da sessão com a wiki

- **Estado** — implementada, com CI remoto pendente.
- **Objetivo** — relacionar uma sessão a páginas da wiki e navegar nos dois sentidos.
- **Rastreabilidade** — MVP-10 e seção 4.6 do produto.

O editor permite escolher uma página da própria campanha e registrar uma referência manual por UUID. A página mostra as sessões que a referenciam. Repetir o vínculo é seguro e o texto Markdown continua independente da referência. Campanhas arquivadas permitem navegar pelos vínculos existentes.

| ID | Resultado verificável | Teste |
| --- | --- | --- |
| I3-05a | Criar a mesma referência duas vezes gera um único vínculo; ambas as consultas mostram o título atual dos documentos. | Integração |
| I3-05b | Páginas e sessões de campanhas diferentes não podem compartilhar vínculos, e campanhas arquivadas só permitem consulta. | Integração |
| I3-05c | Criar pelo editor e navegar até a página e de volta à sessão pelo backlink. | E2E |

Edição e remoção de referências, integração com menções no Markdown, tags e busca ficam para entregas seguintes.

## Evidências de TDD

- **Red** — a primeira consulta retornou 404 e o navegador não encontrou o seletor da wiki.
- **Green** — a API e o cenário de ida e volta pelo backlink passaram.
- **Refactor** — a navegação pelo vínculo usa a mesma proteção de saída do editor que o botão de retorno. O relacionamento usa UUIDs e a tabela existente.
