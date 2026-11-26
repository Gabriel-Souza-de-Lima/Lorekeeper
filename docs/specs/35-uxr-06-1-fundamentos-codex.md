# UXR-06.1 — Fundamentos Codex e entrada de campanha

Escopo autorizado após aprovação integral da UXR-05. [Design System Codex](../ux-ui/design-system-codex.md) · [UXR-03](../ux-ui/auditoria/uxr-03.md) · [Campanhas](01-gerenciamento-de-campanhas.md)

| ID | Critério de aceitação | Evidência |
| --- | --- | --- |
| UX61-01 | A borda funcional mantém 3:1 no campo e na sua adjacência, texto normal 4,5:1, foco visível e compacto sem reduzir alvos principais de campanha e navegação abaixo de 44 CSS px. | Playwright, cores computadas, dimensões e foco. A2, G05, G07, G12 e D01–D03/D07/D09–D12. |
| UX61-02 | A superfície primária do cartão abre a campanha por clique no corpo ou teclado. Uma ação secundária abre a edição sem disparar a ação principal. Arquivadas preservam leitura e regras existentes. | Playwright, clicando fora do título, ativando por Enter e verificando destinos. A4, G02, G05–G07 e F01/C01–C03. |
| UX61-03 | Acervo e campanha têm destinos identificáveis. A lateral recolhe e expande via botão; mobile abre recolhido e expande em fluxo. Ao navegar pela lateral ou pelo cartão, o foco vai ao título ou campo inicial. Favoritos permanecem acessíveis pela navegação rápida e Personagens abre o recorte equivalente da wiki. | Playwright, grupos, estado, foco e 320/390/768/1280 CSS px. G01, G05–G08, F08/F11 e D05/D08/D11/D13. |
| UX61-04 | Os fundamentos visuais usam Codex e tipografia híbrida. Permissões de escrita, conteúdo já salvo e saída com trabalho pendente seguem os contratos vigentes. | Inspeção de CSS, capturas e regressão completa. G04, G09, G13 e critérios funcionais vigentes até P10-B. |

O recorte usa a navegação em memória existente. Botões acionam transições internas e links continuam reservados a URLs reais. Se o módulo já tem proteção de saída própria, a navegação lateral fica indisponível durante seu fluxo em vez de contorná-la. As revisões específicas de editor, busca e perspectivas serão tratadas nos recortes posteriores. Gradientes, máscaras e ornamentação ficam fora desta composição.

## Evidência e aceite

A avaliação automatizada deste recorte cobre Chromium Linux. Aceite humano da composição, zoom real, leitor de tela em Windows e toque/teclado virtual no Android dependem de ensaios próprios.

### Execução do recorte

- **UX61-01 e A2.** Tokens Codex OKLCH com fallback sRGB, superfícies em camadas, raio externo de 16 CSS px e raio interno derivado para campos. O teste calcula contraste a partir das cores computadas de borda, campo, painel, texto e indicador de foco, e verifica o anel de 3 CSS px.
- **UX61-02 e A4.** O botão primário ocupa a largura do cartão e aceita mouse e teclado. Editar tem sua própria região e nome com a campanha. Os cartões arquivados preservam a leitura. A ação interna permanece um botão, pois o roteamento é mantido em memória.
- **UX61-03.** Navegação de acervo recolhível, contexto de campanha, atalhos visíveis quando o acervo está recolhido no painel, destino Personagens com filtro na wiki existente e Favoritos identificados na navegação rápida. O controle móvel abre em fluxo normal. Do cartão e dos destinos novos, o foco chega ao título ou ao campo inicial. Vistas com edição ou proteção de saída continuam usando seus retornos próprios.
- **UX61-04.** Georgia nos títulos, anotações de sessão e prévia narrativa; fonte de sistema em rótulos, controles e filtros. A grade e os fluxos do editor permanecem sob os contratos existentes. A coluna única, a reorganização de metadados, o retorno contextual da busca e a reformulação de perspectivas ficam nos recortes seguintes.

**Red → Green → Refactor.** O E2E focal falhou antes da implementação quando o título da campanha não recebeu foco. Passou com o novo fluxo e as verificações de contraste, alvo, ação secundária e navegação responsiva. Na primeira regressão, quatro testes de rascunho encontraram tanto o botão da campanha quanto o novo botão de edição por correspondência parcial. O seletor passou a identificar o botão pelo nome exato, preservando todas as asserções de gravação e recuperação. Os atalhos visíveis foram consolidados para oferecer um único destino por nome quando a lateral estiver aberta.

As capturas desta entrega foram feitas na aplicação Vite/Fastify com SQLite em memória, campanhas fictícias e Chromium Linux. O painel e a entrada de campanha usam 1280 CSS px. As imagens de navegação recolhida e expandida usam 390 CSS px. As capturas PNG acompanham o relatório da entrega, fora do Git.

### Avaliação local

Após sincronizar a `main`, instale as dependências com `npm ci`, gere o build com `npm run build` e inicie a aplicação com `npm start`. Para ensaiar com um acervo isolado no Windows, defina `$env:LOREKEEPER_DB_PATH = 'data/uxr-06-1-ensaio.sqlite'` no PowerShell antes de iniciar. Abra `http://127.0.0.1:3000` e crie campanhas fictícias. Abra pelo corpo do cartão, compare com Editar, recolha a navegação pelo teclado, localize Personagens e Favoritos e repita em 320 e 390 CSS px. O [guia de atualização local](../DEVELOPMENT.md#atualizar-a-interface-local-após-receber-mudanças) documenta a verificação do build servido.

A aceitação humana do visual, zoom real, Windows/Chromium, leitor de tela e toque/teclado virtual em Android permanecem pendentes. O ensaio em viewport estreita confirma reflow e interação automatizada no Chromium Linux.

**Regressão local.** Lint, análise de tipos e build aprovados. Passaram 5 testes unitários, 83 de integração e 45 E2E com dois workers, incluindo o cenário novo.
