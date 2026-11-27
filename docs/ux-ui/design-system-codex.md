# Design System Codex — referência da UXR-05

O mantenedor selecionou **Codex** como referência visual do Arquivo Narrativo Vivo. A identidade é sóbria, compacta e literária. Tipografia, proporções, grafite, marfim e dourado definem a expressão visual. A referência está registrada abaixo. O mantenedor aprovou a UXR-05 e autorizou o [recorte UXR-06.1](../specs/35-uxr-06-1-fundamentos-codex.md). Após o refinamento, aprovou esse recorte e autorizou a [UXR-06.2](../specs/36-uxr-06-2-escrita-e-recuperacao.md), agora aprovada. A UXR-06.3 foi aprovada após o PR #78. A entrega autorizada é [UXR-06.4](../specs/38-uxr-06-4-superficies-e-regressao.md). A aprovação da direção orienta a implementação. O aceite da interface depende da validação de cada entrega. [Protótipo UXR-05](prototipos/uxr-05.html) · [45 requisitos](revisada/03-aceitacao-e-rastreabilidade.md) · [Auditoria UXR-03](auditoria/uxr-03.md)

```json
{
  "schemaVersion": 1,
  "prototype": "UXR-05",
  "theme": "codex",
  "type": "serifa",
  "geometry": "encadernada",
  "density": "compacta",
  "depth": "camadas",
  "ornament": "nenhuma",
  "art": "nenhuma",
  "layout": "pilha"
}
```

