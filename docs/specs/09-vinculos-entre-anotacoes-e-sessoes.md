# I3-02 — Vínculos entre anotações rápidas e sessões

- **Estado** — implementada na API e no editor de sessão.
- **Objetivo** — preservar uma anotação rápida como documento independente e recuperá-la a partir de uma sessão relacionada.
- **Rastreabilidade** — MVP-08, MVP-10 e vínculos manuais da arquitetura.

## Comportamento e regras

A API lista os backlinks de uma sessão e permite adicionar ou remover um vínculo manual por identificador estável. Vincular uma nota da caixa de entrada a atribui à campanha da sessão na mesma transação. Uma nota pode referenciar várias sessões da mesma campanha. Repetições são idempotentes. Ao remover o vínculo, a nota continua na campanha com o texto preservado. Campanhas arquivadas permitem leitura e bloqueiam alterações.

## Cenários e critérios de aceitação

| ID | Dado | Quando | Então | Teste de integração |
| --- | --- | --- | --- | --- |
| I3-02a | Nota na caixa e sessão ativa | Vincular, repetir, reabrir e desvincular | A nota passa para a campanha, aparece uma vez na sessão e sobrevive à remoção do vínculo | API e persistência |
| I3-02b | Campanhas distintas, sessão ausente ou campanha arquivada | Consultar ou tentar alterar vínculos | Não há vazamento. A API retorna 404 para recursos fora do escopo e 409 para alterações em campanha arquivada | Isolamento e arquivamento |
| I3-02c | Banco V3 com dados fictícios | Migrar ou encontrar uma falha durante a migração | Integridade, registros existentes e reversão integral em caso de falha | Testes migration-integrity, migration-preservation e migration-rollback |

## Dependências e limitações

Vínculos com entidades e referências derivadas de Markdown ficam para as próximas etapas.

## Interface da sessão

| ID | Critério verificável | Teste associado |
| --- | --- | --- |
| I3-02d | Na sessão ativa, selecionar notas da caixa ou da própria campanha, consultar o texto vinculado e remover somente o vínculo. Excluir da seleção notas de outras campanhas ou já vinculadas. | E2E em `tests/e2e/session-note-links.spec.ts` |
| I3-02e | Após perder a resposta de uma alteração, oferecer repetição da mesma operação idempotente. Ao reabrir uma campanha arquivada, exibir vínculos em modo de leitura. | E2E em `tests/e2e/session-note-links.spec.ts` |

**Evidências de TDD.** Red: o E2E chegou ao editor e falhou pela ausência do seletor. Green: o fluxo passou no Chromium com SQLite real, incluindo a perda da resposta HTTP após a gravação. Refactor: a exclusão de notas já vinculadas passou a consultar os IDs em um conjunto, e o painel oferece recarga após erro definitivo.
