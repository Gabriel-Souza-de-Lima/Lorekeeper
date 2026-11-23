# SC-04 — Lixeira reversível de sessões

- **Rastreabilidade** — MVP-02, MVP-03, MVP-07, MVP-10 a MVP-12 e SAVE-14.
- **Objetivo** — retirar sessões criadas por engano e recuperá-las com suas relações.

| ID | Critério | Teste |
| --- | --- | --- |
| SC-04a | Confirmar exclusão pelo título. A sessão some da lista ativa, das métricas, da busca, dos backlinks e do ZIP. | Integração e E2E |
| SC-04b | Lixeira e recuperação preservam ID, datas, texto, revisões, comprovantes, tags, menções e notas vinculadas. Nenhuma outra campanha é modificada. | Integração SQLite |
| SC-04c | Gravações pendentes em sessão na lixeira não alteram o documento nem o recriam. A versão de concorrência invalida edições abertas antes da exclusão. | Integração |
| SC-04d | Migração aditiva preserva acervo, índices e relações; testar integridade e rollback. O backup SQLite preserva a lixeira. | Integração de migração e restauração |

Usar marcação de exclusão reversível presente somente em sessões. O documento e suas relações permanecem no SQLite. As leituras ativas precisam verificar essa marcação, e a exportação deve filtrar tanto os documentos quanto suas relações. No momento da recuperação, a sessão volta às mesmas relações e mantém UUID e histórico. Exclusão e restauração são ações explícitas separadas da edição. A campanha arquivada continua em modo de leitura. Exclusão definitiva fica fora desta entrega.

## Implementação e evidências

A V9 adiciona a data da lixeira e uma visão de documentos ativos. O índice FTS continua preservado e a busca filtra a visão ativa. Mover para a lixeira e restaurar avançam a versão de concorrência sem gerar revisão textual. O editor oferece exclusão para uma sessão confirmada sem alterações pendentes. Após exclusão em outro dispositivo, a tentativa de salvar recebe erro e conserva o rascunho.

- **Red** — a API retornou 404, a V9 estava ausente e o navegador não encontrou a ação Excluir sessão.
- **Green** — testes verificam exclusão, restauração, exportação filtrada, busca, histórico e backup.
- **Refactor** — a visão de documentos ativos centraliza o filtro para tags, busca e exportação, preservando as relações no banco.
