# Rastreabilidade consolidada da UXR-06

Os 45 IDs mantêm os textos e prioridades da [matriz revisada](../revisada/03-aceitacao-e-rastreabilidade.md). As linhas abaixo registram a cobertura entregue no ciclo e o que precisa de avaliação adicional. **Aplicado** descreve o comportamento existente no recorte. **Parcial** indica implementação ou evidência incompleta frente ao critério integral. **Condicional** refere-se à técnica de desenho. **Pendente** identifica uma avaliação ainda por executar. Evidência de testes é restrita ao cenário que cada teste executa. [Auditoria anterior](uxr-03.md) · [Design System Codex](../design-system-codex.md)

| ID | Implementação e aplicabilidade | Evidência automatizada ou inspeção | Avaliação pendente ou condição |
| --- | --- | --- | --- |
| UX-G01 | Aplicado. Contexto de campanha e retorno direto à busca. | search, codex-foundations. | Verificar percurso completo e foco com leitor. |
| UX-G02 | Parcial. Atalhos, cartão, editor e alvos identificados. | codex-foundations, session-writing, quick-navigation. | Medir descoberta, passos e tempo de tarefa. |
| UX-G03 | Parcial. Pendências separa carga, falha e vazio. Busca, escrita e consulta expõem estado. | codex-secondary, search, drafts, perspectives. | Atraso parcial em outros módulos e anúncio ouvido. |
| UX-G04 | Aplicado conforme módulo. Status diferencia edição, proteção e confirmação. | manual-save, quick-notes, drafts, narrative. | Compreensão de estado e recuperação no roteiro humano. |
| UX-G05 | Parcial. Teclado, foco de chegada e retorno nos recortes. | codex-foundations, session-writing, search, perspectives, quick-navigation. | Ordem completa, oclusão e foco em zoom real. |
| UX-G06 | Parcial. Rótulos, grupos, estados e nomes nos controles alterados. | codex-secondary, codex-foundations, search. | Anúncios com leitor Windows e Android e erros por campo. |
| UX-G07 | Parcial. Metas de alvo em ações principais, botão e link medidos. | codex-foundations, codex-secondary. | Inventário de exceções, alternativas a gesto e toque físico. |
| UX-G08 | Parcial. Editor em uma coluna e navegação estreita. | session-writing, codex-foundations, pilot, codex-secondary. | Zoom 200/400%, 1.4.12, orientação e teclado virtual. |
| UX-G09 | Aplicado nos fluxos existentes de confirmação e saída. | manual-save, session-trash, session-writing, attachments. | Conferir interpretação de efeitos e cancelamentos por contexto. |
| UX-G10 | Parcial. Campos rotulados, instrução de arquivo e retenção em falhas. | codex-secondary, text-import, revisions. | Associação de todos os erros e foco em campos recolhidos. |
| UX-G11 | Parcial. Reenvio protegido e resposta obsoleta descartada nos recortes. | drafts, quick-notes, perspectives. | Medir latência percebida, corrida em outros módulos. |
| UX-G12 | Parcial. Paleta Codex, foco e bordas funcionais tratados. | codex-foundations mede campo real; [tokens](../design-system-codex.md#tokens-cromáticos-e-superfícies). | Medir estados restantes, alto contraste e movimento. |
| UX-G13 | Aplicado conforme contrato. Proteção e recuperação de gerações. | drafts, manual-save, quick-notes, narrative, perspectives. | Validar recuperação nos alvos reais e clareza da origem local/servidor. |
| UX-G14 | Parcial. Isolamento de campanha e sujeito, incluindo respostas atrasadas. | perspectives, search e integração. | Completar cenários concorrentes e homônimos por consulta. |
| UX-G15 | Pendente. Esta matriz referencia os critérios de produto. | Inventário e regressão dos fluxos. | Matriz WCAG 2.2 A/AA por processo, exceções e evidência assistiva. |
| UX-F01 | Aplicado. Cartão primário, edição independente, arquivo e contexto. | codex-foundations, campaigns. | Usabilidade e toque. |
| UX-F02 | Aplicado. Retomada com resumo, destaques e origem. | campaign-recap, session-recap. | Descoberta sem instruções e leitura de próximos assuntos. |
| UX-F03 | Aplicado. Anotações e Salvar no início, confirmação manual. | session-writing, manual-save, pilot. | Escrita longa, zoom e teclado virtual. |
| UX-F04 | Aplicado. Modelos e inserção preservam rascunho. | session-templates, inline-wiki, markdown-links. | Encontrabilidade e compreensão antes de confirmar. |
| UX-F05 | Aplicado. Comparação e restauro mantêm versões e controles. | revisions, drafts. | Comparar em coluna estreita e por leitor. |
| UX-F06 | Aplicado. Lixeira comunica que a sessão pode ser restaurada. | session-trash, integração de lixeira. | Confirmar entendimento e retorno de vínculos no ambiente real. |
| UX-F07 | Aplicado. Captura e encaminhamento com destino explícito. | quick-notes, session-note-links. | Descoberta e clareza de pendência com toque. |
| UX-F08 | Aplicado. Wiki de leitura com campanha e tipo; links por identidade. | wiki, wiki-rename, wiki-links e search. | Leitura longa e lista de personagens com homônimos. |
| UX-F09 | Aplicado. Vínculo, busca e remoção de associação. | document-tags, search. | Comunicar diferença entre associação e tag para usuário. |
| UX-F10 | Aplicado. Restaura consulta e foco, com fallback se resultado mudou. | search com rename, lixeira e falha. | Navegação assistiva e retorno em tela estreita. |
| UX-F11 | Aplicado. Navegação rápida com favoritos. | quick-navigation e codex-foundations. | Atalho reservado, toque e anúncio. |
| UX-F12 | Aplicado. Carga, campos, estado e histórico separados. | pending-items, codex-secondary e integração. | Compreensão dos conflitos e da transição por tarefa. |
| UX-F13 | Aplicado. Formato, limite, destino e prévia explícitos. | text-import, codex-secondary e integração. | Selecionador de arquivo físico e interpretação de resultado incerto. |
| UX-F14 | Aplicado. Metadados de anexo, envio e vínculo separados. | attachments e integração. | Toque, foco e entendimento da remoção de vínculo. |
| UX-F15 | Aplicado. Entrada global, origem, evidência e histórico. | narrative e integração. | Entendimento da distinção entre natureza e avaliação. |
| UX-F16 | Aplicado. Consulta explícita, filtros por sujeito e isolamento. | perspectives com resposta atrasada, integração. | Compreensão de escopo e anúncios assistivos. |
| UX-F17 | Parcial. ZIP identificado como exportação portátil; cópia operacional separada. | export, pilot e integração backup/export. | Entendimento da distinção, restauração isolada e acesso privado. |
| UX-D01 | Parcial. Raios de painel e campo relacionados por token. | CSS e inspeção geometricamente dirigida. | Medir três encaixes, registrar diferenças por recuo efetivo. |
| UX-D02 | Condicional em divisores alfa. Campo funcional usa borda opaca. | CSS e teste de contraste do campo. | Medir composição se houver borda alfa funcional. |
| UX-D03 | Aplicado ao Codex. OKLCH e fallback sRGB. | CSS e contraste efetivo em Chromium. | Validar saída no conjunto de navegadores suportado. |
| UX-D04 | Condicional. Gradiente de fundo sem aplicação necessária. | Inspeção da configuração Codex. | Se escolhido, verificar pontos extremos e intermediários. |
| UX-D05 | Parcial. Ícone de navegação com texto e função declarada. | codex-foundations e DOM. | Comparar peso e coerência quando houver família mais ampla. |
| UX-D06 | Condicional. Conteúdo sem máscara. | Inspeção das áreas roláveis. | Se adotada, verificar pistas de rolagem, alvos e foco nas bordas. |
| UX-D07 | Aplicado. Superfícies base, painel e elevada em tema escuro. | CSS, capturas e contraste piloto. | Reconhecer profundidade em alto contraste. |
| UX-D08 | Parcial. Altura dinâmica na estrutura e no diálogo com fallback. | codex-foundations, quick-navigation. | Teclado virtual, zonas seguras e orientação reais. |
| UX-D09 | Parcial. Escala compacta em superfícies e áreas de interação. | CSS, codex-secondary e codex-foundations. | Inspecionar densidade e alvos compactos por superfície. |
| UX-D10 | Aplicado. Serifa em leitura e fonte de sistema em controles. | CSS e capturas das vistas de leitura. | Comparar legibilidade em 200% e fontes substitutas. |
| UX-D11 | Condicional a ajustes ópticos. Ícone de navegação deslocado no próprio desenho. | CSS e foco do botão na suíte. | Verificar rótulos com quebra e alvos em escalas reais. |
| UX-D12 | Parcial. Mensagens de estado e cores semânticas compartilhadas. | codex-secondary, drafts, session-writing, perspectives. | Comparar anúncios e estados em três vistas reais. |
| UX-D13 | Aplicado. Metadados e prévia alternáveis com recuperação próxima. | session-writing, drafts e revisions. | Verificar descoberta de ações e mensagens em fluxo assistivo. |

## Roteiro proposto para UXR-07

A execução aguarda autorização. Registrar commit, navegador e versão, aparelho, configuração assistiva, viewport e zoom, dados fictícios, passos, resultado e evidência de cada tarefa. Reutilizar a [estratégia aprovada](../revisada/04-validacao-e-decisoes.md) e a suíte atual.

1. **Windows/Chromium e teclado.** Abrir campanha, escrever e confirmar, recuperar rascunho e reencontrar texto por busca. Percorrer campanha, wiki, perspectivas, pendências, captura e portabilidade. Verificar ordem, foco visível e retorno, texto a 200%, reflow a 400%, espaçamento de texto e rolagem de tabelas. Registrar anúncio efetivamente ouvido com leitor de tela.
2. **Android/Chrome em aparelho físico.** Repetir escrita, consulta e captura em retrato e paisagem. Conferir alcance de Salvar com teclado virtual, toque em ações secundárias, leitor nativo, deslocamento e fechamento do menu.
3. **Integridade e falha.** Em banco isolado, repetir offline, concorrência de abas, perda de resposta após gravação, descarte e restauração de sessão. Conferir versões, ausência de duplicação, backup operacional e ZIP portátil.
4. **Aceite e aplicabilidade.** Comparar a interface implementada com o Codex aprovado. Registrar acessibilidade A/AA por página e processo, exceções e resultados desconhecidos. Registrar avaliação do mantenedor separadamente da automação.
5. **Desempenho.** Comparar o build e os fluxos de escrita e consulta com as medições da UXR-06.4. Decidir sobre otimização somente se houver impacto percebido ou medido. Preservar o limiar do aviso e comparar com ambiente e parâmetros equivalentes.

A exclusão de anotações rápidas e a exclusão definitiva de sessões ficam na P11, depois do ciclo de UX/UI.
