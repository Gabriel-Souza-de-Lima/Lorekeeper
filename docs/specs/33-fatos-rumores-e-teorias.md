# P10-A — Fatos, rumores e evidências

- **Estado** — aprovada com ressalva de foco na validação local automatizada do Windows.
- **Objetivo** — acompanhar como uma afirmação narrativa foi registrada, sustentada, contestada ou refutada.
- **Rastreabilidade** — produto §4.9 e §4.10, MVP-07, MVP-10, MVP-11 e MVP-12. Os IDs originais P10-01 a P10-08 permanecem estáveis. P10-03 pertence à [P10-B](34-perspectivas-e-conhecimento.md), que tem aprovação própria.

## Fluxo e regras

Na área **Informações** da campanha, digitar o enunciado, escolher a natureza e confirmar. A origem inicial pode ser a sessão aberta, uma nota manual ou **Registro direto**, com instante de registro. O rótulo da listagem deriva da primeira linha do enunciado. Depois do cadastro, o detalhe oferece evidências, vínculos e histórico. O formulário revela justificativa ao confirmar ou refutar e permite acrescentar evidências em outro momento.

| Dimensão | Valores e significado |
| --- | --- |
| Natureza | Observação, relato de NPC, rumor ou teoria. Registra como a informação surgiu. Um relato continua sendo relato após a mudança de estado. |
| Estado | Em aberto, confirmado, contestado ou refutado. A criação começa em aberto. A avaliação é sempre explícita. Confirmar ou refutar exige justificativa e evidência identificável, incluindo nota manual descritiva. |
| Evidência | Sustenta, contradiz ou contextualiza. Requer descrição ou referência registrada à fonte. Evidências divergentes coexistem, e a interpretação cabe ao usuário. |

Na sessão 4, a vigia atribui a luz do farol aos contrabandistas. Na sessão 6, uma evidência contextualiza o relato ao revelar um mecanismo. Na sessão 7, outra evidência contradiz o relato e fundamenta a refutação. O detalhe conserva os três registros, a declaração original e a justificativa de cada transição.

A lista da campanha é a entrada inicial, com filtros por natureza e estado. O detalhe navega para sessões, NPCs, outras páginas da wiki e pendências vinculadas. Criar a partir de uma sessão ou destaque confirmado é uma ação explícita. A operação preserva o texto da sessão e o estado das pendências. A consulta por FTS5 e a navegação rápida P9 podem ser avaliadas depois, usando o índice existente.

## Modelo relacional SQLite proposto

| Relação | Chaves, dados e invariantes |
| --- | --- |
| `narrative_items` | UUID primário, campanha, enunciado atual, natureza, estado, origem inicial, criação, atualização e versão inteira positiva. Chave única adicional campanha + UUID para relacionamentos com escopo. |
| `narrative_history` | Campanha, UUID da informação e versão como chave composta. Registra a criação e acrescenta instantâneo do enunciado, natureza, estado e justificativa quando mudam. Guarda a origem da mudança e a evidência que fundamentou a decisão, quando aplicável. Versões podem ter lacunas quando a operação altera somente vínculos ou evidências. |
| `narrative_evidence` | UUID, campanha, informação, natureza da evidência, descrição, fonte capturada e instante. Uma correção acrescenta outra evidência com referência à anterior. A anterior continua consultável. |
| `narrative_document_links`, `narrative_pending_links` | Campanha, informação e UUID do alvo em chaves compostas com unicidade. Referências usam as tabelas existentes. Validar tipo e campanha na mesma transação da escrita. |
| `narrative_save_receipts` | Campanha + UUID da operação como chave. Guarda alvo, hash canônico da requisição e versão/resposta confirmada. A gravação é atômica com o conteúdo. |

A fonte capturada é um conjunto de campos tipados na origem inicial, no histórico e nas evidências. Inclui tipo, UUID do documento quando houver, título observado, revisão textual quando disponível, trecho ou nota manual e instante da captura. A revisão da sessão usa a chave composta documento + versão textual. Uma edição apenas de metadados da sessão não cria revisão textual. Wiki e outras fontes sem revisão compatível usam a captura manual. A informação permanece compreensível a partir desses dados históricos se o título ou o texto da fonte mudar.

