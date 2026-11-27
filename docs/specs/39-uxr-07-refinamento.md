# UXR-07 — Refinamento após avaliação humana

O mantenedor registrou as lacunas abaixo e manteve o aceite final em aberto. Base `3a28e52`, CI do PR #80 aprovado. [Auditoria UXR-07](../ux-ui/auditoria/uxr-07.md) · [Codex](../ux-ui/design-system-codex.md)

| ID | Causa verificada no código | Aceitação e rastreabilidade |
| --- | --- | --- |
| UX70-01 | A retomada monta uma lista parcial além da lista principal. A projeção da API de sessões omite o resumo. | Uma lista de todas as sessões ativas, com título, data, número quando houver e resumo confirmado, sem trecho automático. Área principal acionável, ação de lixeira separada. Anexos e administração após a lista. P1/P7, G02/G04/G07, F01/F02/F03/F06. |
| UX70-02 | Sessões tenta focar um título sem indicar que a lista é o destino atual. | Sessões chega à lista, rola e foca o título, com indicação ativa coerente. G01/G05, F01/F11. |
| UX70-03 | Disponibilidade dos destinos depende do atalho rápido e os módulos protegem saída por mecanismos diferentes. | Destinos pertinentes disponíveis com proteção contextual das mudanças e operações. Ações de salvar, descartar ou manter rascunho apenas quando seguras. G04/G05/G09/G13, F03–F05/F07/F08/F11–F16. |
| UX70-04 | Localização rápida ocupa a área principal. Lateral recolhida esconde o grupo. | Localização e Favoritos no acervo, com Ctrl+K preservado. Desktop recolhido mantém os destinos com nomes acessíveis e ícones. Mobile mantém expansão em fluxo. G01/G05–G08/F11/D05/D11. |
| UX70-05 | A Wiki monta o artigo Markdown mesmo com corpo vazio. | Página sem descrição mantém ações e vínculos, sem artigo vazio. G03/G12/F08/D13. |

A API legada de retomada fica disponível para clientes existentes. A listagem recebe somente a projeção aditiva do resumo. Exclusões da P11 e aceite final permanecem fora desta entrega.

## Implementação e evidências

- **Red** — os cenários novos reproduziram a ausência de uma lista principal identificável e a falta de diálogo contextual ao sair do editor. A verificação de área acionável também reproduziu um alvo limitado à largura do texto.
- **Green** — a visão geral passou a listar as sessões confirmadas em uma consulta. O diálogo permite confirmar, descartar, cancelar ou manter um rascunho conforme as garantias de cada módulo. O foco chega à lista e a área principal da sessão ocupa a largura do cartão.
- **Refactor** — a leitura legada continua disponível no servidor. A visão geral reutiliza os módulos de wiki, pendências e anexos. A proteção de navegação coordena os mecanismos existentes de gravação e de rascunho, sem acrescentar persistência no servidor.

[Testes do refinamento](../../tests/e2e/campaign-sessions.spec.ts) · [Retomada e lixeira](../../tests/e2e/campaign-recap.spec.ts) · [Recuperação de sessão nova](../../tests/e2e/session-create-on-save.spec.ts) · [Concorrência e revisões](../../tests/e2e/revisions.spec.ts) · [Localização e favoritos](../../tests/e2e/quick-navigation.spec.ts)

Na primeira entrega, o diálogo oferecia confirmação individual para a edição de sessão. A seção de confirmação contextual abaixo amplia esse comportamento. Múltiplas operações são enumeradas e continuam protegidas até que o usuário possa resolver cada uma. O aviso nativo de recarga ou fechamento é condicionado pelo navegador, que pode limitar sua exibição. A proteção local de rascunho segue o contrato de cada editor.

