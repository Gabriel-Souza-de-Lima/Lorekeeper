# UXR-06.2 — Escrita e recuperação

Base validada em `df28d4b` após o PR #76. O mantenedor aprovou a UXR-06.1 e autorizou este recorte. [Design System Codex](../ux-ui/design-system-codex.md) · [Achado A3](../ux-ui/auditoria/uxr-03.md#achados-prioritários) · [Editor de sessões](02-editor-de-sessoes.md)

| ID | Critério | Evidência |
| --- | --- | --- |
| UX62-01 | Anotações, Salvar e status integram o primeiro bloco. Anotações começam na primeira dobra em 320 × 640 com navegação recolhida e sessão representativa. O campo e a prévia se alinham em coluna única no desktop. | Playwright em 320, 390, 768 e 1280 CSS px. A3, G02, G05, G08, F03, D13. |
| UX62-02 | Prévia alternável por teclado, com estado exposto e sem remontar o campo ou perder texto e seleção. Metadados começam recolhidos, podem ser expandidos por teclado e mantêm os valores quando recolhidos. | Cenário focal e regressões de Markdown, wiki, templates e metadados. G05–G10, F03–F05. |
| UX62-03 | Somente Salvar confirma a escrita no servidor. Operação incerta, falha local, conflito, recuperação e revisões preservam os controles e contratos vigentes, incluindo reenvio do mesmo UUID e geração posterior. | Teste focal antes/depois de Salvar e regressão de manual-save, drafts e revisions. G04/G09/G13, F03/F05 e MVP-03. |

A prévia começa aberta abaixo da escrita para manter leitura e navegação Markdown reconhecíveis. Seu botão mantém o próprio foco ao alternar. Metadados e ações auxiliares ficam depois da escrita. A composição da comparação de conflito e o armazenamento permanecem sob os contratos atuais.

## Execução e evidências

- **Red.** No editor anterior, em 320 × 640, a entrada focou Anotações e deixou Salvar fora da viewport. O primeiro E2E focal reproduziu o desvio.
- **Green.** Anotações, status, Salvar e alternador estão no primeiro painel. A prévia permanece abaixo do bloco, e o editor usa coluna única em 320, 390, 768 e 1280 CSS px. O teste valida ordem física, largura, foco no alternador, seleção preservada e versão intacta até a confirmação explícita.
- **Refactor.** Recuperação, comparação e ações de saída ficam próximas da escrita. Metadados têm expansão nativa. Histórico, modelos e origem da importação vêm antes da prévia, preservando acesso mesmo com Markdown longo. Apenas os passos de abertura dos metadados foram acrescentados aos testes existentes que acessam esses campos. Nenhuma asserção foi retirada.
- **Regressão focal.** O cenário novo e os testes de salvamento manual, rascunhos, revisões e modelos passaram em duas repetições com dois workers, 18 execuções. A regressão final inclui reenvio com UUID original, falha de IndexedDB, geração posterior, abas concorrentes, histórico, arquivo, anexos e links.
- **Capturas.** Aplicação Vite/Fastify com SQLite isolado em memória, dados fictícios e Chromium Linux. Os PNGs acompanham o relatório fora do Git. As capturas mostram o editor em 1280 CSS px, os metadados abertos, a primeira dobra em 320 × 640 e o rascunho protegido com a prévia recolhida.
- **Limites.** A usabilidade com leitor de tela, zoom real, Windows/Chromium e Android físico com teclado virtual permanece para validação humana. O teste automatizado confirma o recorte, sem certificar conformidade integral com WCAG.

Persistência, recuperação, backend, banco, regras de negócio e automação de integração continuam sob os contratos existentes. A UXR-06.3 aguarda autorização. A P11 permanece reservada para depois do ciclo de UX/UI.

**Regressão final local.** Lint, análise de tipos e build aprovados. Passaram 5 testes unitários, 83 de integração e 47 E2E com dois workers.
