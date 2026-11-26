# UXR-05 — Arquivo Narrativo Vivo

**Estado:** em andamento, com padrões de experiência aprovados conceitualmente e identidade visual em avaliação. O HTML demonstra a proposta com dados fictícios em memória. O aceite conceitual serve de referência para avaliação e não autoriza implementação operacional. [UXR-04](README.md) · [45 requisitos vigentes](../revisada/03-aceitacao-e-rastreabilidade.md) · [Auditoria UXR-03](../auditoria/uxr-03.md)

O mantenedor selecionou [Codex como referência](../design-system-codex.md). As alternativas abaixo documentam a exploração anterior. As decisões restantes seguem em avaliação.

## Decisões conceituais aprovadas

| Padrão | Demonstração | Rastreabilidade |
| --- | --- | --- |
| Separação entre acervo e campanha | Campanhas, busca e captura no acervo. Visão geral, sessão, wiki e informações no contexto da campanha. | G01–G03, G14, F01, F02, F10 |
| Navegação lateral recolhível | Controle com texto, estado expandido e foco no acionador. Em tela estreita, começa recolhida e abre em linha. | G01, G05–G08; estrutura móvel em avaliação |
| Cartão com área principal acionável | Todo o corpo principal é um link. A ação de retomada ocupa uma região independente. | A4, G02, G05–G07, F01 |
| Editor com prioridade para escrita | Texto e ações de confirmação no primeiro bloco de trabalho. | A3, G02, G04, G08, G13, F03, D13 |
| Metadados expansíveis | Dados e histórico ficam abaixo do editor em seções nativas acionáveis por teclado. | A3, G05, G06, G10, F05, D13 |
| Prévia alternável | Prévia preserva o texto e pode ser ocultada. Em desktop, comparar lateral e coluna única. | A3, G05, G08, F03, D13 |
| Retorno contextual à busca | Termo, campanha e categoria permanecem na vista de busca. Retorno interno devolve foco ao resultado. | A1, G01, G05, F10 |

