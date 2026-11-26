# UXR-03 — Auditoria da interface existente

O mantenedor aprovou os 45 requisitos revisados como base desta auditoria em 25 de novembro de 2026 (horário de Brasília). A aprovação abrange o recorte de avaliação. Navegação futura, editor, identidade visual e matriz de ambientes continuam sujeitos a decisão própria. [Matriz de referência](../revisada/03-aceitacao-e-rastreabilidade.md) · [Estratégia](../revisada/04-validacao-e-decisoes.md)

## Ambiente e evidências

- **E1 — Fluxos em execução.** Checkout `7736f2f` da `main`, Node 24.22.3, Linux e Chromium 156 do ambiente. Build Vite, Fastify em loopback e acervo fictício nos bancos isolados da suíte. `LOREKEEPER_CHROMIUM_PATH=/usr/bin/chromium NODE_ENV=test CI=true npm run test:e2e -- --workers=2` passou **44/44**. A matriz cita os nomes dos arquivos da [suíte E2E](../../../tests/e2e/). A passagem da suíte sustenta somente as asserções existentes.
- **E2 — Navegação e alvo.** Em Chromium headless a 1280 × 800, campanha fictícia e sessão com tag, o cartão mediu aproximadamente 938 × 155 CSS px. O botão do título mediu 154 × 48. O clique a 12 px das bordas direita e inferior atingiu o `article` e manteve o painel. O título em destaque é acionável e existe ação independente no cartão quando aplicável. A diferença entre superfície e alvo é mensurável. Expectativa de clique no cartão inteiro é hipótese de usabilidade.
- **E3 — Busca contextual.** Preenchi termo e filtros de campanha, categoria e tag, abri a sessão pelo resultado e procurei retorno à busca. O editor ofereceu retorno ao painel de campanha, e a navegação global também ofereceu retorno ao painel. Não havia retorno direto aos resultados. A inspeção de `main.tsx` e `search.tsx` também mostrou que o retorno da anotação rápida recria a busca sem reaproveitar o estado local do formulário.
- **E4 — Escrita e reflow.** Abri a mesma sessão a 320, 390, 768 e 1280 CSS px. A largura do documento coincidiu com a viewport nas quatro amostras. O início de Anotações ficou a 1143, 1101, 700 e 670 CSS px do topo, respectivamente. Nove controles habilitados precediam o texto no DOM. Em 320 × 640, escrevi, rolei até Salvar e confirmei “Salvo no servidor”. Capturas do painel e do editor foram conferidas junto das medições. O recorte usa uma sessão existente e texto curto.
- **E5 — Semântica e contraste.** Inspeção de JSX e CSS das vistas amostradas. Rótulos nativos, `aria-pressed`, status de gravação e regiões nomeadas coexistem com diferenças no tratamento de erro e contexto entre vistas. Contraste calculado por luminância relativa WCAG para texto principal, secundário e destaque sobre painel `#231f1a` foi 13,33:1, 7,62:1 e 9,21:1. A borda `#524a3d` apresentou 2,05:1 sobre o interior do campo `#191713` e 1,88:1 sobre o painel. A identificação da área editável depende dessa delimitação em campos amostrados. São medições de pares, sem varredura global ou veredito WCAG.
- **E6 — Código e rastreabilidade.** Inspeção dirigida do frontend e dos casos da suíte para conflitos, rascunhos, busca, perspectivas, semântica e responsividade. Evidências de integração, backup e acesso privado citadas como registros históricos têm seus próprios ambientes e datas.

## Achados prioritários

