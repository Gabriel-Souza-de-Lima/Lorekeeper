# P8 — Importação de TXT e Markdown

- **Estado** — proposta para detalhar antes do Red.
- **Rastreabilidade** — produto sobre importação e MVP-09/MVP-12.

A prévia é local e editável. A confirmação escolhe campanha, título e tipos com fluxo de edição existente. O contrato precisa validar bytes UTF-8, extensão e limite no servidor. A criação usa UUID estável por confirmação, preserva origem informada e recusa sobrescrita. HTML permanece inerte e nomes não criam vínculos automaticamente.

| ID | Critério | Teste planejado |
| --- | --- | --- |
| P8-01 a P8-05 | Seleção, prévia, destino, confirmação e proveniência. | E2E e SQLite |
| P8-06 a P8-10 | Validação, conteúdo inerte, idempotência e isolamento. | SQLite e E2E |
| P8-11 e P8-12 | Busca, edição e portabilidade. | SQLite e E2E |
