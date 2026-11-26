# UXR-04 — Arquitetura de informação e prototipação

**Estado:** proposta para avaliação do mantenedor. Base funcional `bc2fe67`. A UXR-03 foi aprovada como diagnóstico e orienta a comparação. [Auditoria da interface existente](../auditoria/uxr-03.md) · [45 requisitos revisados](../revisada/03-aceitacao-e-rastreabilidade.md)

## Abrir e comparar

Baixe [uxr-04.html](uxr-04.html) e abra o arquivo no navegador. Ele contém seis vistas com dados fictícios, estilos e comportamento locais. Em **Comparar aparência e layout**, escolha **Arquivo de campo** (claro, quente e títulos serifados) ou **Atlas noturno** (escuro, frio e títulos sem serifa). Ajuste densidade, tamanho do texto e prévia lateral ou em coluna única. A troca ocorre na mesma vista e mantém o texto e os filtros da sessão de demonstração.

O padrão inicial serve ao ensaio comparativo. O protótipo usa memória da página, prévia de texto literal, dados fixos e confirmação simulada. Recarregar reinicia a demonstração. O fluxo de confirmação incerta representa reenvio da mesma operação, com preservação da edição posterior. Persistência real, concorrência, Markdown operacional e integração com o acervo permanecem descritos nas especificações funcionais.

## Arquitetura de informação e padrões

| Contexto | Organização proposta | Alternativa para comparação |
| --- | --- | --- |
| Acervo e campanha | Separar destinos globais, como busca e captura, de destinos da campanha ativa. Na campanha, oferecer retomada da sessão e acesso ao conhecimento. Barra lateral no desktop e navegação em linha com quebra no mobile. | Um único agrupamento reduz a ocupação no mobile. Pode diluir o escopo de cada ação. Comparar por tarefa, especialmente a mudança de campanha seguida de busca. |
| Cartões e ações | A área visual principal coincide com um único link amplo. Uma ação secundária, como retomar sessão, ocupa região separada. | Usar título sublinhado como alvo único e remover aparência de cartão acionável do restante. Pode simplificar leitura de listas densas. |
| Escrita | Anotações e confirmação formam o primeiro bloco do editor. Metadados e histórico ficam em seções expansíveis. Prévia pode ser escondida sem afetar o conteúdo. | Comparar lado a lado com coluna única no mesmo HTML. A primeira favorece consulta paralela no desktop. A segunda oferece mais largura à escrita. Em tela estreita, manter fluxo vertical. |
| Busca e retorno | Preservar termo, campanha, categoria, lista e foco quando a pessoa retorna de um resultado válido. Explicar remoção e devolver foco ao cabeçalho da lista se o resultado desaparecer. | Considerar URL e histórico persistente em escopo posterior, com critérios para recarga, favoritos do navegador e versões obsoletas. |
| Conhecimento | Registro global, jogador e personagem usam o mesmo ponto de entrada. Título, conteúdo e origem mudam juntos. A escolha atual tem rótulo explícito. | Comparar vistas separadas se o seletor não comunicar bem a fronteira entre conhecimento e acervo. Evitar sobrecarregar a tela de escrita com o registro global. |
| Captura e confirmação | Captura textual direta para a caixa de entrada. No editor, status distingue edição, confirmação simulada e reenvio. Saída interna com edição pede escolha e oferece permanecer escrevendo. | Avaliar captura contextual dentro da campanha antes de mover ações globais. Preservar os contratos de rascunho de cada módulo. |

## Rastreabilidade e limites

Os 45 requisitos permanecem como referência. O recorte prototipa os percursos com maior impacto observado. Os demais ficam vinculados para análise e regressão posterior.

| Recorte | Achado UXR-03 | Requisitos em avaliação no protótipo |
| --- | --- | --- |
| Busca contextual e foco | A1 | G01, G03, G05, G06, F10 |
| Controles reconhecíveis, foco e adaptação | A2 | G05–G08, G12, D02, D08–D12 |
| Escrita prioritária, prévia, status e retomada | A3 | G02, G04, G08–G10, G13, F02–F05, D10, D12, D13 |
| Área acionável e ação secundária | A4 | G02, G05–G07, F01, D09, D11 |
| Captura e consulta por sujeito | Jornada prioritária | G14, F07, F15, F16 |
| Cobertura futura | Validação complementar | G11 requer ensaio com respostas concorrentes e G15 requer auditoria normativa. F06, F08, F09, F11–F14 e F17 ficam para validar no contexto de lixeira, wiki, tags, navegação rápida, pendências, importação, anexos e portabilidade. |

