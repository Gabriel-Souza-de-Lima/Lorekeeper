# IA — Integração de PRs internos autorizados

- **IA-06** — branches internas `codex/`, `feat/`, `fix/`, `chore/` e `docs/` podem usar o bot. Para publicar automaticamente, o sinal de push precisa corresponder ao repositório, branch e SHA atuais e ser de um autor autorizado. Para um PR existente, aceitar somente o mantenedor, a App ou uma identidade configurada explicitamente. Forks, rascunhos e autores desconhecidos não são elegíveis.
- **IA-07** — aceitar código de servidor, interface, documentação, testes e infraestrutura com diff verificável. Bloquear padrões de credenciais, patches incompletos e mudanças nas raízes de confiança do próprio CI ou bot. Mudança de esquema precisa trazer testes de integração que marquem e exercitem integridade, preservação e rollback. Operações potencialmente destrutivas exigem revisão específica.
- **IA-08** — solicitar auto-merge nativo enquanto o CI aguarda. Se `validar` já tiver terminado, só recuperar a integração por uma operação normal de merge protegida pelo GitHub, com SHA esperado, PR atual e limpo, Ruleset estrito e prova de sucesso para o candidato exato. CI reprovado, candidato desatualizado, conflito ou proteção indisponível bloqueiam a recuperação.
- **IA-09** — sinal de push/PR sem checkout ou secrets. O reconciliador privilegiado executa exclusivamente a versão da `main` e resolve tudo novamente pela API. Nenhuma permissão nova.

Teste a decisão pura e a sequência HTTP com CI aguardando, aprovado e reprovado, autor interno e externo, base antiga e conflito. Após integrar a mudança da própria automação sob revisão específica, teste um PR real com mudança de servidor.


## Evidências locais

- **Red** — os testes da política falharam ao exigir um prefixo interno adicional e ao reconhecer o candidato aprovado.
- **Green** — o teste HTTP distingue publicação autorizada, auto-merge pendente, recuperação após sucesso e bloqueios por origem, autoria, conflito, atualização, proteção ou candidato incorreto.
- **Refactor** — a política de diffs e a comprovação do CI ficam separadas das operações HTTP. A solicitação nativa e a recuperação compartilham a conferência atualizada do PR, do candidato, da base e da proteção.

## Ensaio real com alteração em servidor

A App abriu o [PR #21](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/21) para a branch `fix/valida-id-encaminhamento`, com modificação em `src/server/quick-notes.ts`. Na abertura, nenhum run de CI havia sido observado. Um novo push acrescentou a verificação de UUID em maiúsculas e disparou o CI do head `9fb7ac9`. A linha do tempo registra que `lorekeeper-pr-bot[bot]` solicitou auto-merge enquanto o PR estava aberto com `validar` em execução. O [job validar](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45054695910/job/137307212161) aprovou o candidato `eddf523`. O GitHub atribuiu à App o merge `6ce5386`, e o [CI pós-merge](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45054880212) passou. A recuperação tardia continua coberta pelo ensaio HTTP local.
