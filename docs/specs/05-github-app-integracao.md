# IA — Publicação com GitHub App

| ID | Critério | Teste |
| --- | --- | --- |
| IA-01 | Somente branches internas que optaram pelo prefixo `codex/`, atualizadas e com arquivos permitidos, podem abrir PR. Repetir descoberta reaproveita o PR existente. | Unitário e ensaio GitHub |
| IA-02 | O bot pede auto-merge nativo somente se a versão atual do PR e o candidato sintético forem os mesmos validados pelo job `validar`. CI pendente, ausente ou com resultado distinto de sucesso bloqueia a solicitação. | Unitário e ensaio GitHub |
| IA-03 | A branch padrão executa a automação sem carregar código do PR. Alterações de CI, autenticação, infraestrutura e migrações exigem revisão. | Revisão do workflow e teste unitário |
| IA-04 | A API do GitHub é a autoridade. Conflito, base substituída, regras indeterminadas ou recusa do auto-merge deixam o PR aberto. | Unitário e ensaio GitHub |
