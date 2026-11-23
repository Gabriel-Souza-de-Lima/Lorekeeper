# I1-S — Sessões e editor Markdown

- **Estado** — entregue no Incremento 1. A política atual de gravação está no [salvamento manual](22-salvamento-manual.md).
- **Objetivo** — registrar uma sessão rapidamente e encontrar o texto ao reabrir a campanha.
- **Rastreabilidade** — MVP-03, MVP-04 (editor e gravação no servidor), MVP-07 (checagem de versão), Produto §4.3.

## Comportamento original do Incremento 1

Nova sessão abre diretamente no editor, com título inicial “Nova sessão” e data civil do navegador. Título, data real, número opcional positivo, data ficcional, participantes e corpo Markdown são editáveis. A lista ordena por data real decrescente, com desempate estável. O editor oferece prévia de títulos, listas, checklists, tabelas e destaque, com HTML embutido desabilitado.

Após pausa na edição, enviar uma gravação por vez com a versão-base. A confirmação corresponde ao texto efetivamente enviado. Havendo alterações mais recentes, elas continuam pendentes. A interface informa salvamento em curso, pendência, confirmação ou erro. Falha de rede mantém o texto na aba e permite tentar novamente. Uma versão antiga resulta em conflito, preserva o texto existente no servidor e mantém o texto novo no editor para cópia. A navegação interna avisa antes de abandonar alterações não confirmadas. Na aba e navegador, registrar aviso de saída enquanto houver alterações pendentes.

| ID | Cenário e critério verificável | Teste |
| --- | --- | --- |
| S01 | Abrir nova sessão pelo dashboard da campanha e editar texto e metadados. Reabrir duas sessões, em ordem por data, após reiniciar o servidor com o mesmo banco. | Integração e E2E de sessões |
| S02 | Na política original, digitar iniciava a gravação automaticamente; a política atual exige Salvar. Se uma gravação falhar, manter o conteúdo editável e permitir nova tentativa. | E2E de sessões |
| S03 | Rejeitar gravação de uma versão antiga e acesso à sessão sob outra campanha, mantendo o texto gravado. Rejeitar data inválida sem alterar a nota. | Integração |
| S04 | Aplicar a migração de forma transacional e reabrir o banco sem repetir a migração nem descartar registros. | Integração de sessões com banco em disco |

## Dependências e limites

Depende de I1-C. Rascunhos duráveis no navegador, reenvio idempotente, histórico e interface de resolução de conflitos pertencem ao Incremento 2. Nesta etapa um fechamento abrupto pode perder alterações ainda não confirmadas. Usar apenas dados fictícios até a validação de recuperação e backup.
