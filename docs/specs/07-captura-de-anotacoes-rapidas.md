# I3-01 — Captura de anotações rápidas

**Escopo:** MVP-08; captura e consulta da caixa de entrada. A vinculação posterior, a interface, a wiki, as tags e a busca são entregas subsequentes do Incremento 3.

| Critério | Cenário verificável | Teste |
| --- | --- | --- |
| I3-01a | Criar uma anotação só com texto e reencontrá-la após reiniciar. A sessão e a campanha continuam independentes da caixa de entrada. | Integração |
| I3-01b | Repetir a captura com o mesmo UUID e texto devolve a anotação original. O mesmo UUID com outro texto resulta em conflito e um texto vazio é rejeitado. | Integração |
| I3-01c | A migração preserva anotações de sessões, revisões, comprovantes e relações do SQLite V2. | Integração com banco legado |

O cliente fornece um UUID para manter o mesmo identificador em tentativas de captura. `POST /api/quick-notes` aceita `id` e `body`; responde 201 na criação, 200 no reenvio equivalente e 409 em colisão. Preservar o Markdown enviado e rejeitar texto composto só por espaços. A listagem `GET /api/quick-notes` devolve apenas anotações rápidas ainda sem campanha, das mais recentes às mais antigas. O título sugerido é a primeira linha não vazia, limitando o tamanho de exibição. O corpo continua íntegro.

A migração amplia o tipo de documento e permite campanha nula para anotações rápidas. A substituição da tabela ocorre em uma transação, com verificação das chaves estrangeiras e rollback em erro. Manter a migração em revisão separada da integração automática.

## Evidências de implementação

- **Red** — a criação retornou 404 antes da validação do texto e a listagem não existia para o banco legado.
- **Green** — a criação e a listagem passaram com SQLite em disco. A mesma captura pôde ser reenviada após reiniciar. A migração preservou a sessão e suas relações.
- **Refactor** — a captura e consulta da caixa de entrada ficaram separadas das rotas de sessões. A migração agora reconfirma a versão após obter o lock e reverte a troca de tabela quando a verificação das relações falha.

## I3-02 — Interface da caixa de entrada

- I3-02a. A partir do painel, abrir Anotações rápidas, digitar sem escolher campanha, guardar e ver a nota na caixa de entrada. Ao reabrir a aplicação, a nota continua disponível.
- I3-02b. Guardar o rascunho localmente antes do envio. Se a resposta se perder, reabrir o editor com o mesmo texto e repetir o mesmo UUID. O texto fica congelado até o servidor confirmar a captura. Uma segunda aba pode consultar a caixa, enquanto a primeira mantém a posse do rascunho.
- I3-02c. Uma falha de armazenamento é visível e oferece download do texto. O editor indica quando a gravação permanece pendente.
- A associação a campanhas ou sessões e a busca pertencem às etapas seguintes. O rascunho usa armazenamento local do navegador e uma trava por origem.

### Evidências de I3-02

- **Red** — os testes de navegador falharam ao procurar a ação Anotações rápidas no painel.
- **Green** — a captura funciona sem campanha. Com perda da resposta após o POST, a caixa lista a nota confirmada e permite recuperar o rascunho e reenviar o UUID original sem duplicá-la. Uma falha local oferece download.
- **Refactor** — o rótulo do campo permanece estável com texto preenchido e uma listagem antiga não substitui o estado após salvar. A regressão também cobre outra aba consultando a caixa enquanto o editor está ocupado.

Na regressão C01/C02/C03/S01/S02, o trace mostrou um salvamento com o título padrão depois da tentativa de alterá-lo. O editor de sessões agora posiciona o foco antes de permitir a interação, e o teste verifica o valor preenchido antes de enviar.

## I3-03 — Encaminhamento para uma campanha (API)

- I3-03a. Uma anotação sem campanha pode ser encaminhada a uma campanha ativa. Ela sai da caixa geral, aparece na listagem da campanha e preserva identificador, título e texto.
- I3-03b. Repetir o encaminhamento para a mesma campanha confirma a operação. Um segundo destino, uma campanha arquivada ou uma campanha inexistente não alteram a associação. O fluxo de transferência entre campanhas segue como decisão posterior.
- I3-03c. Listagens de campanhas diferentes não se misturam. A campanha arquivada conserva as anotações para consulta. Sessões e suas contagens continuam independentes.
- Testes de integração usam o SQLite real e verificam os três comportamentos. A API usa `PUT /api/quick-notes/:noteId/campaign` com `campaignId` e `GET /api/campaigns/:campaignId/quick-notes`. A interface de encaminhamento e a vinculação a sessões são entregas posteriores.

### Evidências de I3-03

- **Red** — encaminhar para uma campanha arquivada retornava 404 porque a rota ainda não existia.
- **Green** — o teste de integração confirma a transferência inicial, reenvio, rejeição de destinos inválidos e isolamento da consulta.
- **Refactor** — captura e encaminhamento compartilham a construção de esquemas de entrada. O encaminhamento usa o mesmo formato canônico de UUID da captura. O esquema SQLite permanece na V3.
