# Fidelidade visual do Phandelver V2

O HTML aprovado de SHA-256 `6618e8d13feae6d6896ef2ad557de9eefa7b3f2ae0164c9200cb2354c112e18e` é normativo para as superfícies equivalentes. A base auditada é `03f3e3d`. PHV2-01 a PHV2-13 continuam funcionais. UXR-07 aguarda aceite humano e P11 permanece reservada.

| ID | Critério | Origem da divergência inicial |
| --- | --- | --- |
| FV-01 | Lateral 232/68, marca e botão na linha, Sobre no fim, cabeçalho móvel até 700 px, rolagem independente. | Grade 224/72, cabeçalho em duas linhas e conteúdo sem fixação. |
| FV-02 | Área 1180/850 e tokens do HTML. Compare tipografia, bordas, raios, ícones e áreas de toque. | Valores de raiz anteriores, bordas sempre opacas, largura aplicada ao próprio main. |
| FV-03 | Indicadores 4/2 colunas no ponto de 900 px. Sessões recentes, missões, pendências e pessoas conforme composição de referência. | Indicadores auto-fit, cartões afins em listas simples e pessoas sem grade. |
| FV-04 | Anexos com quantidade, último arquivo e lista expansível, formulário sob demanda. | Disclosure externo genérico e registros sem grade responsiva. |
| FV-05 | Coleções, leitura e formulários seguem os componentes normativos. Controles extras preservam contratos e proteção. | Superfícies operacionais mantinham hierarquia e medidas da UXR-06. |
| FV-06 | Prova visual com fixture Phandelver, cinco larguras, CSS computado, tolerância geométrica de até 2 CSS px e evidência lado a lado. | A validação anterior media reflow e interação, sem equivalência de geometria. |

A auditoria extraiu as regras do CSS original, incluindo as variações de 900 e 700 px. Foram examinados shell, leitura, grupos de ação, diálogos, coleções, anexos, busca, editor, wiki, perspectivas, campanhas, anotações, lixeira, importação e Sobre. A comparação de capturas usa Chromium, escala 1, viewport de 900 px de altura e as cinco larguras acordadas.

## Implementação e exceções

A lateral compartilhada usa a mesma grade, espaçamento, seletores ativos e vetores do HTML. O nome real da campanha pode ocupar mais linhas no grupo contextual. O destino Sobre fica na base quando há espaço e permanece alcançável por rolagem quando o conteúdo excede a altura. No acervo o contexto de campanha fica ausente. O cabeçalho móvel usa marca, ícone e expansão em fluxo.

Os registros recentes têm número visual independente, título marfim de 18 px (17 no móvel), data, resumo e seta. Os painéis de missões e pendências usam divisores e exibição parcial do total. Pessoas têm painel de largura total e grade 2/1. Anexos têm título, ação, total, último registro e lista expansível. Os dados reais mantêm os nomes dos PDFs de ensaio e os controles de renomeação e vinculação. A descrição longa da campanha fica na área secundária, de modo que o cabeçalho e os indicadores continuem comparáveis. Estado real, metadados e ações administrativas permanecem disponíveis.

Os tokens normativos foram aplicados ao shell, painéis, campos, leitura, editor, diálogos, anotações, busca, favoritos, importação e Sobre. Wiki, sessões, missões, pendências, busca, favoritos e lixeira reaproveitam hierarquia e divisores de registros. A tipografia e área de leitura seguem o modelo nas regiões comparáveis. O editor mantém controles adicionais de gravação, revisões e rascunho. Navegação contextual, ações destravadas por confirmação, perspectivas, exportação e backup seguem os contratos funcionais. Inputs, seletor nativo e diálogo mantêm borda opaca para identificação e foco; divisores, painéis e atalhos secundários usam borda suave. O texto de estado preserva seu significado além da cor.

## Ensaio reproduzível

Com a aplicação compilada, execute o teste `phandelver-visual.spec.ts` na suíte E2E. A execução padrão mede a aplicação contra o oráculo de valores extraídos do CSS aprovado. Com `PHANDELVER_REFERENCE` apontando para o HTML original, o mesmo teste confere o hash e compara CSS computado e geometria diretamente com o protótipo nas mesmas condições de navegador. A tolerância é de até 2 CSS px nas regiões equivalentes. Esse ensaio não depende da igualdade pixel a pixel de telas que contêm dados ou ações operacionais adicionais.

O arquivo de evidências reúne a referência, a aplicação anterior, a revisão e composições de comparação nas cinco larguras. A imagem de diferença é diagnóstica e inclui diferenças de texto real, origem e ações. As asserções de CI usam as regiões equivalentes. Os snapshots raster da aplicação ficam como evidência da rodada, e seu congelamento como baseline visual depende do aceite comparativo. Leitores de tela e dispositivos físicos ficam pendentes de avaliação.

### Evidências desta rodada

Em 1280 CSS px, a faixa dos indicadores passou de x=272,00, y=239,58 e 960,00 × 96,70 para x=283,19, y=157,08 e 945,62 × 90,50, iguais aos valores calculados no protótipo. Sessões recentes passou de 536,77 para 508,17 px de altura, frente a 506,67 px do HTML. Essa diferença de 1,50 px também foi medida a 1920 px. A lateral passou de 224 para 232 px, com rolagem independente confirmada a 360 px de altura. O teste direto verifica o hash original, as coordenadas e estilos selecionados em cinco larguras.

Red reprovou a fonte de 25,6 px dos indicadores frente ao valor normativo móvel. Green validou os valores e a composição atualizada. Refactor reuniu os estilos compartilhados do shell e dos registros e manteve a identificação opaca de controles. O cenário direto passou em três repetições. Lint, análise de tipos, build, 5 unitários, 84 de integração e 62 E2E passaram localmente. O aviso de tamanho do bundle permanece. [Teste visual](../../tests/e2e/phandelver-visual.spec.ts)
