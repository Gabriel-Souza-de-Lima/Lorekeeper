# Phandelver V2 — apresentação aprovada para implementação

A aprovação do protótipo autoriza A–D. A integração e o CI pós-merge de cada etapa antecedem as dependentes. Aceite humano, UXR-07 e P11 mantêm seus pontos de decisão.

O V2 substitui a composição de P1/P7 e UX70-01/02, a localização rápida de P9 e UX70-04/06 e a apresentação anterior de pendências, missões e anexos. P9 conserva Favoritos. P1/P7 conservam histórico, confirmação e resumos. A evidência anterior continua válida para o comportamento que verificou. [Refinamento anterior](39-uxr-07-refinamento.md)

| ID | Critério | Etapa e rastreabilidade |
| --- | --- | --- |
| PHV2-01 | Painéis representam o estado atual, origens e cronologia permanecem consultáveis. | A/B, UX-G01/F01 |
| PHV2-02 | Indicadores integrais, inclusive vazio e carga. | B, UX-G03/F01 |
| PHV2-03 | Três recentes e catálogo independente com resumo confirmado e lixeira. | B, UX-G04/F01/F02 |
| PHV2-04 | Missões ativas e encerradas reutilizam páginas quest. | C, UX-G01/F08 |
| PHV2-05 | Pendências abertas e fechadas, oito por página, painel com até três abertas. | B/C, UX-F12 |
| PHV2-06 | Detalhe e formulários sob demanda, retorno contextual, guard e histórico. | C, UX-G05/G09/F12 |
| PHV2-07 | Marca retorna a Campanhas com guard, remoção de localização rápida, preservação de Busca e Favoritos. | B, UX-G01/G05/F11 |
| PHV2-08 | Estados textuais e semânticos, hierarquia Codex e confirmação no editor. | C, UX-G06/D02/D12 |
| PHV2-09 | Anexos compactos, envio sob demanda, ações responsivas e operações existentes. | C, UX-G08/F14 |
| PHV2-10 | 35 entidades originais, missões na wiki, fontes, refutações e perspectivas isoladas. | A/D, UX-F08/F15/F16 |
| PHV2-11 | Geometria, foco, teclado, contraste e cinco larguras de referência. | D, UX-G05–G08/D05 |
| PHV2-12 | Regressão integral de contratos e UX existente. | A–D, MVP-03/04/06/07/09/11/12 |
| PHV2-13 | Fixture compartilhada em testes, SQLite isolado, conteúdo representativo e oráculo independente. | A, UX-G03/F01 |

## A — Mapeamento esperado

O adaptador usa somente operações públicas do produto, em SQLite novo criado em diretório temporário. Sessões e referências são mapeadas por UUID. Origens narrativas apontam para a sessão correspondente. Histórico de pendências é reproduzido pelas transições, com o número da sessão e a justificativa preservados nas observações. Páginas quest guardam estado atual binário. A cronologia original permanece no corpo Markdown, sem criação de um histórico operacional. Os anexos TXT serão convertidos em PDFs textuais usando os textos simulados do pacote. As referências editoriais `sourcePages` ficam na fixture.

### Uso reproduzível

Com Node e dependências do projeto, execute `npm run build` e `node tests/fixtures/phandelver/serve.ts complete`. Use `load` para uma base separada com as 20 pendências adicionais. A CLI exibe URL loopback, porta efêmera, caminho que pode ser reutilizado com `LOREKEEPER_DB_PATH` e contagens observadas. Cada execução cria um diretório novo e recusa inicializar uma API que já tenha campanhas, inclusive arquivadas. Os anexos usam o armazenamento SQLite do produto e ficam no mesmo banco temporário. A CLI mantém o banco para inspeção após encerrar.

| Dados | Representação e limites |
| --- | --- |
| Sessões | Oito sessões com número, data, texto, registro pessoal e resumo confirmado. A versão inicial e confirmação usam comprovantes reais. Nível e páginas editoriais permanecem no JSON de referência. |
| Wiki | 35 páginas de pessoas e localidades com cronologia no corpo, mais 12 páginas quest. Backlinks apontam para a sessão de origem. O produto permite um personagem em destaque por campanha. |
| Missões | Estado binário real e origem vinculada. Justificativas de transição e referências wiki–wiki ficam no Markdown. |
| Pendências | Tipos, origens, vínculos e transições reais. Datas de gravação são as do ensaio. Ordem por sessão e justificativa originais ficam em Observações. |
| Informações e perspectivas | Origens e evidências por sessão, avaliação narrativa, revisões e atribuições explícitas por sujeito. Quando a fixture só informa que o sujeito conhece algo, a atribuição indica relato, sem presumir que conhece toda evidência. |
| Notas e anexos | Notas atribuídas à campanha e vinculadas à sessão original. Os seis TXT são PDFs com o mesmo conteúdo e a origem no metadado. |
| Isolamento | Campanha principal, controle vazio e campanha pequena de nome longo. O teste compara duas bases independentes e inspeciona integridade e chaves estrangeiras. UUIDs de documentos são determinísticos por variante. IDs de campanha são gerados pela API. |