Os sete padrões conceitualmente aprovados continuam sendo a base: separação entre acervo e campanha, navegação lateral recolhível, cartões com área principal acionável, editor com prioridade para escrita, metadados expansíveis, prévia alternável e retorno contextual à busca. Os requisitos e resultados originais da auditoria permanecem nas respectivas matrizes. [Decisões conceituais e rastreabilidade](prototipos/uxr-05.md#decisões-conceituais-aprovadas)

## Tokens cromáticos e superfícies

Valores de referência. As bases são conversões dos valores sRGB do protótipo. A ação conserva o OKLCH do protótipo com seu fallback sRGB original. As cores de estado e de indisponibilidade são propostas para aprovação visual. A adaptação no navegador deve declarar fallback antes dos valores OKLCH.

| Token | OKLCH | Fallback sRGB | Papel |
| --- | --- | --- | --- |
| `surface-base` | `oklch(24.31% 0.0019 106.54)` | `#20201f` | Fundo estrutural e espaço entre áreas |
| `surface-panel` | `oklch(28.27% 0.0084 75.24)` | `#2c2925` | Página de leitura, cartão e campo |
| `surface-raised` | `oklch(33.62% 0.0174 78.02)` | `#3c362d` | Navegação contextual, seleção e diálogo |
| `text-primary` | `oklch(96.42% 0.0392 86.06)` | `#fff2d6` | Títulos e conteúdo |
| `text-secondary` | `oklch(83.38% 0.0409 84.56)` | `#d5c7ab` | Metadados e texto auxiliar |
| `border-control` | `oklch(69.14% 0.0394 76.45)` | `#aa9981` | Limite funcional de campo ou controle |
| `action-accent` | `oklch(86% 0.103 84)` | `#edca7b` | Ação principal, link e indicação ativa |
| `text-on-accent` | `oklch(28.14% 0.0453 83.16)` | `#34270c` | Texto sobre botão dourado |
| `focus-ring` | `oklch(93.02% 0.0877 89.67)` | `#ffe6a4` | Indicador de foco independente do estado |
| `status-success` | `oklch(85.79% 0.0810 135.74)` | `#b9dda8` | Confirmação do servidor |
| `status-warning` | `oklch(90.55% 0.1005 84.58)` | `#ffdb91` | Resultado incerto e conflito |
| `status-danger` | `oklch(84.51% 0.0854 31.42)` | `#ffb8aa` | Falha e ação de risco |
| `status-info` | `oklch(83.71% 0.0584 242.20)` | `#a9cfed` | Rascunho protegido, progresso e leitura |
| `text-disabled` | `oklch(78.68% 0.0373 83.75)` | `#c5b89f` | Controle indisponível, acompanhado de contexto quando necessário |

Plano base contínuo, painéis com recuo e camada elevada de uso pontual. Em diálogos, combinar contorno, fundo elevado e backdrop de referência preto a 55%. Sombra de referência `0 7px 16px rgb(0 0 0 / 12%)`, sem função semântica. Aplicar borda funcional opaca de 1 CSS px a campos e controles cuja delimitação é necessária. Separadores puramente decorativos podem usar `border-control` a 35% com composição medida. Se o limite comunicar interação ou separação necessária, usar o token opaco ou indicador equivalente. Frisos, ornamentos e arte estão fora da composição selecionada.

**Evidência existente.** Na amostra Codex da UXR-05, borda sobre painel 5,23:1, texto sobre painel 13,04:1, texto sobre ação 9,50:1, link mínimo 7,79:1 e foco mínimo 9,73:1. Na tabela atual, o cálculo de luminância relativa dos fallbacks dá 4,31:1 para borda no fundo elevado, 9,25:1 para texto sobre ação, 7,59:1 para link no fundo elevado e pelo menos 7,22:1 para os quatro rótulos de estado no fundo elevado. Novos estados, cores compostas, navegação e componentes completos exigem medição quando renderizados. Adotar 4,5:1 para texto comum, 3:1 para texto grande e 3:1 para informação visual funcional conforme aplicação WCAG. [Medições do protótipo](prototipos/uxr-05.md#validação-da-demonstração) · [UX-G12](revisada/03-aceitacao-e-rastreabilidade.md#requisitos-transversais)

## Tipografia, geometria e densidade

| Papel | Referência proposta |
| --- | --- |
| Título de página | Georgia com fallback serifado local, 2 a 3 rem conforme largura, linha 1,15, peso 700 |
| Título de seção e cartão | Mesma família, 1,25 a 1,5 rem, linha 1,25, peso 700 |
| Texto narrativo e anotações | Georgia, fallback `'Times New Roman', serif`, 1 rem, linha 1,6. Leitura contínua até cerca de 68 ch; preservar zoom e preferências do navegador. |
| Metadados | 0,875 rem, linha 1,5; cor secundária. Em avisos acionáveis, usar corpo de 1 rem. |
| Rótulos, botões, filtros e valores compactos | Fonte de sistema sem serifa, 1 rem, linha 1,4, rótulo seminegrito. A UXR-05 aprovou a separação híbrida entre leitura e controles. |
| Código Markdown | Pilha monoespaçada do sistema, 0,9375 rem, linha 1,5; bloco longo com região de rolagem acessível. |

Usar escala compacta de **4, 8, 12, 16, 24 e 32 CSS px** traduzida em rem para tipografia e espaçamento conforme o papel. Referência de 12 px entre grupos próximos, 16 px de respiro de painel e 24–32 px entre seções. Painel encadernado com raio de 16 px, recuo geométrico nominal de 6 px e raio interno de 10 px para encaixe equivalente. Em encaixes com recuo diferente, derivar raio interno como `max(2px, raio externo - recuo efetivo)` e medir três exemplos. Controles isolados usam 8 px como referência. Espaçamento compacto conserva alvos de 44 × 44 CSS px nas ações principais por toque e 24 × 24 CSS px ou exceção WCAG documentada nas demais. Texto e foco devem sobreviver a zoom, alto contraste e quebra de linha.

**Ícones.** Propor família linear única, caixa de 20 × 20 CSS px, traço de referência de 1,5 a 2 px, cantos coerentes e alinhamento pela caixa de texto. Começar pelos ícones indispensáveis de recolhimento, retorno e busca, reaproveitando recursos locais. Rótulos visíveis permanecem em ações que precisam de explicação. Ícones decorativos saem da árvore acessível. Um deslocamento óptico de até 1 px pode corrigir a percepção sem mover a área clicável, o anel de foco ou a ordem semântica. Nenhuma biblioteca nova foi selecionada.

## Componentes e interação

| Componente | Padrão reutilizável e invariantes | Rastreabilidade |
| --- | --- | --- |
| Navegação e retorno | Links nomeados para destinos. Botão de recolhimento com `aria-expanded`, foco visível e grupo controlado. Contextos global e local rotulados e destino atual indicado sem depender só de cor. | G01, G05, G06, F10, F11 |
| Cartão e item de lista | Link primário cobre sua superfície aparente. Ação secundária tem fronteira e alvo próprios, com semântica e foco independentes. | A4, G02, G07, F01 |
| Campo e formulário | Rótulo persistente, borda funcional opaca, instrução junto ao controle e erro associado. Valores permanecem após falha. | A2, G06, G10, G12 |
| Botão e feedback | Primário por grupo, secundário com contorno, opção de cancelamento identificável. Hover acrescenta ênfase, foco tem anel de 3 px com afastamento de 3 px, pressionado mantém texto, seleção usa papel/estado acessível. Durante envio, identificar a operação, impedir duplicação e conservar a recuperação. | G03–G05, G09, G11–G13 |
| Estado e aviso | Mensagem persistente com ação apropriada quando necessário. Diferenciar em memória, protegido localmente, confirmação do servidor, erro local, operação incerta, conflito e leitura. Usar `status` para mudanças relevantes e alertas para falhas urgentes. Indisponibilidade continua legível. | G03, G04, G06, G13, D12 |
| Editor | Uma coluna em todas as larguras. Contexto curto, título, campo de anotações e confirmação antes dos detalhes. Prévia alternável após o bloco de escrita, metadados e histórico expansíveis. Manter cursor ou devolver foco ao acionador. Rascunho, reenvio, conflito e ação de saída seguem os contratos da sessão, inclusive confirmação explícita e preservação da geração posterior. | A3, G04–G10, G13, F03–F05, D13 |
| Leitura, registro global e perspectiva | Título, contexto, informações e origem com hierarquia estável. Diferenciar escopos por texto, preservar fontes e exibir somente atribuições do sujeito selecionado. | G12, G14, F08, F15, F16 |
| Diálogo | Nome acessível, foco inicial seguro, retorno ao acionador ou destino lógico, conteúdo externo inerte e Escape quando seguro. | G05, G06, G09 |

**Responsividade.** Barra lateral recolhível a partir do espaço necessário ao conteúdo. Ensaiar inicialmente a transição perto de 760 CSS px e revisar em zoom. Na largura estreita, usar controle de navegação junto ao contexto, começar recolhida e expandir em fluxo normal. Garantir ordem lógica, `min-width: 0`, quebra dos rótulos, rolagem local das tabelas e alcance das ações sem sobreposição. Preferir altura dinâmica nos contêineres que a exigem com fallback e considerar teclado virtual e áreas seguras. Editor continua em coluna única. Evidência de aceitação em 320, 390, 768 e 1280 CSS px, zoom real, teclado e aparelho físico conforme a matriz revisada.

## Os 13 princípios na referência Codex

| IDs | Papel e verificação |
| --- | --- |
| D01 | Raios concêntricos onde houver encaixe útil. Medir recuo e raio em três pares. |
| D02 | Borda alfa condicional à composição. Contraste funcional comprovado separadamente. |
| D03 | Papéis OKLCH e fallbacks compartilhados. Medir cores efetivas por estado e superfície. |
| D04, D06 | Gradientes OKLCH e masked edges disponíveis quando resolverem uma necessidade concreta. Se adotados, medir pior contraste e comprovar acesso ao primeiro e último alvo, pista de rolagem e foco. A referência Codex usa fundos sólidos e conteúdo sem máscara. |
| D05, D11 | Traço e caixa coerentes em ícones, ajustes ópticos fora da área de foco e clique. |
| D07, D08 | Camadas semânticas no escuro, viewport dinâmico onde necessário, fallback e ensaio com teclado virtual. |
| D09, D10 | Escala compacta e papéis tipográficos. Validar alvos, ampliação, zoom e leitura. |
| D12, D13 | Estados legíveis por texto, revelação progressiva sem esconder confirmação, erro ou recuperação. |

## Decisões aprovadas na UXR-05

| Decisão | Direção aprovada | Evidência de aceite da implementação |
| --- | --- | --- |
| Destinos | **Acervo:** Campanhas, Busca, Anotações rápidas. **Campanha:** Visão geral, Sessões, Wiki, Personagens, Pendências, Informações e perspectivas. Favoritos são identificáveis pela navegação rápida. Importação e exportação disponíveis como ações de acervo. Tags, referências e anexos permanecem no contexto pertinente. | Comparar descoberta por tarefa, retorno, número de passos e acesso às ações atuais. Rever apenas rótulos ou agrupamentos que causem desvio. |
| Navegação móvel | Cabeçalho com contexto e botão de navegação recolhida. Expansão em fluxo normal, com fechamento após escolher destino e foco no título de chegada. | Comparar com painel sobreposto se o menu em fluxo alongar a tarefa. Ensaiar toque, orientação e teclado virtual. |
| Informação e perspectivas | Um destino de campanha com registro global como entrada e ação explícita **Consultar perspectiva**. Consulta nomeia o sujeito e informa origem atribuída. Retorno preserva seleção válida. | Comparar entendimento de escopo e uso de teclado com o seletor único do protótipo, inclusive troca de sujeito com resposta atrasada. |
| Suporte | Windows/Chromium é o alvo principal. Linux/Chromium cobre CI e inspeção técnica. Android/Chrome é complementar após validação em aparelho físico. Registrar versões e ampliar para Edge, Firefox ou Safari conforme aparelho necessário e evidência. | O mantenedor confirma seus dispositivos. Acesso privado, escrita, recuperação e leitura assistiva devem passar em cada ambiente declarado oficialmente suportado. |
| Controles | Serifada em narrativa e títulos. Fonte de sistema em controles, rótulos e filtros compactos. | Comparar leitura de campos curtos, homônimos e mensagens em 100% e 200%, com 320 CSS px e dados representativos. |
| Personalização | Codex como única configuração inicial. Respeitar zoom, tamanho de texto e preferências do navegador. Avaliar uma preferência de largura ou tamanho de leitura somente se o ensaio identificar necessidade. | Comparar conforto para escrever e ler primeiro. O laboratório de opções e o JSON são ferramentas de avaliação da UXR-05. |

## Divisão proposta da UXR-06

Cada recorte depende da integração e do CI pós-merge do anterior. A [UXR-07](auditoria/uxr-07.md) consolida a avaliação após a integração dos quatro recortes. Cada mudança terá especificação, Red → Green → Refactor para comportamento testável, verificação focal, regressão e CI `validar`. Preferir testes e componentes existentes. Fixar dados, ambiente e escala nas poucas comparações visuais necessárias.

| Recorte | Dependência | Critérios de aceitação propostos | Validação |
| --- | --- | --- | --- |
| 1. Fundamentos e entrada de campanha | Decisões aprovadas de destinos, controles e ambiente | Tokens e estados compartilhados; fronteira de campos ≥ 3:1 quando aplicável; cartão abre pelo alvo principal sem ativar ação secundária; navegação mantém separação e foco. | Medir superfícies e alvo; E2E de teclado, responsividade e campanhas; inspeção visual na base aprovada. |
| 2. Escrita e recuperação | Recorte 1 integrado | Editor em coluna única, campo e Salvar no bloco principal; prévia e expansão preservam texto e foco; falha e conflito mantêm rascunho, versões e reenvio único. | E2E de manual-save, drafts, revisions, templates e vínculos; conferir gravação local e servidor, 320 px, teclado e dispositivo. |
| 3. Busca, wiki e perspectivas | Recorte 2 e decisão de escopo aprovados | Retorno retém filtros e foco ou informa alvo indisponível; leitura indica origem; respostas atrasadas não misturam campanha, pessoa ou evidência. | E2E de search, wiki e perspectives; inversão de resposta e homônimos; roteiro de leitura assistiva. |
| 4. Superfícies restantes e regressão | Recortes 1–3 integrados | Transporte dos padrões às tarefas existentes de captura, pendências, arquivo e portabilidade; preservação funcional dos 45 requisitos, com evidência ou pendência explícita por critério aplicável. | Suíte completa e matriz normativa por processo; zoom, espaçamento, foco, toque, teclado virtual, leitor de tela e avaliação de tarefas nos ambientes aprovados. A UXR-07 reúne o aceite final. |

## Refinamento da navegação e da visão geral

No desktop, a lateral recolhida mantém acervo e campanha numa faixa de 72 CSS px. Os botões preservam nome acessível, dica textual, indicação do destino ativo e alvo mínimo de 44 CSS px. A família linear usa o mesmo peso de traço e caixas alinhadas em ambas as composições. A navegação móvel continua expansível em fluxo normal. Localização rápida e Favoritos pertencem ao acervo. Busca permanece como tarefa independente.

A visão geral prioriza uma lista de cartões de sessão com superfície principal acionável e ação de lixeira independente. O resumo confirmado é apresentado integralmente dentro do limite já suportado pelo campo. Anexos e administração ficam em seções secundárias. A wiki só renderiza a superfície de leitura quando há conteúdo.

O diálogo de saída usa os tokens semânticos Codex e identifica as operações envolvidas. Cancelar devolve o foco ao controle de origem. Os comandos disponíveis refletem as garantias do módulo. [Critérios do refinamento](../specs/39-uxr-07-refinamento.md)