As capturas da aplicação real compararam a visão geral anterior e a nova em 1280 CSS px com o mesmo acervo fictício em SQLite isolado. Também foram registrados a lateral recolhida, o personagem sem descrição e o diálogo de saída. Avaliação de leitor de tela, Android físico e aceite final permanecem com o mantenedor. [Roteiro de validação](../ux-ui/auditoria/uxr-07.md#refinamento-após-a-avaliação-humana)

A regressão local em Linux passou com lint, análise de tipos, build, 5 testes unitários, 83 de integração e 53 E2E em Chromium com dois workers. O E2E focal também verifica cinco larguras entre 320 e 1920 CSS px. O aviso de bundle permanece, com cerca de 508 kB de JavaScript minificado e 152 kB gzip.

### Recuperação do primeiro CI do PR #81

O job `validar` reprovou o candidato `ce57064` na asserção de foco de Sessões. O teste enviava Enter sem esperar o fim do carregamento acionado por Voltar à campanha. Interceptar a consulta da lista e liberá-la após o Enter reproduziu a mesma falha local. O teste corrigido confirma que o botão fica desabilitado durante a consulta e o aciona após a lista ficar visível e o botão ficar habilitado. As asserções de foco e destino ativo foram preservadas. A suíte focal passou nas 12 execuções com dois workers. [Job do primeiro candidato](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/46013854194/job/140555877384)

O mantenedor desativou o auto-merge antes da atualização da branch. A correção `3ba4e1b` passou no job `validar` para o candidato sintético `2936c43`. O Lorekeeper PR Bot solicitou novamente o auto-merge e integrou o PR em `925bf05`. O CI da `main` também passou nesse commit. A regressão local corrigida passou com 53 E2E em dois workers, além das 12 execuções focais. O refinamento permanece em avaliação pelo mantenedor e a P11 continua aguardando autorização. [Histórico do PR #81](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/81) · [CI do candidato](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/46021710974/job/140582717450) · [CI pós-merge](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/46021985816)

### UX70-03 — Confirmação contextual

| Caso | Critério de aceitação | Evidência prevista |
| --- | --- | --- |
| UX70-03a | Um anexo selecionado e apto ao envio oferece **Enviar anexo e continuar**. A interface só muda de destino após confirmação do servidor. Uma resposta perdida preserva o arquivo e o UUID para o reenvio original. | E2E com SQLite, resposta retida e reenvio. |
| UX70-03b | Uma nova página da wiki com título válido oferece **Criar página e continuar**. Erros preservam a edição. Sem título válido, permanecem as opções de cancelar e descartar. | E2E com confirmação, conflito e formulário incompleto. |
| UX70-03c | **Salvar e continuar** permanece para sessão apta. Operações simultâneas ou sem confirmação segura preservam a proteção conservadora. A confirmação é sempre explícita. | Regressão de sessões e E2E com múltiplas alterações. |

Anexos e novas páginas reutilizam a mesma submissão do formulário, a validação existente e o UUID original. O diálogo aguarda o retorno de sucesso. Se o envio falhar, mantém a tela e oferece Cancelar para voltar à edição. Uma confirmação incerta segue o reenvio já disponível no respectivo módulo, com o identificador original. A criação na wiki exige título com conteúdo, e o envio de anexo exige um arquivo com tamanho e extensão permitidos. A validação do conteúdo do arquivo permanece no servidor.

A confirmação de sessão mantém os critérios MVP-03, MVP-04, MVP-06 e MVP-07. Os casos de anexo e wiki complementam [P5](28-anexos.md) e [a wiki do Incremento 3](10-cadastro-da-wiki.md). A interface oferece uma ação de confirmação quando há uma única operação elegível. Um anexo simultâneo à seleção de vínculo ou à renomeação permanece protegido como operação múltipla.

| Formulário avaliado | Condição para oferecer confirmação contextual |
| --- | --- |
| Cadastro e edição de campanha | O callback do formulário não informa o resultado da gravação. O cadastro também não oferece um identificador idempotente para reconciliar perda de resposta. |
| Renomeação na wiki e em anexos, vínculos e tags | Cada fluxo permanece no controle de edição correspondente. Seria necessário expor o resultado e preservar as condições de concorrência ou o alvo exato do reenvio. |
| Captura, encaminhamento e importação | Têm mecanismos próprios de confirmação. A captura exige persistir a operação localmente antes do POST. A importação normalmente abre a sessão criada. A confirmação contextual nesses fluxos exigiria testes específicos sobre limpeza local, reenvio e escolha de destino. |
| Pendências, informações narrativas e perspectivas | Permanecem com seus comandos de edição, reconciliação e revisão. Fechar pelo diálogo só segue as garantias existentes para descarte ou rascunho protegido. |

**TDD** — Red reproduziu a ausência de **Enviar anexo e continuar**. Green validou conflito da wiki, preservação dos campos, reenvio idempotente do anexo e saída após sucesso. A regressão focal preserva o descarte de uma página incompleta e a proteção quando há mais de uma edição.

**Refactor** — o formulário e o diálogo chamam a mesma operação e usam o mesmo resultado explícito de confirmação. O diálogo mantém o tratamento compartilhado de foco, erro, descarte e cancelamento.

A validação local passou com lint, análise de tipos, build, 5 testes unitários, 83 de integração e 54 E2E com dois workers. A rodada focal cobriu 7 testes.