Chaves estrangeiras e validação transacional impedem referências cruzadas. As fontes históricas usam restrição de exclusão, sem cascata. Sessões na lixeira mantêm referência e trecho, com indicação de indisponibilidade temporária. Restaurar a sessão reativa a navegação. Arquivar uma campanha mantém suas fontes consultáveis conforme as regras existentes. Índices iniciais atendem lista por campanha/estado e detalhe por informação/versão. A futura migração será aditiva, com verificação de integridade, preservação e rollback. O ZIP mantém as capturas históricas inclusive quando omite a sessão na lixeira. O backup SQLite mantém as relações completas.

## Salvamento e recuperação propostos

Usar um armazenamento IndexedDB próprio da P10-A, com escopo campanha + UUID da informação e identificação da aba. Guardar dados do formulário, versão-base, geração e envelope imutável da operação pendente. Reaproveitar os padrões do editor de sessões para fila local, proteção por geração e comprovante, adaptando a representação e o fluxo às informações narrativas. Rascunhos de sessão continuam no armazenamento existente.

O botão Salvar congela o UUID da operação e o payload antes do envio. Uma transação SQLite valida vínculos e base, confirma conteúdo e histórico e grava o comprovante. Falha de rede ou resposta perdida mantém a operação exata para reenvio, inclusive após reabrir. A mesma chave e payload recuperam a resposta original. Uma chave reutilizada com conteúdo diferente falha. Só a resposta confirmada permite exibir **Salvo no servidor**. Uma resposta antiga limpa apenas a geração que confirmou.

Um conflito de versão mantém o rascunho e abre a comparação com o servidor. A combinação exige nova confirmação e novo UUID de operação. A edição posterior de um rascunho fica separada do envelope já enviado. Falha local indica risco e oferece cópia ou download dos campos ainda disponíveis. Rascunhos são locais ao perfil e ao dispositivo, e sua recuperação depende do armazenamento disponível.

## Matriz de critérios e testes planejados

Cada linha indica o cenário principal, uma alternativa, a falha relevante, a dependência e a evidência esperada para aprovação futura.

| ID | Comportamento e cenário principal | Alternativa e falha | Dependência | Nível e evidência esperada |
| --- | --- | --- | --- | --- |
| P10-01 | Confirmar enunciado e natureza com origem. | Origem inicial por registro direto. Entrada vazia ou vínculo inválido mantém o banco intacto. | Campanha e fonte | SQLite e E2E com UUID, estado inicial e captura. |
| P10-02 | Alterar avaliação preservando a natureza. | Contestar sem conclusão. Confirmar/refutar sem evidência ou justificativa é rejeitado. | P10-01 | Unitário e SQLite com combinações válidas, rejeições e estados anteriores preservados. |
| P10-04 | Adicionar evidência e reclassificar. | Acrescentar evidência sem mudar estado. Falha injetada reverte a operação inteira. | P10-01/02 | SQLite com transação real, histórico ordenado e rollback. |
| P10-05 | Navegar para sessão, NPC, wiki e pendência. | Origem manual sem destino navegável. UUID ausente gera indicação de indisponibilidade. | Sessões, wiki, P6 e P7 | E2E com abertura dos destinos corretos e independência da pendência. |
| P10-06 | Operar somente dentro da campanha. | Dois NPCs homônimos têm IDs distintos. ID externo é rejeitado sem alterações parciais. | P10-05 | SQLite com campanhas isoladas e verificação de chaves. |
| P10-07 | Detectar edição concorrente e recuperar resposta perdida. | Reabrir offline com rascunho. Falha de armazenamento ou operação divergente mantém o texto disponível e evita duplicação. | IndexedDB, versão e comprovante | Unitário para gerações, SQLite para corrida e idempotência, E2E para perda da resposta e recuperação. |
| P10-08 | Exportar e restaurar informação, histórico e fontes. | Fonte na lixeira permanece como captura no ZIP. Destino ocupado ou backup inválido preserva o original. | Exportação e backup existentes | SQLite e ZIP com cópia isolada, integridade e comparação de IDs, fontes e versões. |
| P10-09 | Gravar somente após confirmação explícita. | Cancelar ou fechar antes de salvar. Erro de rede mantém a confirmação pendente. | P10-07 | E2E e SQLite com consulta antes e depois de salvar. |
| P10-10 | Manter enunciados, justificativas e evidências anteriores. | Corrigir evidência por novo registro. Falha intermediária preserva as versões existentes. | P10-04 | SQLite com comparação de instantâneos e rollback. |
| P10-11 | Manter evidências favoráveis e contrárias lado a lado. | Acrescentar evidência contextual. Reenvio idêntico mantém uma única evidência e o mesmo estado. | P10-04/07 | SQLite e E2E com ambas as evidências e estado inalterado. |
| P10-12 | Preservar captura histórica ao editar, arquivar, mover à lixeira ou restaurar uma fonte. | Wiki sem revisões usa captura manual. Fonte indisponível conserva a descrição e o UUID. | P10-05/06 e lixeira atual | SQLite e E2E com captura invariável e retorno da navegação. |
| P10-14 | Cadastrar com enunciado e natureza em tela estreita. | Usar teclado. Erro de validação mantém os campos e informa como prosseguir. | P10-01/09 | Playwright em 320 px, rótulos, foco, campos mínimos e largura sem transbordo. |

