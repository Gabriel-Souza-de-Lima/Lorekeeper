# Salvamento manual de sessões

- **Rastreabilidade** — MVP-03, MVP-04, MVP-05, MVP-06, MVP-07 e MVP-10.
- **Política** — o servidor grava somente alterações confirmadas. O IndexedDB continua protegendo o rascunho automaticamente. A reconciliação de uma operação já iniciada conserva sua chave e seus campos.

| Critério | MVP | Verificação |
| --- | --- | --- |
| SAVE-01/02 | MVP-04 | Salvar habilita com mudanças; cinco edições e 30 segundos de relógio não emitem requisições até o clique. |
| SAVE-03/04 | MVP-04/06 | IndexedDB protege o texto, oferece recuperação e exibe estados distintos de pendência, erro, conflito e confirmação. |
| SAVE-05/06 | MVP-04 | Um clique confirma um conjunto. Sem mudanças não há revisão. Metadados avançam a versão sem duplicar texto. SC-01 e testes de revisão. |
| SAVE-07/08 | MVP-05/06 | A edição posterior ao clique continua local. Falha conserva a chave de reenvio e o texto. Cenários de rascunho. |
| SAVE-09/10 | MVP-06 | Navegação avisa sobre rascunho local; descarte confirmado remove somente esse rascunho após escrita local bem-sucedida. |
| SAVE-11 | MVP-07 | Conflito preserva a proposta. Escolher a base comparada prepara a combinação; Salvar a confirma. |
| SAVE-12 | MVP-04 | Carregar versão antiga mantém o histórico até Salvar. Metadados atuais são preservados. |
| SAVE-13 | MVP-03/06 | Criar no primeiro Salvar, com UUID local estável e recuperação de rascunho. Entrega SC-03. |
| SAVE-14 | MVP-03/07 | Campanhas arquivadas ficam em leitura. Sessões excluídas rejeitam gravações pendentes. Entrega SC-04 cobre exclusão. |
| SAVE-15 | MVP-04/10 | Índice e backlinks são atualizados apenas pela transação de confirmação. |

As especificações do editor e de integridade registram a política anterior como histórico. Captura rápida, wiki e ações independentes mantêm seus próprios controles explícitos.


## Evidências de TDD

- **Red** — o navegador não encontrou Salvar na sessão existente.
- **Green** — os cenários focados verificaram confirmação única, descarte, perda de resposta e recuperação de conflito.
- **Refactor** — a confirmação usa um único fluxo, com trava por operação e preservação da geração posterior. O teste de menções verifica que busca e backlinks permanecem inalterados antes de Salvar.

## SAVE-13 — Primeira confirmação

O editor de sessão nova tem versão local zero e UUID estável. Rascunhos novos são recuperáveis na mesma campanha antes de existir um registro oficial. O primeiro POST com todos os campos grava documento, metadados, primeira revisão, vínculos e comprovante na mesma transação. O servidor só reconhece uma tentativa repetida quando o identificador e o conteúdo correspondem ao comprovante da criação na mesma campanha. Após a confirmação, gravações seguintes usam o controle de versão normal.
