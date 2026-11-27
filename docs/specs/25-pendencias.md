# P2 — Pendências e pistas

A interface vigente divide pendências em Abertas e Fechadas, oito por página. A visão geral traz até três abertas. A leitura, criação e edição têm telas próprias com retorno à guia e página quando possível. Os rótulos vigentes são Aberta, Em andamento, Concluída e Cancelada. [Apresentação Phandelver V2](40-phandelver-v2.md)


- **Estado** — aprovado na validação local do Windows.
- **Objetivo** — acompanhar perguntas, pistas, promessas e tarefas sem alterar o modelo de missões.
- **Rastreabilidade** — Pós-MVP P2 e produto §4.10.

## Regras e contrato

A campanha é a unidade de isolamento. Apenas o título é obrigatório. A criação aceita descrição, origem, sessão de origem, IDs de NPCs e localidades e observações. O estado inicial é aberto. A API de estado recebe estado anterior e novo para detectar concorrência, e registra as transições. Uma campanha arquivada pode ser consultada. A sessão de origem na lixeira conserva sua relação; sua navegação volta após restauração.

A consulta por campanha oferece todos os estados e filtro de pendências abertas ou em investigação. Esse acesso contextual atende à descoberta nesta entrega. O painel de retomada usa a mesma consulta para pendências atuais.

## Critérios

| ID | Critério | Teste |
| --- | --- | --- |
| P2-01 | Criar na campanha com título e campos opcionais. | SQLite + E2E |
| P2-02 | Registrar sessão e entidades relacionadas. | Integração |
| P2-03 | Mudar estado, guardar a transição e rejeitar alteração concorrente. | Integração |
| P2-04 | Consultar pendências abertas da campanha. | Integração |
| P2-05 | Encontrar na navegação contextual, incluindo resolvidas. | E2E |
| P2-06 | Navegar a partir do painel de retomada. | E2E |
| P2-07 | Preservar IDs em renomeações, arquivamento, exportação e restauração. | SQLite + API |
| P2-08 | Rejeitar vínculos entre campanhas sem gravar parte da solicitação. | Integração |

A migração deve ser aditiva e ter testes de preservação, integridade e rollback. A exportação normal deve preservar os registros e históricos, omitindo vínculos navegáveis a sessões que estejam na lixeira. O backup SQLite conserva todos os registros. 

## API

- `GET /api/campaigns/:campaignId/pending-items` lista os registros. `?open=true` inclui os estados aberto e em investigação.
- `POST` no mesmo caminho recebe UUID e título. Campos opcionais aceitos são `type`, `description`, `origin`, `notes`, `sessionId` e `entityIds`. Repetir o UUID com o mesmo conteúdo recupera a pendência existente.
- `GET /api/campaigns/:campaignId/pending-items/:id` lê os detalhes, as entidades e o histórico em uma transação.
- `PATCH /api/campaigns/:campaignId/pending-items/:id/state` recebe `previous` e `state`. Se o estado já for o desejado, retorna a pendência sem acrescentar outra transição. Se divergir do estado anterior e do desejado, retorna 409.

A migração V10 cria `pending_items`, `pending_item_entities` e `pending_item_states` em uma única transação. O formato de exportação mantém a versão 1 e acrescenta coleções opcionais. [Formato portátil](17-exportacao-portavel.md)

## Evidências de TDD

- **Red** — a rota ainda retornava 404, a migração V10 não existia, o ZIP não incluía as novas coleções e o navegador não encontrava a ação de pendências.
- **Green** — os testes verificam o cadastro, o isolamento, o histórico, a navegação e as coleções no ZIP.
- **Refactor** — a leitura de detalhes usa uma transação e o painel usa o mesmo endpoint da consulta contextual, com filtro de estados ativos.

## Validação local no Windows

Revisão `523a5f8`. [PR #50](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/50) · [CI pós-merge aprovado](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45240842135)

**Aprovado (P2-01 a P2-08).** A navegação criou pista, pergunta, promessa e tarefa, com sessão de origem e NPC, e exibiu os vínculos. A pista passou por **Em investigação** e **Resolvida**, com histórico. A retomada mostrou registros abertos e a listagem geral manteve a pista resolvida. A API rejeitou vínculo externo com 404 e transição concorrente com 409. Após reinício do servidor sobre o mesmo SQLite temporário, a leitura da pendência devolveu os mesmos dados e histórico. Exportação, restauração, isolamento e migração foram exercitados pela integração. A interface permite atualizar o estado; a edição posterior de título, descrição, origem, observações e vínculos está fora do fluxo implementado. [Integração](../../tests/integration/pending-items.test.ts) · [E2E](../../tests/e2e/pending-items.spec.ts)

