# IA — Publicação com GitHub App

| ID | Critério | Teste |
| --- | --- | --- |
| IA-01 | Somente branches internas `codex/`, atualizadas e com arquivos permitidos são publicadas. Repetir a descoberta reaproveita o PR aberto. | Unitário e integração HTTP |
| IA-02 | O bot pede auto-merge enquanto `validar` está pendente ou ainda não foi enfileirado. O Ruleset nativo exige aprovação de `validar` na origem GitHub Actions e revalidação da base. | Unitário, integração HTTP e ensaio GitHub |
| IA-03 | A sinalização de push roda sem checkout, permissões e secrets. A reconciliação executa código da `main` com a App limitada a Contents e Pull Requests. | Revisão do workflow e integração HTTP |
| IA-04 | Regras indisponíveis, CI reprovado, conflito, head alterado ou base desatualizada bloqueiam o pedido. Recusa da API mantém o PR aberto. | Unitário e integração HTTP |
| IA-05 | O pedido informa o SHA esperado da branch e deve ser confirmado como ativado pela App. Um PR aberto por outra identidade fica fora da ativação automática. | Integração HTTP e ensaio GitHub |

A ausência de uma execução para um PR recém-criado é espera pelo check obrigatório. Uma execução concluída jamais é tratada como pendente. O pedido nativo não integra diretamente o PR. Quem publica em `codex/` precisa manter apenas alterações autorizadas na branch até o merge.
