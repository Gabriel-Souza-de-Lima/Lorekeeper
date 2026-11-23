# Controle de sessões e confirmação explícita

- **Objetivo** — confirmar as edições no momento escolhido, preservar rascunhos locais e recuperar sessões excluídas.
- **Rastreabilidade** — MVP-02 a MVP-07, MVP-10 a MVP-12.

| Entrega | Critérios | Testes |
| --- | --- | --- |
| SC-01 · histórico | A versão de concorrência avança em alterações reais. Só alterações de título ou corpo criam revisão textual. Campos idênticos mantêm versão e histórico. Reenvios devolvem o comprovante original. | Integração SQLite e regressão |
| SC-02 · editor | Gravar no servidor após Salvar. Manter IndexedDB, descarte confirmado, recuperação, conflito e reenvio da operação já solicitada. Restaurar revisão carrega uma proposta. Avisar ao sair com rascunho local. | Integração e E2E |
| SC-03 · criação | Abrir Nova sessão sem criar registro. Recuperar o rascunho local e criar uma única sessão no primeiro Salvar, inclusive após perda de resposta. | Integração e E2E |
| SC-04 · lixeira | Confirmar pelo título, ocultar de listagens, estatísticas, busca, vínculos ativos e exportações. Restaurar o mesmo ID e todas as relações. Backups preservam a lixeira. | Migração, integração e E2E |

A lixeira é reversível. Exclusão definitiva fica fora do escopo. A captura rápida, a criação e a renomeação de páginas da wiki já exigem ações explícitas. Tags, destaques, vínculos manuais e estados de missão são operações independentes e conservam a confirmação própria. No editor de sessão, a confirmação explícita substitui o envio automático anterior quando SC-02 for integrada. O comportamento vigente e as evidências anteriores permanecem identificados nas respectivas especificações até essa transição.

## SC-01 — Compatibilidade

O título e o corpo formam o conteúdo de uma revisão. Cada revisão mantém o identificador da versão de gravação que a gerou; lacunas no histórico indicam versões sem mudança textual. Comprovantes de operações sem nova revisão referenciam a revisão textual vigente, e sua resposta conserva a versão de concorrência. O esquema, as revisões e os comprovantes existentes são preservados. Um pedido sem alterações sobre uma versão desatualizada continua sujeito a conflito, exceto se for um reenvio reconhecido pelo servidor.

O teste SC-01 começou em Red porque um pedido idêntico avançava da versão 1 para a 2. Em Green, o mesmo teste confirmou a preservação de versão em pedidos idênticos, o avanço após mudança de metadados e o histórico textual sem duplicatas. A regressão cobre também os comprovantes e as revisões anteriores.