## Dependências, riscos e decisões pendentes

P6 fornece vínculos com pendências. P7 fornece sessão e destaques confirmados como possíveis fontes. P8 preserva origem de texto importado. P9 pode receber integração depois de validada a navegação contextual. A P10-A pode ser entregue sem campos ou tabelas de perspectivas.

A captura pode divergir do conteúdo atualizado da fonte, por isso a interface identifica instante e revisão quando disponíveis. Capturas longas aumentam o ZIP, e a perda do armazenamento do navegador pode remover rascunhos ainda pendentes. Manter recibos e histórico aumenta o volume do SQLite.

### Decisões que exigem aprovação do mantenedor

| Decisão | Alternativas e consequências | Recomendação |
| --- | --- | --- |
| Origem inicial e título | Exigir fonte e título melhora catalogação imediata e torna a captura mais longa. Derivar o título e usar registro direto reduz campos. | Derivar o título e oferecer origem opcional no cadastro. Exigir fonte identificável e justificativa só ao confirmar ou refutar. |
| Alteração de evidência | Revisar o mesmo registro simplifica a lista, mas exige histórico separado. Acrescentar correção preserva a fonte original diretamente. | Correção por acréscimo, destacando a versão vigente. |
| Descoberta de informações | Lançar com FTS5 e P9 amplia acesso e aumenta o trabalho de indexação e navegação. Uma lista contextual valida primeiro o fluxo principal. | Entregar lista e filtros por campanha. Avaliar FTS5/P9 depois. |
| Retenção de comprovantes | Retenção por prazo reduz volume e limita recuperação de operações antigas. Retenção enquanto existir o registro simplifica o reenvio. | Reter pelo ciclo de vida do registro nesta primeira entrega. Medir o custo antes de definir expiração. |

Durante a implementação futura, cada cenário começa com Red, passa pela menor mudança que satisfaz o teste e repete a validação após Refactor. Os resultados serão registrados no respectivo PR.


## Implementação da P10-A

A migração V16 cria as seis relações documentadas. As capturas são objetos JSON com UUID e revisão de origem expostos em colunas geradas protegidas por chaves estrangeiras. Os vínculos de origem, documentos e pendências têm escopo de campanha no SQLite. O histórico acrescenta um instantâneo ao mudar enunciado, natureza ou estado. Evidências e vínculos avançam a versão de concorrência, inclusive quando a mesma avaliação continua. As correções de evidências acrescentam registros com referência à versão anterior. Os vínculos podem ser acrescentados de forma idempotente.

A API por campanha expõe lista filtrável, detalhe e gravação versionada em `/api/campaigns/:campaignId/information`. A gravação usa `PUT /:id` e `Idempotency-Key`. Comprovantes permanecem pelo ciclo de vida do registro e guardam o resultado original completo. Histórico maior aumenta o custo de novos comprovantes, que é uma limitação desta versão.

O IndexedDB `lorekeeper-narrative` usa escopo de campanha e UUID de rascunho, com trava por rascunho entre abas. A recuperação exige reabrir a aplicação em condição suportada. O texto já aberto continua editável offline. Depois de um envio sem confirmação, o formulário conserva a operação exata até a resposta. Se a proteção local falhar, a interface disponibiliza o arquivo JSON do rascunho.

## Evidências Red → Green → Refactor

- **Red** — os testes SQLite obtiveram 404 e banco V15. O E2E não encontrou a área Informações. O teste de geração dependia da camada de rascunhos ainda ausente.
- **Green** — a integração verificou estado inicial, transição justificada, duas evidências divergentes, correção por acréscimo, isolamento, comparação de versões, preservação da captura e restauração SQLite. O navegador recuperou o rascunho e recuperou a resposta de uma operação já gravada.
- **Refactor** — as origens passaram a compartilhar o mesmo seletor e apresentação. O encerramento dos E2E usa clientes e servidores isolados. Os testes verificam conflito, falha do IndexedDB, navegação e regressão no fluxo protegido.

