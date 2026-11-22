# I3-02 — Vínculos entre anotações rápidas e sessões

- **Estado** — implementada na API.
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

Esta entrega disponibiliza a API. A interface de seleção, os vínculos com entidades e as referências derivadas de Markdown serão entregues em etapas seguintes.