O achado **A2** também tem tratamento no protótipo. Campos têm contorno semântico opaco com contraste medido, e foco usa um indicador independente. Os IDs da [matriz de conformidade](../auditoria/uxr-03.md#matriz-dos-45-requisitos) continuam com seus resultados da interface operacional. O protótipo exercita os recortes da UXR-04 e acrescenta três campanhas, leitura de wiki e separação dos dados de consulta por campanha. Os demais requisitos, inclusive transações, preservação e escopo no servidor, seguem nos seus contratos e na regressão futura.

## Direção e alternativas

Baixe [uxr-05.html](uxr-05.html) e abra no navegador. **Comparar aparência** começa recolhido. Use os controles na mesma composição e exporte a combinação em **Exportar combinação visual (JSON)**. A UXR-04 permanece disponível para comparação. [HTML anterior](uxr-04.html)

| Paleta | Papéis e intenção |
| --- | --- |
| Athenaeum | Marfim nas páginas, verde musgo nos destaques e bronze nas marcas de encadernação. Referência de biblioteca de campo. |
| Nocturne | Azul noturno nas superfícies, violeta nas ações e prata na delimitação. Referência de coleção astronômica. |
| Chronicle | Pergaminho nas páginas, tabaco nos textos e cobre nos destaques. Referência de diário e manuscrito. |
| Codex | Grafite na base, marfim nos textos e dourado nas ações. Referência de volume encadernado. |

O acervo é apresentado como volumes, a campanha como folha de rosto e a wiki como página de leitura, com citação e indicação de origem. Uma vinheta cartográfica desenhada no HTML pode aparecer na margem, acima do título ou ficar oculta. A ilustração é decorativa, fora da sequência de leitura e distante de campos, botões e texto narrativo.

O laboratório permite ajustar independentemente família tipográfica, geometria, densidade, profundidade, ornamentação, posição da ilustração e composição da prévia. Os temas compartilham os papéis `bg`, `panel`, `sub`, `ink`, `muted`, `border`, `accent`, `on`, `focus` e `orn`. Geometria, recuo, espaçamento e tipografia usam tokens próprios. O JSON registra versão do esquema, protótipo e as escolhas desses controles, sem conteúdo das sessões.

## Treze princípios

| ID | Regra ou técnica | Evidência e limite |
| --- | --- | --- |
| D01 | Geometria concêntrica, condicional | Raio de campo derivado do raio do painel menos o recuo nominal, com mínimo para controles pequenos. Três geometrias disponíveis; encaixes reais ainda pedem medição. |
| D02 | Bordas alfa, condicional | Adorno marcado usa friso translúcido. Campos e seus indicadores usam bordas opacas medidas. Composição futura de controles translúcidos exige teste próprio. |
| D03 | Paletas OKLCH, condicional | Acento e pigmento decorativo usam OKLCH com fallback sRGB. Os papéis semânticos são compartilhados. |
| D04 | Gradientes OKLCH, condicional | Capa de ornamentação marcada demonstra fundo em OKLCH com fallback. O editor mantém fundo sólido. |
| D05 | Peso dos ícones, estrutural onde aplicável | Ícone de navegação escala com o texto e é decorativo junto de rótulo explícito. Consistência entre famílias aguarda uma matriz maior de ícones. |
| D06 | Máscara, condicional | Dissolve apenas a borda inferior da vinheta; conteúdo, foco e controles permanecem fora da máscara. |
| D07 | Profundidade, estrutural no tema escuro | Fundo, superfície e seleção têm valores distintos em Nocturne e Codex. Sombra é ajustável. Verificar leitura em alto contraste. |
| D08 | Viewport dinâmico, estrutural | Altura dinâmica na estrutura e no diálogo, rolagem nativa e coluna única em largura estreita. Teclado virtual, zonas seguras e orientação exigem aparelho real. |
| D09 | Espaçamento, estrutural | Escala de recuo ajustável sem reduzir a altura mínima das ações principais. Revisar áreas compactas em toque. |
| D10 | Hierarquia tipográfica, estrutural | Capas, títulos de coleção, texto narrativo e metadados têm papéis distintos nas três escolhas tipográficas. Validar legibilidade com zoom real. |
| D11 | Alinhamento ótico, condicional | Ajuste leve no ícone de navegação, sem deslocar o botão ou a ordem DOM. Verificar rótulos quebrados e combinações de fontes. |
| D12 | Cores semânticas, estrutural | Seleção usa estado semântico. Arquivo, edição, confirmação e recuperação usam texto; foco tem token próprio. |
| D13 | Revelação progressiva, estrutural | Metadados, laboratório e falha simulada começam recolhidos. Texto, confirmação e reenvio aparecem no bloco principal. |

## Validação da demonstração

Playwright e Chromium 156 em Linux, com servidor estático em loopback. Ensaio de teclado e foco na navegação, saída cancelada com Escape, prévia, reenvio sem duplicar a versão, preservação da edição posterior, busca com retorno, campanha arquivada em leitura, wiki e escopo de Marina. Verificadas sete dimensões estéticas, composição do editor e conteúdo do JSON. A confirmação de edição funcionou a 320 CSS px, e seis vistas mantiveram a largura do documento dentro da viewport em 320, 390, 768 e 1280 CSS px na configuração de maior ornamentação e ilustração em faixa. Sem erros JavaScript ou requisições externas no ensaio.

Contraste calculado a partir dos tokens efetivos em Chromium, convertidos a sRGB. Para links e foco, a medida é o menor valor entre painel, base e superfície secundária. A capa usa o menor contraste de texto principal ou secundário nos fundos de base e secundário, extremos amostrados da composição. As medidas cobrem pares selecionados, não uma auditoria de cada pixel, estado ou técnica assistiva.

| Paleta | Borda do campo / painel | Texto / painel | Texto / ação | Link mínimo | Foco mínimo | Texto / capa mínimo |
| --- | --- | --- | --- | --- | --- | --- |
| Athenaeum | 5,05 | 13,33 | 8,84 | 6,77 | 6,14 | 5,82 |
| Nocturne | 5,17 | 12,59 | 9,55 | 6,60 | 8,11 | 6,89 |
| Chronicle | 4,97 | 13,39 | 7,47 | 5,88 | 6,08 | 6,30 |
| Codex | 5,23 | 13,04 | 9,50 | 7,79 | 9,73 | 7,16 |

## Decisões em aberto

Compare paleta, tipografia, forma, densidade, contraste percebido, camadas, ornamentação e ilustração no mesmo roteiro de escrita e leitura. A estrutura móvel definitiva, a apresentação do registro global e das perspectivas, e o agrupamento e os rótulos específicos dos destinos também dependem de avaliação. O desktop é o ambiente principal; o mobile complementa escrita, consulta e captura. Permanecem necessários ensaios de leitor de tela, toque, teclado virtual e zoom real, além da avaliação estética do mantenedor. A UXR-05 continua em andamento. A UXR-06 exige autorização posterior.