O validador original do pacote passou no HTML e nos dados do anexo. Red reproduziu a ausência do adaptador. Green verificou os oráculos, fontes e isolamento com SQLite em disco. Refactor concentra o mapeamento no seed reutilizável pelos testes e pela CLI. [Teste da etapa A](../../tests/integration/phandelver.test.ts)

O HTML original e seu validador permanecem no ZIP aprovado, fora do bundle e do repositório. Para conferir a origem, o SHA-256 do HTML é `6618e8d13feae6d6896ef2ad557de9eefa7b3f2ae0164c9200cb2354c112e18e`. Os dados estruturados, anexos simulados, oráculo e roteiro compartilhados estão em `tests/fixtures/phandelver/`.

Validação A local em Linux: lint, tipos e build aprovados, 5 unitários, 84 de integração e 57 E2E com dois workers. A CLI serviu a campanha completa na aplicação real e foi usada para a captura de referência antes das mudanças.

## B — Estrutura e visão geral

A visão geral consulta as listas integrais de sessões, pendências abertas e wiki da campanha. Os indicadores usam essas listas antes dos cortes. O catálogo independente pagina oito sessões por vez, conserva leitura confirmada e expõe a lixeira. Sessões recentes têm somente a ação de abrir o documento.

A marca volta ao acervo com a proteção compartilhada. Favoritos têm destino próprio e admitem filtro local e remoção. É possível adicionar um favorito na sessão ou página da wiki. A consulta de Busca, seus filtros e retornos permanecem. As entradas Missões e Pendências abrem as respectivas coleções existentes, que serão refinadas na etapa C.

