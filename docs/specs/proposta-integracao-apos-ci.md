# Proposta SDD — Integração automática após aprovação do candidato

**Estado:** em revisão. Direção aprovada para investigação. A publicação deste SDD não autoriza AUT-02 nem alterações na automação operacional. **Base analisada:** `bb017e0` da `main`. **Escopo:** evolução do fluxo de engenharia descrito em [IA](05-github-app-integracao.md), sem critérios funcionais do MVP afetados.

## Evidência e comportamento atual

| PR | CI inicial | Desbloqueio observado | CI após correção |
| --- | --- | --- | --- |
| [#67](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/67) | [Falha de seletor E2E](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45673386710) | [Desativação manual](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/67#event-37286319360) após HTTP 403 no Codex Cloud | [Candidato](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45677626359) e [main](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45677934353) aprovados |
| [#68](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/68) | [Falha de sincronização E2E](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45680040213) | [Desativação manual](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/68#event-37312451331) após HTTP 403 no Codex Cloud | [Candidato](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45725448126) e [main](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45725674695) aprovados |

Nos dois PRs, a App solicitou auto-merge e o GitHub registrou a integração pela App após as correções. A intervenção ocorreu entre a reprovação e a publicação da correção. O HTTP 403 foi observado no caminho de acesso do Codex Cloud e não estabelece quais mutações o token da App consegue executar.

O [script](../../.github/scripts/github-app.mjs) trata CI pendente ou ausente como oportunidade de armar o auto-merge com `expectedHeadOid`. Quando encontra `auto_merge` já ativo, encerra a reconciliação do PR antes de consultar os resultados. Com CI aprovado e sem pedido armado, o caminho tardio verifica o run oficial, a tentativa e o passo de checkout do candidato exato, relê o PR, a base, as regras e o run, e chama o endpoint de merge protegido com o SHA do head.

O [sinal](../../.github/workflows/notify-codex-branch.yml) não executa código do PR. A [reconciliação](../../.github/workflows/github-app.yml) usa checkout confiável da `main`, conclusão do CI ou do sinal e varredura agendada. A leitura usa `GITHUB_TOKEN` com Actions, Contents e Pull Requests em leitura. A escrita usa o token temporário da App com Contents e Pull Requests em escrita. O [CI oficial](../../.github/workflows/ci.yml) registra o SHA sintético verificado no job `validar`. O filtro de [política](../../.github/scripts/github-app-policy.ts) confere PR obrigatório e check estrito `validar` da integração GitHub Actions `15368`. A garantia de ausência de bypass vem do Ruleset efetivo e da instalação da App. A leitura das regras de branch não demonstra por si só a lista de atores com bypass.

O [AGENTS.md](../../AGENTS.md) e o [guia de desenvolvimento](../DEVELOPMENT.md#publicação-com-github-app) exigem preservar o head armado. A especificação IA inicial descreve elegibilidade mais estreita que o código atual. A futura implementação deve alinhar IA-01 a IA-05 à política efetiva e aos critérios IA-06 a IA-08 já exercitados pelos testes, sem ampliar a elegibilidade.

## Alternativas

| Alternativa | Benefício | Risco e limitação |
| --- | --- | --- |
| 1. Manter | O GitHub integra assim que o Ruleset permite, inclusive se o bot ficar indisponível depois de armar. Usa as permissões existentes. | Reprovação deixa o pedido armado, e a varredura não o reabre para decisão. Mudança de head por escritor autorizado pode conservar o pedido. O mantenedor continua necessário quando o Codex não consegue desarmar. |
| 2. Desarmar após reprovação | Preserva a integração nativa durante CI pendente e pode liberar correções sem ação humana. | Acrescenta uma mutação e depende de comprovar que a App pode desarmar com o token atual. A mutação `disablePullRequestAutoMerge` recebe o ID do PR, sem precondição de head ou tentativa. Uma releitura reduz a janela, mas um rerun pode passar ou outro ator pode rearmar entre a leitura e a mutação. Eventos atrasados, timeout e respostas ambíguas exigem reconciliação do estado real. |
| 3. Integrar após aprovação | Aproveita o caminho protegido já existente e retira o estado armado do fluxo ordinário. Uma falha normal de CI deixa a branch livre para receber correção. Mantém as permissões atuais. | A integração aguarda o bot após o CI. Falhas de API ou do agendamento atrasam a entrega. Requer verificar o contrato entre a última leitura e a operação protegida do GitHub, inclusive em casos de corrida da base e nova tentativa do CI. |

A alternativa 2 só deveria desarmar pedidos comprovadamente criados pela própria App e associados à reprovação terminal da tentativa atual do candidato atual. Exigiria releitura do pedido, head, base e tentativa e confirmação posterior do efeito. Um pedido manual ou sem origem verificável ficaria para o mantenedor. Como o desarme não é condicional ao SHA, ainda poderia atingir um pedido distinto do observado. Isso torna a alternativa menos previsível para o problema demonstrado.

## Recomendação e fluxo proposto

Adotar a alternativa 3, condicionada à validação das proteções no GitHub. Manter publicação, elegibilidade, gatilhos, segregação de tokens e checkout confiável. Para PRs abertos com pedidos nativos já existentes na transição, manter o bloqueio e identificar a origem do pedido no log. A liberação desses casos continua sob controle do mantenedor. Ativar a nova política após a revisão específica da mudança nas raízes de confiança e a verificação dos pedidos pendentes.

1. Tratar o evento como sinal de reconciliação. Ler novamente PR, head, base, diff e regras. Exigir PR interno autorizado, diff completo e elegível, e `main` igual ao commit confiável que executa a reconciliação. Alterações sensíveis seguem para revisão específica.
2. Identificar o candidato sintético do PR e confirmar seus pais na ordem base e head. Exigir sucesso inequívoco da tentativa atual do CI oficial e do único job `validar`, com prova de checkout para aquele PR e candidato. A seleção do run deve ser determinística e excluir aprovação antiga quando houver execução mais recente aplicável pendente ou reprovada. Dados ausentes, inconsistentes ou incompletos bloqueiam a operação.
3. Antes da escrita, reler estado do PR, SHA do candidato, tentativa, `main` e proteção. Exigir estado integrável, head e base estáveis e ausência de pedido nativo. Enviar apenas `PUT /pulls/{n}/merge` com `sha` do head confirmado e método `merge`. O endpoint protegido é a única escrita de integração. O SHA informado condiciona o **head**. O Ruleset deve continuar impondo PR obrigatório, check na origem esperada, base atualizada e ausência de bypass no momento da operação. Proibir escrita direta da ref e aumento de permissão.
4. Se houver conflito, erro, limite de API, expiração ou resposta ambígua, descartar a decisão local. Se uma escrita puder ter sido aceita, consultar PR, estado de merge e SHA integrado antes de nova tentativa. Um PR aberto só volta a ser candidato após nova avaliação completa. Eventos duplicados, fora de ordem ou interrompidos são recuperados por reconciliação e agendamento, sem armazenar aprovações reaproveitáveis. Uma mudança da `main` invalida o trabalho restante daquela execução.
5. Registrar PR, base, head, candidato, run, tentativa, decisão e SHA de merge quando confirmado. Distinguir espera, negativa, resultado desconhecido e sucesso. Registrar o CI pós-merge para o SHA integrado antes de liberar trabalho dependente. Evitar credenciais, conteúdo do diff e respostas brutas de erro nos logs.

### Limite de concorrência

O endpoint condiciona o head e não recebe precondição explícita para a base, para o candidato sintético ou para a tentativa do CI. A releitura reduz essa janela, e a proteção nativa decide se a operação ainda é válida. A concorrência do workflow serializa instâncias do bot, mas mudanças feitas por atores externos e novos runs continuam possíveis. A implantação depende de demonstrar que uma base alterada ou uma aprovação substituída não permite integrar com a evidência antiga. A comparação do commit final com o candidato ajuda na auditoria e não previne um merge já concluído. Se o contrato do GitHub ou os ensaios deixarem essa proteção sem evidência suficiente, manter a política atual e submeter uma proposta de precondição mais forte a revisão específica.

## Aceitação e matriz de testes proposta

| ID | Critério observável | Cenários e nível |
| --- | --- | --- |
| IA-P01 | Publicação elegível é idempotente. CI ausente, pendente ou sem sucesso mantém PR aberto e desarmado. | Unitário e HTTP simulado. Sinal repetido, autor externo, fork, rascunho, escopo sensível, CI ausente, pendente, reprovado, cancelado e ignorado. Verificar ausência de mutação de auto-merge e de merge. |
| IA-P02 | Apenas a tentativa aplicável e aprovada para o candidato exato autoriza a escrita. | Unitário e HTTP simulado. Run ou job de origem errada, passo ausente ou duplicado, PR ou SHA diferente, jobs incompletos, tentativa antiga aprovada seguida de tentativa pendente ou reprovada. Verificar o SHA do head no payload positivo. |
| IA-P03 | Mudança de PR, head, candidato, base, proteção ou CI invalida a decisão. | HTTP simulado com alteração entre leituras e rejeições `405`/`409` na escrita. No GitHub, testar corrida de push da branch, avanço da base e rerun, incluindo nova base já ancestral do head quando reproduzível. Verificar o contrato da API e registrar qualquer corrida sem evidência. |
| IA-P04 | Erros e execuções interrompidas são recuperáveis sem repetir uma integração já efetivada. | HTTP simulado. Timeout antes da escrita e após aceite, HTTP `403`, `429` e `5xx`, evento obsoleto, varredura repetida, duas execuções lógicas para PR já integrado. Conferir releitura, ausência de nova escrita sem prova e registro do motivo. |
| IA-P05 | A autoridade e a elegibilidade atuais são preservadas. | Revisão estática dos workflows e testes de política. Confira token de leitura, escrita exclusivamente pela App, checkout confiável, Ruleset ativo sem bypass, `validar` estrito na origem exigida e revisão específica de alterações sensíveis. PR legado armado permanece bloqueado para o bot. |
| IA-P06 | Uma falha real permite publicar correção sem desarme e só o candidato corrigido é integrado pela App. | Ensaio GitHub após revisão e ativação. PR elegível com falha reversível em teste fictício, comprovar `auto_merge` vazio e ausência de merge, publicar a correção por push normal, confirmar sucesso no novo candidato, identidade da App, SHA integrado e CI pós-merge. |

A implementação futura começa com Red nos testes de decisão e no servidor HTTP simulado, segue com a mudança mínima no reconciliador e refatoração após Green, preservando a regressão existente. O ensaio real exige autorização posterior e a revisão específica da mudança no bot.

## Contrato oficial e limites da confirmação

| Camada | Evidência disponível | Limite |
| --- | --- | --- |
| API de merge | O campo `sha` do `PUT /pulls/{n}/merge` exige correspondência com o head. O contrato documenta `409` para divergência, Contents em escrita para token granular e os códigos `403`, `405` e `422`. | A requisição não condiciona base, candidato, run ou tentativa. A recomendação atual da documentação para a API assíncrona não demonstra que ela ofereça essas precondições. O endpoint existente é o objeto deste ensaio. |
| Ruleset | Regras ativas podem exigir PR, origem específica para o status e branch atualizada. A regra estrita exige que a branch esteja atualizada com a base. | Isso não prova, por si só, correspondência entre o resultado nativo aceito pelo GitHub e o SHA sintético ou a tentativa exigida pelo bot. A regra aplicada à branch não descreve todos os atores com bypass. |
| Bot | Verifica identidade, diff, pais do candidato, run oficial, job, passo de checkout, tentativa e estado corrente antes de escrever. | Leituras independentes podem observar instantes diferentes. A serialização do workflow não coordena escritores externos, alteração da base ou reruns. |
| CI | A API distingue `run_attempt` dentro de um run. A evidência do bot deve identificar run e tentativa além dos SHAs. | A documentação consultada não confirma atomicidade entre começar uma tentativa e invalidar um status aprovado anterior para a operação de merge. |

Fontes oficiais. [Contrato REST de merge](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request) · [Regras de Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-status-checks-to-pass) · [OpenAPI oficial](https://github.com/github/rest-api-description/blob/main/descriptions/api.github.com/api.github.com.json).

A consulta Git confirmou a `main` em `bb017e0` e a consulta pública do Actions confirmou o CI pós-merge do PR #68. As consultas REST de regras efetivas e Rulesets retornaram HTTP 403 no Cloud. O histórico demonstra integração pela App com as credenciais configuradas, mas os PRs #67 e #68 usaram pedidos nativos e não demonstram as corridas do caminho protegido. Os testes HTTP simulados exercitam esse caminho, sem comprovar a rejeição pelo servidor do GitHub. Não foi identificado um ambiente de ensaio isolado, previamente configurado e autorizado.

## Estados e recuperação

O estado é reconstruído das fontes do GitHub a cada reconciliação. A identidade da avaliação é formada por PR, base, head, candidato, run e tentativa. A fase transitória de escrita nunca concede autorização reutilizável.

| Estado | Entrada e saída |
| --- | --- |
| Fora de escopo | PR externo, rascunho, identidade não autorizada, diff sensível ou incompleto. Permanece aberto para revisão quando aplicável. |
| Aguardando evidência | Candidato ainda em cálculo, CI ausente ou pendente. Reavaliar por conclusão do CI ou agendamento. |
| Bloqueado | Reprovação, cancelamento, conflito, base atrasada, dados inconsistentes ou proteção sem confirmação. Push corretivo ou novo CI permite avaliação a partir do estado atual. |
| Legado armado | Pedido nativo existente permanece sob controle do mantenedor. Registrar a origem observável, inclusive se desconhecida. |
| Apto nesta avaliação | Todas as provas correspondem ao estado relido. Uma mudança conhecida invalida a autorização. Ao enviar a operação, verificar a resposta antes de anunciar integração. |
| Resultado indeterminado | Uma operação pode ter sido aceita sem resposta conclusiva. Reconsultar PR e commit efetivo. Se ainda estiver aberto, exigir avaliação completa antes de nova escrita. |
| Integrado | Confirmar SHA e identidade pela API, respeitar o merge já registrado e aguardar CI pós-merge para liberar dependências. |

- **Reprovação e correção, novo push, evento fora de ordem.** A publicação da correção segue o fluxo normal se o PR estiver desarmado. Evento antigo é apenas um sinal. Novo head descarta toda evidência anterior. Se uma mudança ocorrer depois da última leitura, o SHA enviado condiciona o merge àquele head.
- **Execuções simultâneas e indisponibilidade.** Manter a serialização existente e a varredura agendada. Encerrar a avaliação quando a base divergir da revisão confiável da execução. Se outra operação já tiver integrado, confirmar o estado em vez de insistir. A retomada dispensa armazenamento local de aprovações.
- **HTTP 403.** Distinguir permissão insuficiente, proteção e limitação temporária por cabeçalhos e contexto sanitizado. Bloquear integração até voltar a obter evidência. **405** exige reavaliar elegibilidade, conflitos e checks. **409** descarta a identidade avaliada. **422** exige distinguir validação, estado incompatível e limitação secundária. Não repetir a mesma escrita imediatamente.
- **Timeout, 429 ou 5xx.** Respeitar `Retry-After` quando presente e usar tentativas limitadas para leituras. Tratar falha de resposta da escrita como indeterminada, inclusive após interrupção. Se necessário, a próxima reconciliação consulta o estado atual do PR e o merge antes de considerar outra escrita.

## Corridas e ensaio no GitHub

O ensaio requer um ambiente isolado e autorizado, duas identidades ou clientes de teste para coordenar as mudanças, Ruleset equivalente ativo e sem bypass, CI com origem e check equivalentes e App com os mesmos privilégios de produção. Usar dados, branches e PRs fictícios. Verificar antes do ensaio os Rulesets efetivos e a ausência de bypass, pela API autorizada ou pelo mantenedor. Capturar head, base, candidato, run, tentativa, horários da leitura e da escrita, status e resposta sanitizada, estado do PR e SHA real da base após cada caso.

Para avaliar a barreira do GitHub, usar uma chamada controlada ao mesmo endpoint protegido mesmo quando o reconciliador correto pararia antes da escrita. Essa sonda é exclusiva do ambiente isolado. Para induzir as corridas, registrar a última observação do cliente, coordenar a alteração concorrente e emitir a chamada com os dados antigos. Verificar que a alteração já era observável antes da chamada. Repetir para distinguir uma corrida efetivamente atingida de latência ou estado desconhecido.

| Caso | Procedimento | Resultado necessário |
| --- | --- | --- |
| E1 — pendente ou reprovado | Reter a conclusão do job de teste e sondar. Liberar a falha e sondar novamente para o mesmo head. | Nenhum merge, PR aberto, base intacta nos dois casos. |
| E2 — novo head | Aprovar H1, publicar H2 e tentar a operação com H1. Em seguida, reconciliar H2 enquanto seu CI aguarda. | O SHA antigo é recusado pelo endpoint. H2 só fica apto após sua própria aprovação. |
| E3 — base e candidato | Aprovar C1 com pais B1 e H. Avançar a base para B2 mantendo H. Tentar com a evidência C1 e observar C2. Incluir caso de B2 já ancestral de H se a topologia do ambiente permitir. | Base atrasada bloqueia pelo Ruleset. Mesmo com head atualizado, evidência de C1 jamais autoriza C2. Se a API aceitar C2 com a prova antiga, a proposta não atende IA-P03. |
| E4 — tentativa e estado do CI | Após aprovação de C1 na tentativa 1, iniciar tentativa 2 no mesmo run e SHA. Sondar enquanto pendente, depois após falha ou cancelamento. Repetir com um novo run aplicável onde possível. | A evidência antiga deixa de autorizar merge. Registrar se a aprovação anterior continua reconhecida pelo GitHub. Qualquer aceite com a evidência antiga impede a implantação. |
| E5 — estado e elegibilidade | Alterar estado para rascunho ou fechado depois da leitura. Em casos separados, mudar alvo, origem ou política aplicável quando o cenário for reproduzível sem enfraquecer regras. | A avaliação perde validade. Para alterações não condicionadas na escrita, registrar o comportamento nativo e o risco residual. Se houver possibilidade de escapar à política, manter o bloqueio de implantação. |
| E6 — caminho positivo | Publicar correção fictícia num PR sem auto-merge ativo. Aguardar aprovação da tentativa corrente do novo candidato e integrar com o token existente da App. | Confirmar identidade, SHA e pais do merge, conteúdo equivalente ao candidato e CI da base após o merge. |

**Resultados desta revisão.** E1 a E6 estão planejados e não foram executados. Sem ambiente isolado autorizado, permanecem por comprovar a aplicação do contrato à corrida de base, a precedência de reruns e as mudanças de elegibilidade entre a leitura e a operação. O mantenedor precisa indicar um ambiente equivalente já autorizado ou autorizar explicitamente seu provisionamento em tarefa posterior. A `main` operacional fica fora dos ensaios de corrida.

## Rastreabilidade, implantação e rollback

- **IA-01 e IA-05.** Revisar a redação histórica para refletir branches internas e identidades já autorizadas. Preservar a exigência de SHA esperado e verificação de autoria da integração. A atribuição específica a uma solicitação nativa será substituída por evidência de integração protegida pela App, caso aprovada.
- **IA-02.** Revisar o armamento antecipado. Manter PR aprovado pelo Ruleset, `validar` na origem esperada e a exigência de base atualizada.
- **IA-03 e IA-04.** Preservar e ampliar os ensaios de execução confiável, menor privilégio, evidência ausente, conflito, reprovação, recusa da API e mudanças concorrentes. **IA-06 a IA-08** continuam cobrindo escopo, integridade do diff e prova do candidato. **IA-P01 a IA-P06** complementam esses critérios. A especificação histórica e suas evidências permanecem no repositório.
- **Implantação.** Somente depois de IA-P03 e E1–E6 demonstrados e aprovados, abrir PR específico para a raiz de confiança. Validar TDD, regressão e CI. Documentar a situação dos pedidos legados, revisar o diff e a política efetiva, integrar pelo procedimento de revisão específica e confirmar o CI na base e a primeira reconciliação observada.
- **Rollback.** Diante de evidência insuficiente ou regressão, interromper a adoção. Se já implantada, coordenar a contenção pelo mantenedor e revisar a reversão do commit de política em PR próprio, com CI e Ruleset intactos. Conferir execuções em trânsito e pedidos existentes antes de retomar. Se já houve merge incorreto, a reversão do mecanismo é distinta da correção do conteúdo integrado.
