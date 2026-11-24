# P9 — Navegação rápida e favoritos

- **Estado** — implementada.
- **Objetivo** — abrir campanhas e documentos com teclado, preservando o trabalho do editor.
- **Rastreabilidade** — MVP-01, MVP-06, MVP-09 e MVP-11.

## Comportamento e regras

O controle **Navegação rápida** e Ctrl/Cmd+K abrem o mesmo diálogo. A interface oferece um campo de busca, resultados de campanhas e documentos, e favoritos. Sem termo, mostra favoritos e campanhas. Ao digitar, consulta o FTS5 após uma pausa curta e filtra nomes de campanha localmente. Cada resultado identifica categoria e campanha. O controle visível atende a navegadores que reservam Ctrl/Cmd+K.

Setas selecionam, Enter abre e Escape devolve o foco. Por toque ou clique, selecione um resultado e use **Abrir selecionado**. A abertura de um resultado chama a confirmação existente de rascunho do editor. Cancelar o aviso mantém o diálogo e a sessão. Telas de cadastro, importação, anotações rápidas, wiki e pendências conservam sua própria navegação para proteger formulários transitórios.

A V15 cria `document_favorites` com documento e marcação ativa/inativa. Um favorito não altera a versão de edição do documento. Sessões na lixeira somem das consultas de favoritos e reaparecem ao restaurar. Favoritos usam a campanha do documento e podem ser desmarcados. O ZIP inclui as marcações ativas dos documentos consultáveis. A cópia SQLite mantém todas as marcações.

`GET /api/search?q=...&prefix=true` reutiliza o índice atual e limita termos e resultados. `GET /api/favorites` lista favoritos consultáveis. `PUT /api/campaigns/:campaignId/favorites/:id` define `favorite` de forma idempotente e valida o escopo do documento.

## Critérios de aceitação e testes

| ID | Critério | Teste |
| --- | --- | --- |
| P9-01 e P9-02 | Atalho e controle abrem a mesma interface. | E2E |
| P9-03 | Reutilizar o FTS5 com consulta por prefixo. | SQLite |
| P9-04 a P9-06 | Selecionar pelo teclado, abrir e restaurar foco com Escape. | E2E |
| P9-07 | Distinguir resultados homônimos. | E2E |
| P9-08 | Respeitar o aviso de rascunho. | E2E |
| P9-09 | Favoritos persistem, são reversíveis e ficam no escopo da campanha. | SQLite e E2E |
| P9-10 | Operar em tela estreita e com teclado. | E2E |

## Dependências e limitações

Reutiliza a busca, a abertura de resultados e a confirmação do editor. Favoritos iniciais cobrem sessões e páginas da wiki.


## Evidências de TDD

- **Red** — a busca rejeitou o parâmetro de prefixo, a migração ainda não existia e a interface não oferecia navegação rápida.
- **Green** — o E2E operou com teclado e controle visível em 320 pixels, distinguiu homônimos e respeitou o aviso de rascunho. Os testes SQLite confirmaram persistência, isolamento, exportação e restauração de favoritos da lixeira.
- **Refactor** — a ação do editor e a navegação rápida chamam a mesma confirmação. A lista reutiliza os nomes de categoria da busca e permite selecionar também por toque.
