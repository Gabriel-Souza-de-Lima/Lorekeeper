# Requisitos gerais e padrões

## Regras de experiência

- A navegação global reúne destinos de acervo. Na campanha, identificar o nome e agrupar destinos daquele contexto. Nos percursos de retorno interno especificados, **Voltar** ou equivalente conserva campanha, filtro e seleção quando ainda válidos. Persistência por URL ou recarga depende de escopo próprio. Quando o item desaparece, retornar ao grupo pai ou ao próximo item disponível.
- Dar prioridade visível à tarefa principal de cada contexto. No editor, o texto, o estado da gravação e Salvar permanecem encontráveis com teclado e com zoom. Formulários exibem dados obrigatórios primeiro. Controles avançados aparecem quando pertinentes, com estado expandido identificável e opção de fechar.
- Usar vocabulário uniforme para Salvar, Cancelar, Restaurar, Arquivar, Desvincular e Mover para a lixeira. Cada ação indica o objeto e o efeito. Confirmar a ação na interface só após a confirmação real do sistema. Evitar avisos repetidos sem consequência.
- Distinguir carregando, vazio inicial, nenhum resultado de filtro, erro, indisponibilidade e somente leitura. Mostrar próxima ação apropriada e manter dados utilizáveis durante atualizações parciais. Atualizações assíncronas não deslocam o cursor nem mudam o item escolhido.
- Estados de escrita precisam distinguir edição ainda em memória, rascunho protegido, enviando, confirmação do servidor, falha local, resultado incerto e conflito. A saída com trabalho pendente segue as regras existentes de cada módulo. Em perda de resposta o usuário reconhece a operação que pode reenviar.
- A experiência se adapta a largura e método de entrada. Priorizar tarefas completas, incluindo abrir, editar, confirmar, cancelar e voltar em 320 px, zoom e teclado virtual. Painéis paralelos viram uma ordem de leitura lógica. Tabelas que realmente exigem duas dimensões ficam em regiões de rolagem rotuladas, com acesso por teclado e toque.

## Contratos dos componentes

| Família | Semântica e interação | Estados e condições de teste |
| --- | --- | --- |
| Navegação global, campanha, retornos e filtros de visualização | Usar link para destino navegável, botão para ação e indicação semântica do destino vigente. A seleção mutuamente exclusiva usa o padrão que corresponde ao comportamento, como filtros com botões pressionáveis ou abas reais. | Atual, disponível, carregando, indisponível, arquivado. Enter ativa links, Espaço ativa botões. Retorno por teclado e toque. |
| Listas, cartões, linhas e detalhes | Título acionável com alvo inequívoco. Ações secundárias independentes, sem controles aninhados. Estruturar itens e grupos com elementos nativos quando possível. | Vazio, sem correspondência, seleção, item alterado ou removido. Manter foco após atualizações. |
| Campos, upload, seletores e validação | Rótulo persistente, indicação de obrigatório, limites junto ao campo, erro associado programaticamente e resumo se houver vários erros. Preferir controles nativos, incluindo seleção acessível por toque. | Inicial, preenchido, inválido, leitura, desabilitado, envio e falha. Reter valores e evitar submissão repetida. |
| Editor, prévia, revisão e comparação | Uso independente por teclado. Alternar prévia sem perder posição de escrita. Títulos e tabelas Markdown têm estrutura semântica. Versões têm rótulos e ordem de leitura. | Conteúdo novo, local, confirmado, conflito, restauração e somente leitura. Ao editar local e remoto, a comparação continua distinguível em coluna única. |
| Busca, filtros e navegação rápida | Campo com rótulo, resultados com título, categoria e campanha. Se for combobox, aplicar o padrão completo, inclusive opção ativa, estado expandido e teclado. Atalho com alternativa visível. | Carregando, consultas fora de ordem, resultado atualizado, vazio e erro. Setas selecionam, Enter abre, Escape fecha e devolve foco. |
| Diálogos, confirmação e menus contextuais | Diálogo modal com nome, foco inicial deliberado e conteúdo externo inerte. Escape fecha quando seguro. Em confirmação de risco, foco inicial em ação segura. Menu só recebe papel ARIA de menu se implementar seu teclado. | Abrir, cancelar, confirmar, falhar, alvo removido. Devolver foco ao acionador ou destino lógico. |
| Indicadores, alertas e feedback | Usar texto e semântica além da cor. Região de status para progresso e confirmação, alerta para falha urgente. Persistir mensagens necessárias para recuperação. | Rascunho, salvando, sucesso, conflito, retry, offline, erro local e leitura. Uma mudança relevante produz um anúncio compreensível. |
| Anexos, tags, relações e ações compactas | Identificação do alvo por nome acessível. Tipo/tamanho e consequência junto das ações. Oferecer alternativa a arrastar e a hover. | Disponível, indisponível, removido, duplicado, upload e falha. Teclado, toque e zoom preservam acesso às ações. |