## Preservação dos 13 princípios

| ID | Aplicação ou condição preservada |
| --- | --- |
| UX-D01 | Raios seguem tokens de painel e controle. Geometria concêntrica continua opcional e exige verificação em três encaixes se adotada. |
| UX-D02 | Contornos opacos nesta comparação. Se houver transparência, medir cor composta por fundo e estado. |
| UX-D03 | Papéis semânticos compartilhados nas duas paletas. OKLCH e fallback dependem da matriz de suporte. |
| UX-D04 | Fundos sólidos neste ensaio. Se houver gradiente, medir os pontos de menor contraste sob o conteúdo. |
| UX-D05 | Controles textuais preservam seu nome. Uma família de ícones exige comparação de peso e nomes acessíveis. |
| UX-D06 | Acabamento sem máscara. Uma máscara futura deve preservar conteúdo, indicação de rolagem e foco. |
| UX-D07 | Fundo, painel, seleção e diálogo têm papéis próprios. Comparar leitura dos níveis no tema escuro. |
| UX-D08 | Layout de coluna única e altura dinâmica no diálogo. Testar teclado virtual, rolagem e zonas seguras em aparelho real. |
| UX-D09 | Densidade ajustável com escala comum. Ações amostradas priorizam 44 CSS px sem reduzir alvos na variante compacta. |
| UX-D10 | Papéis de título, corpo e metadado. Comparar tipografia serifada e sem serifa e texto ampliado. |
| UX-D11 | Interação e foco compartilham a área do elemento. Correções ópticas futuras precisam preservar hitbox e ordem DOM. |
| UX-D12 | Estados e escopos trazem texto, status ou destaque semântico. A cor complementa esses sinais. |
| UX-D13 | Prévia alternável e metadados recolhidos. Escrita, Salvar e reenvio permanecem no bloco principal. |

## Evidência do protótipo

- Chromium 156 em Linux, com o HTML servido em loopback. A política do navegador do ambiente bloqueou a abertura por `file:` durante o ensaio. O artefato é autocontido e o navegador não fez requisições externas.
- Percurso verificado com Playwright existente: abrir cartão por teclado, buscar com filtros e voltar com foco no resultado, editar, alternar prévia, cancelar saída com Escape, simular perda de confirmação, reenviar sem incrementar a versão e salvar edição posterior. Também foram verificadas captura, troca de escopo de conhecimento e personalização sem perder o texto.
- A largura do documento coincidiu com a viewport em 320, 390, 768 e 1280 CSS px na vista do editor, inclusive com o texto ampliado do protótipo. O fluxo de edição e confirmação foi completado a 320 px. Tamanho de texto do protótipo é diferente de zoom de navegador.
- Em Arquivo de campo e Atlas noturno, respectivamente, o contraste calculado de borda do campo contra seu fundo foi 4,98:1 e 5,30:1. Texto principal sobre painel foi 15,32:1 e 13,91:1; texto da ação primária sobre seu fundo foi 9,61:1 e 10,91:1. São pares amostrados, sem conclusão geral de conformidade.

## Roteiro de avaliação do mantenedor

1. Abra uma campanha pelo cartão e depois retome a sessão pela ação separada. Registre qual alvo esperava acionar.
2. Escreva a partir da sessão aberta, alterne a prévia e compare os layouts no desktop. Registre tempo até começar a escrever, esforço para localizar Salvar e visibilidade dos campos opcionais.
3. Busque por **luz**, filtre por campanha e categoria, abra um resultado e retorne. Em **Conhecimento**, compare registro global e Marina e explique de quem é cada informação.
4. Compare os temas na mesma vista e com os mesmos dados. Ajuste densidade e texto. Registre preferência por aparência, contraste, conforto de leitura e equilíbrio entre escrita e consulta.
5. Repita as tarefas essenciais no mobile. Registre toque, teclado virtual e orientação. Avaliação humana, leitor de tela, zoom real e conformidade WCAG exigem evidência adicional.

As escolhas de agrupamento, alvo de cartão, composição do editor, apresentação de perspectivas, tema, densidade e tipografia ficam para o mantenedor. Recomenda-se comparar primeiro os fluxos e depois a aparência na mesma sessão. A UXR-05 aguarda avaliação e autorização.