A P10-B e a reformulação visual mantêm suas aprovações próprias.


A cobertura executável da P10-A está em `tests/unit/narrative.test.ts`, `tests/integration/narrative.test.ts` e `tests/e2e/narrative.spec.ts`. Os ensaios SQLite usam arquivos temporários. A validação E2E usa Chromium em Linux. O Windows permanece sem ensaio manual nesta entrega.

## Aceite local no Windows

Checkout limpo em `main` com `dad322d`, igual à referência remota. Node.js 24.22.3 e npm 11.19.1. A navegação automatizada em Chromium verificou que o JavaScript entregue era idêntico a `dist/assets/index-B0tqtAAk.js`. O servidor do ensaio usou `PORT=0`, `LOREKEEPER_DB_PATH` em diretório temporário e perfil de navegador isolado. O processo em 3000 e os dados operacionais ficaram fora dos testes. [PR #63](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/63) · [CI de P10-A](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45525308293)

| Critério | Resultado | Evidência |
| --- | --- | --- |
| P10-01 | Aprovado | Cadastro pela interface de Mistérios do Farol, Relato de NPC, Em aberto, título derivado e captura da sessão 4. |
| P10-02 | Aprovado | Contestado e Refutado com justificativa e evidência, preservando a natureza. As rejeições exigidas passaram nos testes de domínio e integração. |
| P10-04 | Aprovado | Evidências das sessões 6 e 7, correção por acréscimo e rollback exercitado pela integração. |
| P10-05 | Aprovado | Navegação para Vigia, pendência e sessão de origem restaurada. A pendência continuou aberta. |
| P10-06 | Aprovado | Uma sessão de Floresta Antiga foi rejeitada com 404 e o detalhe permaneceu idêntico. |
| P10-07 | Aprovado | E2E de IndexedDB, perda de resposta, preservação de rascunho em conflito e reenvio. |
| P10-08 | Aprovado | ZIP com evidências, histórico e captura da fonte na lixeira. A CLI restaurou um SQLite separado, com integridade e chaves estrangeiras verificadas e consultas iguais às originais. |
| P10-09 | Aprovado | Consulta vazia antes de Salvar e após cancelar, com confirmação explícita observada no navegador. |
| P10-10 | Aprovado | Sequência Em aberto, Contestado e Refutado, com enunciado e evidência anterior preservados. |
| P10-11 | Aprovado | Evidências contextual e contraditória no ensaio, favorável e contraditória no E2E oficial. |
| P10-12 | Aprovado | Renomear e editar a sessão conservou a captura. Na lixeira, a captura ficou legível e indisponível para navegação. Restaurar reativou o acesso. |
| P10-14 | Aprovado com ressalva | Largura de 320 px sem rolagem horizontal. Teclado acionou cadastro e cancelamento. Enunciado em branco gerou mensagem e deixou o campo intacto. Após cancelar, o foco foi para `body`. |

**Problema de interface, severidade baixa (P10-14).** Em 320 px, abra **Nova informação** pelo teclado, preencha o enunciado e acione **Cancelar** com Enter. O formulário fecha e o banco permanece sem registro, mas `document.activeElement` volta a `body` em vez de **Nova informação**. Isso interrompe a continuidade pelo teclado. Uma correção futura pode devolver o foco ao controle de origem quando o formulário fechar. A legibilidade e o esforço de uso durante uma sessão permanecem para avaliação humana.

**Regressão.** `npm run lint`, `npm run typecheck` e `npm run build` passaram. A suíte geral aprovou 5 unitários, 83 integrações e 42 E2E. A integração focada em `narrative.test.ts` e `perspectives.test.ts` passou 10/10, e `npx playwright test tests/e2e/narrative.spec.ts tests/e2e/perspectives.spec.ts --repeat-each=3` passou 21/21. Nenhuma falha ou caso ignorado nessas suítes. O roteiro complementar teve ajustes de seletores e de contexto do navegador durante a execução, antes de completar o fluxo. O ensaio foi automatizado no Windows e não representa validação manual do mantenedor. [E2E narrativo](../../tests/e2e/narrative.spec.ts) · [Integração narrativa](../../tests/integration/narrative.test.ts)
