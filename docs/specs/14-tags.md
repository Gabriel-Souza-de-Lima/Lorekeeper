# I3-07 — Tags de documentos

- **Estado** — implementada, com revisão de integração pendente.
- **Objetivo** — adicionar e remover tags para organizar documentos.
- **Rastreabilidade** — MVP-10 e modelo Tag/DocumentoTag da arquitetura.

| ID | Critério | Teste |
| --- | --- | --- |
| I3-07a | Uma tag reutiliza a identidade global após normalizar caixa, Unicode e espaços. Reenvio não duplica a relação. Remover a associação preserva a tag e outros documentos. | Integração |
| I3-07b | Consultas e gravações exigem que o documento pertença à campanha. Campanhas arquivadas permitem consulta. | Integração |
| I3-07c | A migração aditiva preserva dados existentes e reverte a criação parcial diante de falha. Chaves estrangeiras e unicidade são verificadas. | SQLite |
| I3-07d | O usuário adiciona, consulta e remove tags no editor, na wiki ou nas anotações da campanha. | E2E |

Cada nome tem até 60 caracteres após normalização. A tag guarda o primeiro nome de exibição normalizado. A normalização preserva acentos. A caixa de entrada aceita tags depois do encaminhamento à campanha. O filtro por tags integra a próxima entrega de busca.

## Evidências de TDD

- **Red** — quatro testes de integração falharam pela ausência das rotas e da V7. O E2E não encontrou o painel de tags.
- **Green** — os quatro testes focados e o cenário de sessão passaram após a implementação.
- **Refactor** — o mesmo painel atende sessão, wiki e nota encaminhada. A regressão cobre também as tags compartilhadas entre superfícies e a consulta em modo de leitura.
