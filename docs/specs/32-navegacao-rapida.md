# P9 — Navegação rápida

- **Estado** — proposta para detalhar antes do Red.
- **Rastreabilidade** — MVP-09 e produto sobre recuperação de informações.

Um controle visível e um atalho abrem a mesma consulta. Avaliar Ctrl/Cmd+K em navegador e reutilizar FTS5 e navegação existentes. A lista indica campanha e tipo, funciona por teclado e devolve foco ao fechar. Navegação que abandona uma sessão usa a confirmação existente de rascunhos. Favoritos usam IDs estáveis e persistência SQLite sob a mesma campanha.

| ID | Critério | Teste planejado |
| --- | --- | --- |
| P9-01 a P9-06 | Atalho, controle, consulta, teclado, abertura e foco após Escape. | E2E |
| P9-07 e P9-08 | Distinguir homônimos e preservar rascunhos. | E2E |
| P9-09 e P9-10 | Favoritos persistentes e interface acessível e responsiva. | SQLite e E2E |
