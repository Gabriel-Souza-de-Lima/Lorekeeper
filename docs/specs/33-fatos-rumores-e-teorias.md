# P10 — Fatos, rumores e teorias

- **Estado** — proposta para avaliação. A implementação exige aprovação pessoal.
- **Objetivo** — registrar informações narrativas, localizar suas fontes e acompanhar mudanças no que se sabe ao longo da campanha.
- **Rastreabilidade** — produto §4.9 e §4.10, MVP-07, MVP-10, MVP-11 e MVP-12.

## Casos de uso

- Durante uma sessão, o jogador anota que uma vigia afirma ter visto uma luz no farol. Depois consegue recuperar a frase original e abrir a sessão e a página da vigia.
- Outra sessão revela que a luz vinha de um barco. O jogador acrescenta a nova evidência e registra que a afirmação original foi refutada.
- Na próxima sessão, o jogador consulta apenas as informações conhecidas pela personagem Marina e abre a pendência ligada ao farol quando precisar escolher o que investigar.

## Comportamento e regras propostos

Natureza, estado da apuração e conhecimento são três dimensões independentes. A natureza registra observação, relato de NPC, rumor ou teoria. O estado pode ser em aberto, confirmado, contestado ou refutado. **Fato confirmado** é a apresentação de um registro confirmado pelo usuário. Uma declaração de NPC continua identificada como declaração depois de ser confirmada ou refutada.

O jogador registra quais personagens conhecem cada informação. Uma informação sem personagens atribuídos aparece como conhecida somente pelo jogador. O filtro de personagem é um recurso de apresentação para o uso pessoal. A marcação usa o modelo pessoal de usuário único.

Criar, corrigir e reclassificar exige confirmação explícita. O usuário pode vincular fontes que sustentam, contradizem ou contextualizam a afirmação. Confirmar ou refutar deve registrar o motivo e alguma proveniência, inclusive uma nota manual quando o usuário não tiver uma sessão aplicável. Evidências divergentes podem coexistir. O usuário registra diretamente resumos, vínculos, estados e distinções de conhecimento.

## Modelo de dados possível

| Registro | Dados e regras propostas |
| --- | --- |
| Informação | UUID estável, campanha, revisão atual, criação e arquivamento reversível. |
| Revisão de informação | UUID da informação, versão crescente, enunciado, natureza, estado, justificativa e instante. A primeira registra o enunciado original. |
| Evidência | Informação, revisão em que entrou, classificação sustenta/contradiz/contextualiza, citação ou nota, UUID de sessão e NPC quando conhecidos e data do registro. Corrigir uma evidência acrescenta uma versão que cita a anterior. |
| Conhecimento | Informação, personagem e revisão em que a atribuição entrou ou terminou. Guarda a evolução da perspectiva sem sobrescrever o histórico. |
| Relação com pendência | UUIDs da informação e da pendência da mesma campanha. A pendência continua a controlar o trabalho de investigação e tem histórico próprio. |

IDs de campanha, sessão, NPC, personagem e pendência usam as entidades existentes. Uma origem manual continua legível sem sessão ou NPC vinculados. Sessões na lixeira mantêm seus IDs, citações e proveniência, com navegação indicada como indisponível até restauração. A eventual migração seria aditiva. Exportação e backup teriam de preservar revisões, evidências, perspectivas e vínculos.

## Controle de versões e falhas

Uma gravação proposta fornece UUID de operação e revisão-base. A transação valida o escopo da campanha, acrescenta a revisão e publica as relações em conjunto. Um reenvio idêntico recupera o comprovante. Uma edição atrasada compara as versões e conserva a edição local até uma nova confirmação. Relações inválidas ou uma falha na gravação mantêm a versão confirmada. O detalhamento das rotas e da proteção de rascunho fica para uma especificação aprovada.

## Navegação e apresentação

Na campanha, uma lista **Informações** poderia exibir enunciado, tipo, estado e origem. Filtros por estado, sessão de origem e personagem permitem preparar uma sessão. A vista **O que Marina sabe** incluiria apenas informações atribuídas à personagem.

O detalhe começa pela afirmação atual e mostra a cadeia de evidências na ordem em que foram registradas. Por exemplo, **Relato de NPC · Refutado**, seguido de **Sessão 4 · Declaração da vigia** e **Sessão 6 · Luz identificada no barco**. Os vínculos permitem voltar à sessão e à página da vigia. A pendência **Investigar a luz** pode aparecer ao lado, com estado independente. Depois de validar a estrutura, a navegação rápida pode reutilizar a busca para localizar informações.

## Critérios de aceitação sugeridos

| ID | Critério | Teste proposto |
| --- | --- | --- |
| P10-01 | Criar uma informação com natureza, estado e proveniência. | Integração e E2E |
| P10-02 | Distinguir relato, rumor, teoria e confirmação sem confundir a fonte com o estado. | E2E |
| P10-03 | Consultar o conhecimento de um personagem e do jogador. | Integração e E2E |
| P10-04 | Acrescentar evidência e revisar estado sem apagar o registro original. | SQLite |
| P10-05 | Navegar para sessão, NPC e pendência vinculados. | E2E |
| P10-06 | Rejeitar relações entre campanhas e manter a proveniência na lixeira. | SQLite |
| P10-07 | Detectar concorrência, preservar o rascunho e recuperar reenvio. | SQLite e E2E |
| P10-08 | Exportar e restaurar revisões, evidências, atribuições e referências. | SQLite e ZIP |

## Dependências, riscos e decisões pendentes

P6 fornece pendências com IDs e histórico. P7 oferece origem em conteúdo confirmado de sessões. P8 preserva proveniência de textos importados. P9 fornece navegação reutilizável. O modelo referencia pendências, resumos e texto importado. A criação de uma informação estruturada continua sendo explícita.

O custo maior está em manter coerentes a revisão, as evidências e a atribuição de conhecimento. Campos demais também aumentam o tempo de captura durante a sessão. Para avaliação, a proposta começa com cadastro simples, evidência opcional na entrada, estado em aberto e filtro de personagem. Uma avaliação posterior pode testar se data ficcional, evidências múltiplas no primeiro formulário e busca integrada justificam a complexidade.

A aprovação deve decidir quais estados entram no primeiro recorte, se o registro de conhecimento precisa cobrir grupos e como apresentar evidências divergentes. A reformulação visual tem aprovação própria e fica fora desta proposta.
