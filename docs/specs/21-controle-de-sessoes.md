# Controle de sessões e confirmação explícita

- **Objetivo** — confirmar as edições no momento escolhido, preservar rascunhos locais e recuperar sessões excluídas.
- **Rastreabilidade** — MVP-02 a MVP-07, MVP-10 a MVP-12.

| Entrega | Critérios | Testes |
| --- | --- | --- |
| SC-01 · histórico | A versão de concorrência avança em alterações reais. Só alterações de título ou corpo criam revisão textual. Campos idênticos mantêm versão e histórico. Reenvios devolvem o comprovante original. | Integração SQLite e regressão |
| SC-02 · editor | Gravar no servidor após Salvar. Manter IndexedDB, descarte confirmado, recuperação, conflito e reenvio da operação já solicitada. Restaurar revisão carrega uma proposta. Avisar ao sair com rascunho local. | Integração e E2E |
| SC-03 · criação | Abrir Nova sessão sem criar registro. Recuperar o rascunho local e criar uma única sessão no primeiro Salvar, inclusive após perda de resposta. | Integração e E2E |
| SC-04 · lixeira | Confirmar pelo título, ocultar de listagens, estatísticas, busca, vínculos ativos e exportações. Restaurar o mesmo ID e todas as relações. Backups preservam a lixeira. | Migração, integração e E2E |

A lixeira é reversível. Exclusão definitiva fica fora do escopo. A captura rápida, a criação e a renomeação de páginas da wiki já exigem ações explícitas. Tags, destaques, vínculos manuais e estados de missão são operações independentes e conservam a confirmação própria. SC-02 substituiu o envio automático do editor pela confirmação explícita e manteve o armazenamento automático de rascunhos no IndexedDB.

## Aceite e rastreabilidade

SC-01 a SC-04 estão aprovados no escopo desta entrega. A referência integrada é `136906b`. Cada linha liga a entrega aos testes do repositório e ao CI pós-merge aprovado na `main`.

| Entrega | MVP | Evidência automatizada | Implementação e CI |
| --- | --- | --- | --- |
| SC-01 · revisões relevantes | MVP-04, MVP-07 | [Integração de revisões](../../tests/integration/session-revisions.test.ts) e [E2E de salvamento](../../tests/e2e/manual-save.spec.ts) | [PR #44](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/44) · [CI de 27b541f](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45195196870) |
| SC-02 · salvamento manual e rascunhos | MVP-04 a MVP-07, MVP-10 | [Matriz SAVE](22-salvamento-manual.md#aceite-e-evidências-automatizadas) | [PR #45](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/45) · [CI de 1b704a6](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45196418979) |
| SC-03 · criação na primeira confirmação | MVP-03, MVP-06 | [Integração de criação](../../tests/integration/session-creation.test.ts) e [E2E de criação](../../tests/e2e/session-create-on-save.spec.ts) | [PR #46](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/46) · [CI de 1287da5](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45197478156) |
| SC-04 · exclusão e restauração | MVP-02, MVP-03, MVP-07, MVP-10 a MVP-12 | [Matriz da lixeira](23-lixeira-de-sessoes.md#aceite-e-evidências-automatizadas) | [PR #47](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/47) · [CI de 136906b](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45199606694) |

### Validação manual no Windows

O mantenedor confirmou em navegador, com o Lorekeeper executado localmente no Windows, que a edição aguarda o botão **Salvar**, que a nova sessão só é criada na primeira confirmação, que a exclusão requer confirmação e que a lixeira permite recuperar a sessão. Também confirmou o agrupamento das edições em uma única confirmação e a recuperação do rascunho protegido no IndexedDB. O relato cobre esses comportamentos observáveis. A matriz automatizada sustenta os critérios técnicos, como idempotência, conflito, atomicidade e migração.

### Verificação local pelo Codex

Em `136906b`, um navegador limpo recebeu de `http://127.0.0.1:3000` o JavaScript idêntico ao de `dist/` e exibiu as ações da versão integrada, com respostas da API simuladas para proteger o acervo. Os cinco testes Playwright focados em salvamento, criação, lixeira e revisões passaram. Ensaios complementares com SQLite temporário verificaram zero gravações durante 30 segundos de edição, uma revisão por confirmação com mudança textual, exclusão e restauração pelo editor e recuperação do IndexedDB sem nova gravação. A primeira execução complementar confirmou criação, salvamento e histórico antes de falhar no auxiliar de encerramento invocado fora do runner. Exclusão e recuperação de rascunho foram confirmadas em execução independente.

O aceite de sessões deixa em aberto a validação operacional do [backup externo](19-backup-externo.md) e do [piloto em dois dispositivos](20-piloto-responsivo.md).

### Regressão para o registro do aceite

Na atualização desta documentação, a integração focada passou com 11 testes e o Playwright com 10 testes, ambos sem falhas. Os comandos foram executados no checkout de `136906b` com dados fictícios.

```powershell
node --test tests/integration/session-revisions.test.ts tests/integration/session-creation.test.ts tests/integration/session-trash.test.ts tests/integration/markdown-links.test.ts tests/integration/campaigns.test.ts
npm exec -- playwright test tests/e2e/manual-save.spec.ts tests/e2e/session-create-on-save.spec.ts tests/e2e/session-trash.spec.ts tests/e2e/revisions.spec.ts tests/e2e/drafts.spec.ts tests/e2e/markdown-links.spec.ts
```

## SC-01 — Compatibilidade

O título e o corpo formam o conteúdo de uma revisão. Cada revisão mantém o identificador da versão de gravação que a gerou; lacunas no histórico indicam versões sem mudança textual. Comprovantes de operações sem nova revisão referenciam a revisão textual vigente, e sua resposta conserva a versão de concorrência. O esquema, as revisões e os comprovantes existentes são preservados. Um pedido sem alterações sobre uma versão desatualizada continua sujeito a conflito, exceto se for um reenvio reconhecido pelo servidor.

O teste SC-01 começou em Red porque um pedido idêntico avançava da versão 1 para a 2. Em Green, o mesmo teste confirmou a preservação de versão em pedidos idênticos, o avanço após mudança de metadados e o histórico textual sem duplicatas. A regressão cobre também os comprovantes e as revisões anteriores.