| Achado | Severidade | Evidência e impacto | Recomendação para avaliação futura |
| --- | --- | --- | --- |
| A1. Retorno da busca perde o percurso | Alta | E3. Ao abrir uma sessão, repetir a busca exige reconstruir termo e filtros. Ao voltar de anotação rápida, a busca é recriada. Afeta G01 e F10. | Reter o estado de busca e devolver foco ao resultado válido. Se o item desaparecer, devolver foco à lista e explicar a mudança. |
| A2. Delimitação de campos com baixo contraste | Alta | E5. As bordas amostradas ficam abaixo de 3:1 e o preenchimento tem pouca separação do painel. Isso dificulta reconhecer a área editável. Afeta G12, com D02 condicional à adoção de alfa. | Medir cada campo e estado relevante no fundo efetivo e fornecer contorno ou outro sinal visual suficiente. |
| A3. Escrita abaixo dos metadados e de ações auxiliares | Média | E4. O texto começa abaixo da primeira dobra em 320 × 640, e nove controles vêm antes no DOM. O salvamento acontece longe do campo no recorte visitado. Afeta G02, F03 e D13. | Comparar por tarefa uma entrada mais direta no texto e agrupamento progressivo de metadados. Medir passos antes de escolher composição. |
| A4. Cartão e área acionável com extensões distintas | Média | E2. Clique no corpo não abre a campanha. O texto de título concentra a navegação; ação secundária precisa de área própria. | Comparar título mais explicitamente acionável e ampliação do alvo principal, preservando ações independentes, foco e semântica. Validar a expectativa com o mantenedor e em toque. |

Alta indica perda substancial de contexto ou barreira de percepção identificada no recorte. Média indica atrito ou risco localizado. Baixa indica consistência ou clareza localizada. Severidade de um achado é distinta da prioridade P0–P2 do requisito.

## Matriz dos 45 requisitos

**Parcial** indica evidência positiva limitada a parte do critério. **Lacuna** indica desvio observado. **Pendente** indica evidência insuficiente para julgamento. **Condicional** indica decisão de desenho ou técnica ainda sem aplicação demonstrada. O traço na coluna de severidade significa ausência de desvio graduado nesta amostra.