## Design system estrutural

A biblioteca proposta define papéis e critérios de consistência. Geometria concêntrica, bordas alfa, OKLCH, gradientes, máscaras, camadas ornamentais e ajustes óticos têm critérios condicionais ao desenho e suporte aprovados. Contraste, semântica, foco e alcance de ações valem independentemente da técnica escolhida. As escolhas de valores, fontes, cores e composição passam por comparação humana antes da implementação ampla. Os IDs abaixo são detalhados na matriz.

| ID | Princípio | Regra estrutural |
| --- | --- | --- |
| UX-D01 | Concentric radius | Se a geometria concêntrica for adotada, superfícies encaixadas usam raios derivados do recuo e dos tokens, com exceção registrada quando a geometria pede outro tratamento. |
| UX-D02 | Alpha borders | Bordas translúcidas avaliam a cor composta sobre cada fundo real, inclusive no foco e em estados interativos. |
| UX-D03 | OKLCH palettes | Se OKLCH for adotado, definir papéis semânticos e rampas, com fallback compatível quando necessário e contraste medido na saída final. |
| UX-D04 | OKLCH gradients | Tratar gradientes como superfícies opcionais. Legibilidade permanece nos pontos de menor contraste e no fallback. |
| UX-D05 | Matched icon weight | Usar famílias de ícones com peso, caixa ótica e alinhamento coerentes. Ação tem nome acessível; ícone decorativo sai da árvore acessível. |
| UX-D06 | Masked edges | Quando escolhidas, usar máscaras como acabamento. Preservar conteúdo, foco, controles e indicação de que ainda há itens roláveis. |
| UX-D07 | Dark mode depth | Separar fundo, superfície, camada elevada e modal por papéis reutilizáveis. Profundidade continua percebida com bordas e contraste adequados. |
| UX-D08 | Dynamic viewport | Altura disponível acompanha viewport dinâmico, áreas seguras e teclado virtual. Ações e foco continuam alcançáveis. |
| UX-D09 | Spacing system | Hierarquia e densidade derivam de uma escala compartilhada, com exceções rastreáveis e espaço suficiente para toque. |
| UX-D10 | Typographic hierarchy | Aplicar papéis de título, seção, corpo, metadado e código. Tipografia ornamental, se aprovada, é restrita a usos que preservam leitura. |
| UX-D11 | Optical alignment | Ajustar alinhamento de ícone/texto pelo desenho sem deslocar ordem DOM, alvo ou indicador de foco. |
| UX-D12 | Semantic colors | Estados iguais compartilham papéis e rótulos. Cores de estado têm alternativa textual ou simbólica acessível. |
| UX-D13 | Progressive disclosure | Distinguir tarefa principal e detalhes opcionais. Revelação é acionável por teclado e indica estado. Recuperação e salvamento continuam encontráveis. |

## Escalas de aceitação

- **Normativo, WCAG 2.2 AA.** Contraste de texto 4,5:1, ou 3:1 para texto grande conforme definição WCAG. Contraste 3:1 para informação visual necessária de controles e estados. Texto a 200%, reflow equivalente a 320 CSS px com exceções justificadas, operação por teclado, foco visível e sem ficar completamente oculto, nomes/estados acessíveis, erros identificados, status anunciáveis e alvos de 24 × 24 CSS px ou exceção formal de 2.5.8.
- **Qualidade interna.** Preferir alvos de 44 × 44 CSS px nas ações principais por toque. Ensaiar em 320, 390, 768 e 1280 CSS px, com retrato/paisagem quando pertinente. Testar zoom de 400% sobre 1280 e espaçamento de texto WCAG 1.4.12. Respeitar preferência por movimento reduzido. Testar teclado virtual em aparelho real e foco totalmente visível como meta interna.
- **Padrões recomendados.** APG documenta comportamento de widgets, Nielsen orienta a avaliação de tarefas, Material Design ajuda a avaliar hierarquia, alvos, densidade e adaptação. Esses guias apoiam decisões de interação. A verificação normativa cobre todos os critérios A e AA aplicáveis, com evidência por página e processo completo. A lista acima é um recorte de risco. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) · [Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/) · [Material Design 3](https://m3.material.io/foundations/overview)