A etapa A foi integrada em `5db7c0e`. [PR #85](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/85) · [CI pós-merge A](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/46056927828)

Red falhou pela ausência dos indicadores. Green conferiu 8/2/8/22, a ordem 8–7–6, lista independente e a campanha vazia. Refactor reutiliza cartões entre visão geral e catálogo e remove o código do localizador rápido. A regressão manteve homônimos na busca, Favoritos, rascunhos e lixeira. Lint, tipos, build, 5 unitários, 84 de integração e 58 E2E passaram. [Aceitação B](../../tests/e2e/phandelver-v2.spec.ts)

O primeiro CI de B reprovou a comparação da base do seletor e do botão de estado em Pendências. A medição anterior lia coordenadas da janela em chamadas separadas após redimensionar. A correção obtém as duas alturas e bases no mesmo contexto de layout, com a mesma tolerância de 1 CSS px. O cenário passou oito vezes localmente com dois workers. [Job inicial do PR #86](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/46057952259/job/140704928016)

## C — Coleções operacionais

B foi integrada em `994d0f9` após o teste geométrico passar no candidato corrigido. [PR #86](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/86) · [CI corrigido](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/46058690335) · [CI pós-merge B](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/46058920817)

PHV2-04 usa páginas wiki `quest` e a projeção de missões abertas para distinguir Ativas e Encerradas. Sem novas transições ou histórico operacional. PHV2-05/06 mantém guia e página quando se abre uma pendência. O detalhe oferece retorno com foco no item quando ainda está na lista e no título da coleção nos demais casos. Os formulários mantêm a proteção existente e só abrem por ação explícita. PHV2-08 usa tokens semânticos para os quatro estados com identificação textual. PHV2-09 mantém anexos expansíveis, com metadados e nomes separados da linha das ações e envio sob demanda.

Red verificou que a tela anterior não oferecia a coleção paginada. Green confirmou 28 abertas em quatro páginas, 16 fechadas, retorno com foco, guias de missões, formulário sob demanda, anexos em 320 px e envio idempotente. Refactor reutiliza o paginador e mantém as mutações no backend existente. Reenvios de pendência usam o mesmo payload, inclusive quando o servidor grava mas a resposta se perde. Lint, tipos, build, 5 unitários, 84 de integração e 60 E2E passaram. [Aceitação C](../../tests/e2e/phandelver-v2.spec.ts) · [Reenvio e conflito](../../tests/e2e/pending-items.spec.ts)

## D — Coesão e validação consolidada

A etapa C foi integrada em `9c91c42`. [PR #87](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/87) · [CI do PR](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/46059784064) · [CI pós-merge C](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/46060008354)

A comparação lado a lado mostrou que a descrição longa separava a ação principal dos metadados no desktop. O cabeçalho reunirá os metadados com a identificação, com quebra em telas estreitas. O estado textual e semântico da pendência será reutilizado no painel compacto e na coleção. As medidas de aceitação verificam a geometria interna de cartões e anexos e o contraste da amostra de estados, além dos testes de fluxo existentes.

| Critério | Evidência de validação técnica |
| --- | --- |
| PHV2-01 | A visão geral usa o estado atual e não oferece seletor temporal. As fontes e datas de sessão continuam nos registros. |
| PHV2-02 | A API e a interface conferem 8/2/8/22. A variante de carga mostra 28 abertas, a base vazia mostra zero e a nona sessão muda o total após nova consulta. |
| PHV2-03 | Ordem 8–7–6 na visão geral, catálogo com oito por página, resumo confirmado e teste de lixeira e restauração. |
| PHV2-04 | Ativas 2, Encerradas 10, leitura da página quest e retorno à guia. Mudança de estado usa o contrato da wiki. |
| PHV2-05 | 28 abertas em quatro páginas, 16 fechadas em duas. O painel mantém até três. |
| PHV2-06 | A lista sai do detalhe, retorno restaura página e foco, criação e edição sob demanda e histórico disponível. Testes cobrem conflito de edição e resposta de criação perdida. |
| PHV2-07 | Marca com proteção de rascunho, ausência do antigo atalho, homônimos pela Busca e marcação via sessão ou wiki. |
| PHV2-08 | Quatro estados nomeados com as cores semânticas. Contraste da amostra nas listas pelo menos 4,5:1. Indicadores do editor exercitados pela regressão. |
| PHV2-09 | Largura do nome e posição das ações medidas em cinco larguras. Fluxos de envio, validação, consulta, vínculo, renomeação e perda de resposta cobertos na regressão. |
| PHV2-10 | 35 pessoas e localidades além de 12 missões. Origens, evidência contraditória, narrativas e perspectivas verificadas com SQLite e dados cruzados. |
| PHV2-11 | Chromium a 320, 390, 768, 1280 e 1920 CSS px, com inspeção de cartões e anexos, largura útil, alvos e foco. Capturas da referência e da UI em testes isolados. |
| PHV2-12 | Lint, tipos, build, regressão de API, migrações e navegador. Os testes existentes continuam exercitando gravação, concorrência, histórico, restauração, busca e exportação. |
| PHV2-13 | CLI reproduzível, variante separada e verificação de integridade SQLite e chaves estrangeiras. |

Red falhou pela ausência da indicação de estado no painel compacto. Green confirmou a indicação, a geometria de cartões e anexos e os quatro contrastes textuais. Refactor compartilha o rótulo e o token semântico entre painel e coleção. [E2E Phandelver V2](../../tests/e2e/phandelver-v2.spec.ts)

### Aceite local

1. Rode `npm run build` e `node tests/fixtures/phandelver/serve.ts complete`. Use a URL exibida e confira 8/2/8/22, três sessões recentes, acesso pelo indicador e pelo botão Ver todas.
2. Abra uma sessão pelo catálogo, edite sem salvar e acione a marca. Cancele a saída, confirme que o texto ficou, depois mantenha o rascunho e reabra a sessão. Marque um favorito e encontre-o em Favoritos.
3. Alterne as guias de Missões e Pendências. Em `load`, percorra as quatro páginas abertas, abra um item da segunda e confirme o retorno à mesma página. Confira o formulário sob demanda e o histórico.
4. No celular, expanda a navegação e abra Anexos da campanha. Confira nomes longos, ações em linha própria e envio sob demanda. Em uma operação fictícia, tente sair com um arquivo selecionado e confira a confirmação contextual.

A implementação mantém editor, telas de histórico, Busca, exportação e backups operacionais, que excedem a simulação. Favoritos abre em destino próprio e é alterado no documento. A fonte visual usada foi o HTML aprovado, com os tokens existentes na aplicação operacional. A avaliação técnica local foi Chromium/Linux. Windows, Android físico, tecnologia assistiva e aceite de experiência continuam pendentes. UXR-07 permanece aberta e P11 aguarda autorização.

Regressão final local aprovada com lint, análise de tipos, build, 5 unitários, 84 testes de integração e 61 E2E em dois workers. Bundle JavaScript de 515,70 kB minificado e 153,51 kB gzip, com o aviso preexistente preservado.
