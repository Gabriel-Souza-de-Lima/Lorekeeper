# I3-08 — Busca global

- **Estado** — implementada, com revisão de integração pendente.
- **Objetivo** — recuperar documentos por título e conteúdo, inclusive de campanhas arquivadas.
- **Rastreabilidade** — MVP-11 e seção 4.7 do produto.

| ID | Critério | Teste |
| --- | --- | --- |
| I3-08a | Buscar palavras sem distinguir acentos. Combinar filtros de campanha, categoria e tag e devolver trecho com destaque. | Integração |
| I3-08b | A busca reflete gravações e restaurações de texto, e inclui campanhas arquivadas. | Integração |
| I3-08c | A migração indexa o acervo anterior e reverte integralmente caso não possa instalar todos os gatilhos. | SQLite |
| I3-08d | Buscar no painel, aplicar filtros e abrir um resultado no contexto da campanha. | E2E |

A busca exige palavras e combina todos os termos. Pontuação não funciona como sintaxe FTS. A relevância privilegia o título. A API retorna até 50 resultados com destaque estruturado como texto. Notas sem campanha também aparecem na busca global.

## Evidências de TDD

- **Red** — a API retornou 404, a migração V8 estava ausente e o navegador não encontrou a busca.
- **Green** — os testes focados confirmam a busca, a atualização do índice e a abertura do editor.
- **Refactor** — filtros usam rótulos explícitos e o destaque é renderizado como texto. O índice deriva dos documentos e acompanha as alterações na mesma transação.
