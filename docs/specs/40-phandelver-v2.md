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
