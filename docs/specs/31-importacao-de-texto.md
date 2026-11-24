# P8 — Importação de TXT e Markdown

- **Estado** — implementada.
- **Objetivo** — incorporar anotações locais ao acervo com confirmação explícita.
- **Rastreabilidade** — produto sobre importação, MVP-03, MVP-04, MVP-11 e MVP-12.

## Comportamento e regras

Abrir a importação no painel inicial, escolher campanha ativa e fornecer arquivo `.txt` ou `.md`. A prévia é texto literal e pode ser editada. O título inicia com o nome do arquivo. O destino inicial é sessão, tipo com edição completa de texto. A confirmação cria a sessão com a data civil atual e a abre no editor existente.

O limite por arquivo e pelo conteúdo editado é de 512 KiB em UTF-8. A decodificação rejeita sequências inválidas e controles binários. Um BOM de UTF-8 é aceito. A prévia normaliza quebras CRLF para LF. A origem fornecida e o nome do arquivo são guardados separadamente na migração aditiva V14. Apenas referências já expressas por IDs válidos usam o mecanismo existente. O texto importado não gera vínculos por nome. Na prévia Markdown, HTML permanece desabilitado.

`POST /api/campaigns/:campaignId/import-text` recebe UUID, título, data, nome, bytes Base64, conteúdo revisado e origem opcional. Exige `Idempotency-Key` e usa a transação de criação de sessões para confirmar documento, proveniência, índice e comprovante. UUID já usado não sobrescreve dados. O reenvio conserva a requisição original quando a resposta é incerta. `GET /api/campaigns/:campaignId/sessions/:id/import-source` mostra a proveniência de uma sessão consultável. O ZIP inclui `sessionImports` e o backup contém os mesmos dados.

## Cenários

| Cenário | Quando | Então |
| --- | --- | --- |
| Prévia | Seleciona TXT ou Markdown | O texto fica disponível para revisar localmente |
| Confirmação | Seleciona campanha e confirma | A sessão aparece na busca e no editor |
| Falha | O arquivo é inválido ou excede o limite | A aplicação informa o erro e não cria registro |
| Reenvio | A conexão cai depois da gravação | A mesma solicitação recupera a sessão existente |

## Critérios de aceitação e testes

| ID | Critério | Teste |
| --- | --- | --- |
| P8-01 a P8-04 | Seleção, prévia, título, destino e criação só após confirmação. | E2E |
| P8-05 e P8-06 | Preservar texto e origem, validar extensão, tamanho e UTF-8. | SQLite |
| P8-07 | HTML permanece inerte. | E2E |
| P8-08 a P8-10 | Sem sobrescrita silenciosa, duplicação por reenvio ou cruzamento de campanha. | SQLite e E2E |
| P8-11 e P8-12 | Busca, edição, ZIP e restauração mantêm o documento. | SQLite e E2E |

## Dependências e limitações

Reutiliza criação manual, revisão e FTS5 de sessões. Outros tipos ficam para quando tiverem edição completa de texto. O arquivo binário original não é retido.


## Evidências de TDD

- **Red** — a API retornou 404, a migração ainda não existia e o navegador não encontrou a ação de importar.
- **Green** — a prévia manteve HTML inerte. A perda de resposta foi recuperada com o mesmo UUID. O documento entrou no FTS5, ficou editável e a origem foi recuperada do backup.
- **Refactor** — a validação de arquivo é compartilhada entre prévia e servidor. A rota reutiliza a mesma transação de criação e o mesmo mecanismo de comprovantes do editor.

## Validação após integração

O `validar` do PR #58 passou. A primeira execução após o merge registrou timeout no E2E de campanha, durante a troca de servidor. A anotação apontou a primeira navegação após a troca, com a página já encerrada pelo teste. O cenário de importação passou nessa execução. A correção usa o encerramento compartilhado nas duas fases. Cada fase recebe seu próprio contexto de navegador e reutiliza o banco temporário para verificar persistência. [Execução original](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45509391013)