| ID | Resultado | Evidência e problema | Sev. | Recomendação ou verificação restante |
| --- | --- | --- | --- | --- |
| UX-G01 | Lacuna | E3 · busca → sessão sem retorno ao contexto. | Alta | A1 e foco quando o resultado sumir. |
| UX-G02 | Parcial | E2/E4 · ação visível, alvo delimitado ao título e escrita abaixo da dobra. | Média | A3/A4 e roteiro sem instruções com o mantenedor. |
| UX-G03 | Parcial | E1/E5 · search e drafts distinguem busca pendente e falha local; cobertura parcial entre áreas. | — | Atrasar carga em seções independentes e verificar foco e anúncio. |
| UX-G04 | Parcial | E1 · manual-save, drafts e quick-notes verificam estados e persistência em módulos específicos. | — | Inventariar estados por módulo, inclusive edição transitória. |
| UX-G05 | Parcial | E1/E5 · fechamentos P10 restauram foco; E3 carece de retorno contextual. | Alta | A1 e teclado de ponta a ponta, incluindo oclusão em zoom. |
| UX-G06 | Parcial | E5 · rótulos e status verificáveis no DOM; anúncios reais não avaliados. | — | Ensaiar leitor Windows e móvel, registrar mensagens e erros por campo. |
| UX-G07 | Parcial | E2 · botão do título acima de 24 CSS px; a superfície restante não é alvo. | Média | A4 e medir ações compactas e exceções; validar toque físico. |
| UX-G08 | Parcial | E4 · escrita e gravação em 320 px, largura compatível nas quatro medidas. | — | Completar zoom real, espaçamento de texto, paisagem e teclado virtual. |
| UX-G09 | Parcial | E1 · manual-save e session-trash cobrem descarte e recuperação; nomenclatura Excluir exige avaliar compreensão do destino. | Baixa | Comparar linguagem para lixeira e validar cancelamento sem mutação por ação. |
| UX-G10 | Parcial | E1 · campaigns, revisions e text-import cobrem recuperação ou tratamento de falha em pontos distintos. | — | Inspecionar associação de erro e foco em campos abertos e recolhidos. |
| UX-G11 | Parcial | E1 · reenvio idempotente na captura e na narrativa; respostas fora de ordem sem ensaio específico nesta auditoria. | — | Inverter respostas e avaliar estado, foco e repetição involuntária. |
| UX-G12 | Lacuna | E5 · texto amostrado legível pelas proporções, delimitação de campos com contraste insuficiente. | Alta | A2 e medir estados, fundos e movimento aplicáveis. |
| UX-G13 | Parcial | E1 · drafts verifica duas abas e geração posterior; manual-save e P10 cobrem perda/recuperação em recortes próprios. | — | Completar matriz de armazenamento e recuperação por módulo. |
| UX-G14 | Parcial | E1 · perspectives exclui evidência global não atribuída; homônimos e corrida entre contextos não ensaiados aqui. | — | Alternar sujeitos e campanhas durante respostas invertidas. |
| UX-G15 | Pendente | E5 · amostra de risco, sem auditoria normativa completa por processo. | — | Registrar aplicabilidade A/AA, exceções, pendências e evidência assistiva. |
| UX-F01 | Parcial | E1/E2 · campaigns reabre sessões arquivadas e reativa; alvo do título é menor que o cartão. | Média | A4 e medir encontrabilidade dos estados após editar. |
| UX-F02 | Parcial | E1 · campaign-recap e session-recap exercitam resumo e destaques. | — | Medir descoberta de origem e próximos assuntos sem instruções. |
| UX-F03 | Parcial | E1/E4 · confirmação manual e escrita em 320 px; campo abaixo da dobra. | Média | A3 e ensaiar teclado virtual, erro e retorno. |
| UX-F04 | Parcial | E1 · session-templates e inline-wiki exercitam aplicação e inserção. | — | Avaliar clareza antes da confirmação e posição do cursor por tarefa. |
| UX-F05 | Parcial | E1 · revisions exercita conflito, nova comparação e recuperação de título/texto. | — | Conferir leitura das versões em uma coluna com zoom. |
| UX-F06 | Parcial | E1 · session-trash cobre recuperação; rótulo Excluir pode sugerir irreversibilidade. | Baixa | Verificar compreensão do efeito e recuperação de destinos relacionados. |
| UX-F07 | Parcial | E1 · quick-notes demonstra captura, recuperação e encaminhamento. | — | Validar identificação de destino e vazio com tarefa humana. |
| UX-F08 | Parcial | E1 · wiki, wiki-links e wiki-rename exercitam criação e vínculos. | — | Avaliar retorno e distinção de tipos com homônimos. |
| UX-F09 | Parcial | E1 · document-tags e search exercitam vínculo, filtro e retirada. | — | Avaliar a comunicação de escopo com etiquetas homônimas em duas campanhas. |
| UX-F10 | Lacuna | E3 · sem recuperação dos filtros no retorno de uma sessão. | Alta | A1, incluindo foco e resultado removido. |
| UX-F11 | Parcial | E1/E5 · quick-navigation e diálogo com combobox, lista e opção ativa. | — | Confirmar acionador, toque e atalhos concorrentes em ambientes reais. |
| UX-F12 | Parcial | E1 · pending-items exercita operações em pendências. | — | Conferir distinção de campos, transições e histórico com a tarefa completa. |
| UX-F13 | Parcial | E1 · text-import exercita importação pelo navegador. | — | Confirmar compreensão de prévia, destino e estado incerto. |
| UX-F14 | Parcial | E1 · attachments exercita vinculação e recuperação entre contextos. | — | Rever efeito de desvincular, limites e ações por toque. |
| UX-F15 | Parcial | E1 · narrative exercita evidência, conflito e histórico. | — | Testar em tarefa humana distinção entre natureza, avaliação e fonte. |
| UX-F16 | Parcial | E1 · perspectives compara conhecimento e exclui evidência global não atribuída. | — | Inverter respostas de dois sujeitos e validar compreensão do escopo. |
| UX-F17 | Parcial | E1/E6 · export verifica download; acesso privado e backup têm registros separados. | — | Validar compreensão da distinção e repetir restauração isolada se necessário. |
| UX-D01 | Condicional | E5 · há raios distintos no CSS; adoção de geometria concêntrica sem decisão. | — | Medir encaixes se a técnica for escolhida. |
| UX-D02 | Condicional | E5 · bordas amostradas são opacas; A2 se aplica pelo G12. | — | Medir composição se bordas alfa forem adotadas. |
| UX-D03 | Condicional | E5 · amostras usam cores hexadecimais. | — | Definir papéis e fallback se OKLCH for adotada. |
| UX-D04 | Condicional | E5 · gradientes não aparecem nas superfícies amostradas. | — | Medir extremos e fallback se houver adoção. |
| UX-D05 | Pendente | E2/E5 · ações amostradas usam rótulos textuais; família de ícones não foi avaliada. | — | Inventariar nomes, pesos e ícones decorativos quando aplicável. |
| UX-D06 | Condicional | E5 · áreas Markdown roláveis têm foco e região de tabela nomeada; sem máscara observada. | — | Testar extremos e indicador de foco se houver máscara. |
| UX-D07 | Condicional | E2/E5 · fundo, painel e backdrop existem; hierarquia do tema futuro segue aberta. | — | Comparar camadas e foco em zoom e alto contraste. |
| UX-D08 | Parcial | E4/E5 · diálogo rápido usa dvh, editor usa vh; teclado virtual não reproduzido. | — | Testar campo e ações nos dois sentidos de orientação em aparelho real. |
| UX-D09 | Parcial | E5 · há espaçamentos recorrentes em CSS; sem verificação de escala global. | — | Inventariar equivalentes e cruzar medidas de alvo com G07. |
| UX-D10 | Parcial | E2/E4 · papéis de título, metadado, texto e fonte monoespaçada são distinguíveis; prioridade de escrita reduzida. | Média | A3 e ensaio de leitura a 200%. |
| UX-D11 | Condicional | E2/E5 · nenhum ajuste ótico foi demonstrado na amostra. | — | Se adotado, comparar alinhamento, hitbox e foco em rótulos com quebra. |
| UX-D12 | Parcial | E1/E5 · estado do editor tem texto e região de status; equivalência entre vistas incompleta. | — | Comparar três vistas e verificar anúncios com leitor. |
| UX-D13 | Lacuna | E4 · resumo, destaques e metadados precedem o texto na abertura do editor. | Média | A3, preservando visibilidade de status, erros e recuperação. |

## Evidências que dependem de pessoas ou de ambientes reais

- **Mantenedor ou pessoa que execute a tarefa:** encontrar campanha, escrever, salvar, reencontrar e consultar a perspectiva correta sem instruções de UI. Registrar passos, tempo, erros, desvios e compreensão. Comparar a expectativa de clique no cartão e a percepção de lixeira, backup e estados.
- **Desktop com leitor e zoom do navegador:** verificar navegação e retorno completos, ordem, indicador de foco e oclusão, texto a 200%, reflow a 400%, espaçamento WCAG e anúncios efetivamente ouvidos. A análise estrutural e os testes com teclado fornecem evidência parcial.
- **Dispositivo móvel real:** repetir com toque e teclado virtual, retrato e paisagem, rolagem no editor, envio, cancelamento e recuperação. Verificar leitor nativo e ações compactas. Alterar viewport no Chromium não simula esses comportamentos.
- **Conformidade normativa:** consolidar aplicabilidade A/AA por página e processo completo antes de declarar conformidade WCAG. Escolhas de navegação, desenho do editor e identidade visual exigem avaliação e decisão próprias.

A UXR-03 registra o diagnóstico da interface atual e as pendências de validação por ambiente. A UXR-04 depende de autorização do mantenedor.
