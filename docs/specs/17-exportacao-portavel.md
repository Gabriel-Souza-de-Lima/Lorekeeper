# I4-01 — Exportação portátil

- **Estado** — implementada, com revisão de integração pendente.
- **Objetivo** — abrir, fora do Lorekeeper, o acervo salvo no servidor.
- **Rastreabilidade** — MVP-12, controle dos dados no produto e exportação na arquitetura.

| ID | Critério | Teste |
| --- | --- | --- |
| I4-01a | O painel baixa um ZIP com `lorekeeper.json` versionado e um arquivo Markdown UTF-8 por documento. | Integração e E2E |
| I4-01b | O acervo inclui campanhas arquivadas e notas na caixa, além dos IDs, metadados, tags, vínculos e revisões. A exportação lê um único instantâneo consistente. | Integração SQLite |
| I4-01c | O ZIP abre com ferramentas comuns e os caminhos dos arquivos são seguros mesmo com títulos que contêm separadores. | Integração |

O JSON usa `formatVersion: 1`. As coleções preservam as chaves relacionais conforme o esquema descrito abaixo. Cada documento informa seu caminho em `markdownPath`. O arquivo Markdown contém o corpo original, sem cabeçalho, e mantém os rótulos e referências internas. O JSON preserva o histórico de sessões e as relações com UUIDs. Índices de busca, comprovantes de reenvio e rascunhos locais são dados operacionais fora do formato de exportação. O backup SQLite e a restauração são entregas separadas.

A API entrega o ZIP para download na rede privada com `Cache-Control: no-store`. Nesta versão, a montagem do ZIP usa memória proporcional ao acervo.


## Formato do arquivo

| Entrada ou chave | Conteúdo |
| --- | --- |
| `lorekeeper.json` | Objeto UTF-8 com `formatVersion`, `exportedAt` em UTC e as coleções abaixo. |
| `documents/<id>.md` | Corpo Markdown em UTF-8. O nome usa o ID codificado e a propriedade `markdownPath` registra o caminho exato. |
| `campaigns`, `documents` | Identidades e metadados da campanha e do documento. O JSON inclui o corpo original e o estado de arquivamento da campanha. `campaign_id: null` identifica nota da caixa. |
| `sessions`, `sessionRevisions` | Metadados da sessão e versões do texto, relacionadas por `document_id`. |
| `links`, `tags`, `documentTags` | Vínculos direcionais com origem e associações de tags por IDs. |
| `pendingItems`, `pendingItemEntities`, `pendingItemStates` | Pendências, entidades vinculadas e estados em ordem de gravação. Uma sessão na lixeira é representada com `session_id: null` no ZIP. O backup SQLite mantém o vínculo original. |
| `attachments/<id>.png`, `attachments/<id>.pdf` | Bytes originais de um anexo com ao menos um vínculo consultável. O caminho é gerado pelo UUID e MIME. |
| `attachments`, `attachmentAssociations` | Metadados com `path`, tamanho e SHA-256, além dos vínculos ativos. O ZIP omite vínculos removidos e sessões na lixeira. O backup conserva os dados omitidos. |

## Evidências de TDD

- **Red** — a API retornou 404 e o navegador não encontrou a ação de exportar.
- **Green** — o teste abriu o ZIP e comparou o Markdown, o JSON e suas relações com os dados fictícios.
- **Refactor** — o E2E verifica o evento de download. Os cabeçalhos e os bytes do ZIP foram verificados na integração.
