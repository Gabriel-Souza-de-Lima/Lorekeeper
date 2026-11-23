# P4 — Modelos opcionais de sessão

**Objetivo.** Começar uma sessão em branco ou a partir de cabeçalhos Markdown editáveis.

**Escopo.** Oferecer os modelos narrativa e investigativa, além da sessão livre. Os modelos seguem como constantes da aplicação. Modelos pessoais são uma extensão separada, pois precisam de edição, persistência, exportação e restauração próprias.

O seletor aparece apenas enquanto a sessão ainda não foi criada no servidor. A seleção depende de ação explícita e atualiza somente o corpo pelo fluxo existente de rascunho. Título, data e demais metadados são preservados. Qualquer substituição de corpo não vazio, inclusive por sessão livre, exige confirmação. Cancelar conserva o rascunho. Erros de armazenamento usam a indicação e recuperação do editor atual. O texto copiado fica independente do modelo original. Nenhuma rota ou migração é necessária.

| ID | Critério | Teste |
| --- | --- | --- |
| P4-01 | Nova sessão abre com corpo em branco. | E2E |
| P4-02 | Aplicação preenche só o corpo inicial. | E2E |
| P4-03 | Nenhuma sessão permanente antes de Salvar. | E2E com consulta à API |
| P4-04 | Alterar o modelo não afeta o conteúdo já copiado. | Persistência E2E |
| P4-05 | O usuário pode editar o conteúdo aplicado. | E2E |
| P4-06 | O seletor não aparece em sessões existentes. | E2E |
| P4-07 | Substituição sempre pede confirmação quando houver texto. | E2E |
| P4-08 | Cabeçalhos dos modelos aparecem na prévia Markdown. | E2E |

## Evidências de TDD

- **Red** — a sessão abria em branco, mas o teste falhava ao procurar o seletor.
- **Green** — o navegador aplicou os modelos, protegeu o rascunho, recusou substituições canceladas e confirmou que o servidor só criou a sessão após Salvar.
- **Refactor** — as variantes usam o mesmo gerador de cabeçalhos Markdown e o mesmo fluxo de edição local. O teste reabre a sessão salva depois de aplicar outro modelo em um rascunho independente.
