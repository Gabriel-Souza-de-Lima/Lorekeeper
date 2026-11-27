# UXR-07 — Validação consolidada e aceite final

**Estado.** Aguardando aceite do mantenedor e os ensaios humanos abaixo. O mantenedor aprovou tecnicamente a UXR-06.4 e autorizou a UXR-07. A revisão dos critérios usa os 45 IDs e seus textos originais, com o [protocolo de continuidade](../../DEVELOPMENT.md#protocolo-de-continuidade), a [matriz aprovada](../revisada/03-aceitacao-e-rastreabilidade.md), a [rastreabilidade da UXR-06](rastreabilidade-uxr-06.md) e o [Design System Codex](../design-system-codex.md).

## Evidência de referência

A `main` local limpa, `origin/main` e a referência consultada no GitHub coincidiam em `85684ec5e1cc8daec656f8bc4565dafcb77712cc`. O CI pós-merge correspondente passou. Windows com Chromium 159.0.8154.6, Node.js 24.22.3 e npm 11.19.1. O HTML da porta 3000 referenciou JS `index-xS8kdJrP.js` e CSS `index-D3LgfuKj.css`. Ambos corresponderam byte a byte ao build novo; o Chromium isolado também recebeu o mesmo JS. Os E2E usaram perfis isolados e SQLite temporário. Os ensaios complementares usaram dados fictícios, arquivo SQLite novo e servidor loopback em porta efêmera. [PR #79](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/79) · [CI de 85684ec](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45918490035)

`npm run lint`, `npm run typecheck` e `npm run build` passaram. `npm run test:unit` aprovou 5/5, `npm run test:integration` aprovou 83/83 e `npm run test:e2e` aprovou 50/50 com oito workers. Nenhum teste falhou ou foi ignorado. A porta 3000 respondeu a consultas de assets estáticos. Ensaios de escrita, perda de resposta, conflito e restauração ficaram fora do ambiente operacional.

## Achados da UXR-03

| ID e severidade original | Antes | Evidência atual e limites |
| --- | --- | --- |
| A1 · alta | Abrir um resultado descartava termo, filtros e caminho de retorno. | A navegação interna restaura resultados e foco, com saída para título dos resultados se o documento sumir. O E2E usa filtro e verifica renomeação, falha e lixeira. A avaliação assistiva do anúncio fica aberta. [Busca](../../../tests/e2e/search.spec.ts) |
| A2 · alta | Bordas funcionais amostradas abaixo de 3:1. | O teste mede borda contra campo e adjacência, texto e foco. No Windows, formulário, editor e captura mediram respectivamente as mesmas relações de 5,89:1, 5,23:1, 14,69:1 e 11,79:1. A correção está evidenciada nessa amostra. O inventário completo por estado e fundo permanece parcial. [Fundamentos](../../../tests/e2e/codex-foundations.spec.ts) |
| A3 · média | Escrita abaixo dos metadados, com nove controles antes do campo. | A 320 × 640, o E2E observa campo editável e Salvar na viewport. Expansão de metadados e alternância da prévia preservam texto e seleção. Comparação em tarefa real e teclado virtual ainda pendentes. [Escrita](../../../tests/e2e/session-writing.spec.ts) |
| A4 · média | Só o título do cartão abria a campanha. | O E2E mede a superfície, clica no corpo, testa Enter e verifica que Editar abre apenas a edição. Toque físico fica pendente. [Fundamentos](../../../tests/e2e/codex-foundations.spec.ts) |

## Matriz individual dos 45 requisitos

**Validado** significa implementado e verificado no recorte de aceite indicado. **Parcial** mantém uma lacuna de evidência ou cobertura. **Defeito** exige reprodução no produto. **Humano** depende de observação humana. **Condicional** identifica uma técnica fora do desenho atual, ou cuja adoção futura exige nova prova. Os critérios normativos sem superfície correspondente têm justificativa no quadro WCAG. O CI e os testes existentes foram revisados pelo comportamento exercitado, sem promover todos os critérios associados por referência.

| ID | Estado | Resultado e próxima evidência |
| --- | --- | --- |
| UX-G01 | Validado | Busca interna preserva estado, foco e contexto da campanha. Resultado removido devolve foco lógico e mensagem. O comportamento entre reloads permanece fora desse aceite. |
| UX-G02 | Humano | Ações de campanha, editor e atalhos estão presentes. Medir descoberta independente, ajuda, passos e tempo com o roteiro humano. |
| UX-G03 | Parcial | Pendências distingue carregamento, vazio e recarga em falha. Busca e perspectivas evitam mostrar dados de requisição anterior. Falta completar anúncios e atrasos em outros módulos. |
| UX-G04 | Parcial | Sessão e P10 usam IndexedDB, captura usa localStorage. Estados de proteção, confirmação e falha foram verificados nesses módulos. Falta inventário dos formulários transitórios por processo. |
| UX-G05 | Parcial | Enter, Escape e retorno de foco exercitados em navegação, busca, editor e P10. Falta sequência completa de Tab/Shift+Tab e oclusão em todos os fluxos. |
| UX-G06 | Parcial | Rótulos, status e grupos são observáveis no DOM e nos E2E. Verificar o anúncio ouvido e os erros por campo no leitor Windows e Android. |
| UX-G07 | Parcial | Ações principais amostradas alcançam 44 CSS px. Falta inventário de exceções de 24 CSS px e toque físico. |
| UX-G08 | Parcial | Reflow, zoom e espaçamento amostrados em Windows. Falta teclado virtual, toque, orientação física e cobertura completa por processo. |
| UX-G09 | Parcial | Lixeira e desvinculação exercitam cancelamento e preservação. Saída da edição protege o rascunho. Falta conferência de entendimento do efeito nas demais confirmações. |
| UX-G10 | Parcial | Importação associa instrução de formato e limite. Erros e conflitos preservam campos nos cenários existentes. Falta verificar foco e associação dos erros em todos os formulários, inclusive recolhidos. |
| UX-G11 | Parcial | Consultas atrasadas e reenvios foram exercitados em busca, perspectivas e captura. A medição local é uma base de latência, e faltam as demais corridas e o efeito percebido. |
| UX-G12 | Parcial | A2 passou na amostra de campo; a paleta segue Codex. Falta medir a combinação menos favorável de cada estado e fundo e verificar alto contraste. |
| UX-G13 | Validado | E2E e integração exercitam perda de resposta, reenvio sem duplicata, geração posterior, conflito, recuperação e falha de armazenamento nos contratos de sessão, captura e narrativa. |
| UX-G14 | Parcial | A API isola campanha e sujeito. O cenário de perspectivas inverte respostas e protege conteúdo do sujeito atual; completar cruzamento de escopos e homônimos em consultas restantes. |
| UX-G15 | Parcial | A matriz abaixo explicita a aplicabilidade observada. Faltam cobertura A/AA por página/processo integral e prova assistiva. |
| UX-F01 | Parcial | Criação, edição, arquivo, restauração de acesso e cartão foram exercitados. Verificar entendimento do filtro e contexto em tarefa humana. |
| UX-F02 | Validado | Retomada abre sessão e pendência. Resumo confirmado tem precedência, texto literal tem rótulo próprio e sessão na lixeira fica fora. |
| UX-F03 | Validado | Escrita manual, prévia, criação no primeiro Salvar e recuperação de rascunho em largura estreita exercitadas. Teclado virtual permanece em G08/D08. |
| UX-F04 | Validado | Modelos exigem confirmação na substituição; a referência distingue homônimos, preserva o texto e mantém o salvamento manual. |
| UX-F05 | Parcial | Comparação, rebase, nova concorrência e proposta de restauração exercitados. Falta avaliação comparativa a 320 px com leitor. |
| UX-F06 | Validado | Cancelamento mantém sessão, lixeira retira dos escopos ativos e restauração repõe UUID e vínculos. O destino é explicado na interface. |
| UX-F07 | Validado | Captura, reenvio do mesmo UUID, encaminhamento, vínculo e desvinculação com nota preservada passaram. |
| UX-F08 | Parcial | Tipos, renomeação, backlinks, missão e destaque exercitados. Falta leitura humana prolongada e diferenciação de homônimos no percurso completo. |
| UX-F09 | Validado | Associação, busca, desassociação e preservação do restante do acervo foram verificadas, incluindo isolamento. |
| UX-F10 | Validado | Termos, filtros e retorno com foco passaram, incluindo resultado removido e falha. |
| UX-F11 | Parcial | Atalho e botão visível, favoritos, Escape e proteção de rascunho exercitados. Falta testar conflito de atalho com tecnologia assistiva e toque. |
| UX-F12 | Validado | Edição de dados, estado próprio, histórico, conflito e rejeição de referência externa exercitados. A edição transitória segue seu contrato. |
| UX-F13 | Validado | Prévia inerte, limite, destino, origem, confirmação e repetição sem duplicata passaram. A interação com seletor de arquivos físico integra o roteiro humano. |
| UX-F14 | Parcial | PNG/PDF, download, limites, isolamento, renomeação, reassociação, ZIP e restauração têm evidência. Ainda falta validar toque, foco e interpretação de remoção. |
| UX-F15 | Validado | Enunciado, natureza, avaliação, captura, correção histórica, conflito e foco após cancelar foram exercitados. |
| UX-F16 | Validado | Jogador e personagens, atribuição explícita, respostas invertidas, correção e detalhe global passaram. Compreensão humana e anúncio assistivo continuam no roteiro. |
| UX-F17 | Parcial | Rótulo informa ZIP portátil; CLI, teste SQLite e piloto anterior demonstram restauração separada. Entendimento humano da distinção e validação operacional agendada em dois dispositivos ficam separados. |
| UX-D01 | Parcial | Três amostras têm raio externo de 16 px, interno de 10 px e recuo lateral de 17 px. O recuo nominal de 6 px não descreve esses campos separados por rótulo e espaçamento. A validação de encaixes realmente concêntricos fica parcial. |
| UX-D02 | Condicional | Campos funcionais amostrados têm borda opaca. Se uma borda funcional alfa for adotada, medir o resultado composto com o fundo. |
| UX-D03 | Validado | A base declara papéis OKLCH, fallbacks sRGB e usa as cores computadas no E2E. A cobertura atual é Chromium. |
| UX-D04 | Condicional | Design aprovado usa fundos sólidos. Uma adoção futura de gradiente exige medir extremos e pontos intermediários. |
| UX-D05 | Parcial | Ícone da navegação é decorativo e o acionador continua nomeado recolhido. Falta revisar coerência entre ícones e anúncios reais. |
| UX-D06 | Condicional | Listas e tabelas não usam máscara. Se adotada, verificar pistas de rolagem, foco e alvos nas bordas. |
| UX-D07 | Parcial | Fundo, painéis e lateral elevada são distintos nas amostras. Falta inspeção com alto contraste do sistema. |
| UX-D08 | Humano | Fallback e viewport estreita existem. Alcance de Salvar e de fechar com teclado virtual depende de Android físico em duas orientações. |
| UX-D09 | Parcial | Escalas e alvos foram tratados em campos, cartões e secundários. Falta inventário normativo das exceções e equivalência por superfície. |
| UX-D10 | Parcial | Georgia e fonte de sistema distinguem leitura de controle; código usa monoespaçada. A leitura prolongada e fontes substitutas continuam para avaliação. |
| UX-D11 | Condicional | O deslocamento do ícone fica no desenho; a faixa conserva hitbox e foco nas amostras. Comparar rótulos de duas linhas se houver novos ajustes ópticos. |
| UX-D12 | Parcial | Salvamento, captura, pendências e perspectivas expõem estado textual. Verificar equivalência dos anúncios ouvidos em três vistas e estados extremos. |
| UX-D13 | Parcial | Metadados e prévia alternam por teclado, conservam seleção e deixam Salvar visível. Falta concluir o percurso de erro em campo recolhido e descoberta assistiva. |

## Inspeção visual e responsividade

A comparação reutilizou as capturas dos recortes e a geometria da UXR-06.1 para 320–2560 CSS px. O ensaio novo observou campanha, editor com texto longo e busca na mesma origem em zoom real de 100%, 200% e 400%, via Chromium `tabs.setZoom`. As larguras efetivas foram 1280, 640 e 320 CSS px. As medidas de `scrollWidth` coincidiram com a viewport, sem controles amostrados fora dos limites horizontais. A busca voltou ao resultado focado em cada escala. No editor, o campo recebeu foco por teclado com contorno computado de 3 px e permaneceu alcançável por hit test no ponto amostrado, inclusive a 400%.

Editor e busca receberam simultaneamente os quatro ajustes de espaçamento de texto da WCAG 1.4.12. O editor preservou o texto e a busca manteve acesso ao resultado e retorno. A tabela do ensaio tinha região focável e coube nessa amostra. O E2E do piloto, com tabela e código largos, é a evidência complementar de rolagem interna. O ensaio móvel de 320 CSS px foi emulado. A captura raster a 400% em modo headless teve limitações de composição, por isso a evidência de zoom usa as medidas do navegador e a interação. As capturas de comparação de código anteriores permanecem nas especificações de cada recorte.

Na inspeção do formulário de campanha, editor e captura, os três papéis de fundo mantiveram a paleta Codex observada nos recortes. As três amostras de campos sobre painel tiveram borda contra campo **5,89:1**, borda contra painel **5,23:1**, texto **14,69:1** e foco contra painel **11,79:1**. Os controles usam fonte de sistema, e as áreas de escrita de sessão e captura usam Georgia. Os estados permanecem rotulados por texto nos cenários exercitados. O espaçamento de texto fez a marca quebrar em linha no desktop sem perda de conteúdo ou do acionador. Trata-se de variação visual, sem defeito bloqueante demonstrado. Persistem as lacunas de alto contraste e avaliação assistiva registradas na matriz.

**Achados novos.** Nenhum defeito de produto foi confirmado nas amostras executadas. Não houve alteração de código, requisito, design system ou regra de negócio. Os artefatos de execução e as capturas com dados fictícios permaneceram locais, fora do Git.

## Desempenho

O build Vite 8.3.8 reproduziu a referência da UXR-06.4 nas quatro medidas. JavaScript **502,95 kB / 149,63 kB gzip** e CSS **10,99 kB / 3,10 kB gzip**. O aviso de 500 kB permanece ativo.

Sete repetições em Chromium local e loopback, a 100%, com uma campanha e uma sessão de texto longo, mediram o intervalo do comando automatizado até a condição visível. Incluem acionamento Playwright e renderização. São uma linha de base local, sem comparação histórica de latência equivalente ou extrapolação para Android ou rede privada.

| Ação → condição observada | Mediana | Mín–máx |
| --- | ---: | ---: |
| Abrir campanha → retomada disponível | 50 ms | 48–65 ms |
| Abrir última sessão → campo editável | 47 ms | 46–63 ms |
| Alterar texto → rascunho protegido | 12 ms | 10–14 ms |
| Salvar → confirmação do servidor | 51 ms | 47–52 ms |
| Buscar → resultado visível | 47 ms | 44–54 ms |

Os percursos medidos não indicaram necessidade de otimização neste recorte. Percepção humana, acervo maior e acesso remoto ficam fora desta medição.

## Acessibilidade por processo

As verificações abaixo são amostras da [WCAG 2.2](https://www.w3.org/TR/WCAG22/), com escopo de evidência declarado. A conformidade integral continua sem conclusão.

| Processo | Critérios A/AA amostrados | Resultado e limite |
| --- | --- | --- |
| Campanhas, acervo e navegação rápida | 2.1.1, 2.4.3, 2.4.7, 2.4.11, 2.5.8, 4.1.2 | Foco do cartão, lateral, ações independentes e diálogo exercitados. Oclusão e exceções de tamanho precisam de cobertura de todos os destinos. |
| Editor, rascunho e comparação | 1.4.4, 1.4.10, 1.4.12, 2.1.1, 3.3.1, 4.1.3 | Escrita e reflow amostrados. Tabelas usam rolagem interna por necessidade bidimensional. Confirmar comparação e mensagens com leitor e teclado virtual. |
| Busca, wiki e conhecimento | 1.3.1, 2.4.3, 2.4.7, 4.1.2, 4.1.3 | Foco e retorno automatizados, com regiões e estados no DOM. Falta anúncio real de mudança de sujeito, ausência e retorno. |
| Captura, pendências, importação, anexos, lixeira e ZIP | 1.4.11, 2.5.3, 2.5.8, 3.3.1–3.3.3, 4.1.3 | Alvos e rótulos amostrados, campo de arquivo e estados observáveis. Falta cobertura de erros, leitor e interação nativa no Android. |
| Apresentação compartilhada | 1.4.1, 1.4.3, 1.4.11 | Texto acompanha estados e contraste passou na amostra de A2. Avaliar demais fundos, estados e alto contraste. |
| Mídia temporal, arraste e autenticação web | 1.2.x, 2.5.7, 3.3.8 | Sem aplicação nas superfícies examinadas. PNG/PDF não são mídia temporal, as tarefas testadas usam botões/campos sem arraste, e o acesso privado externo à aplicação não oferece formulário de autenticação web nas páginas examinadas. |

Os demais critérios A/AA exigem revisão por processo e página. O status de cada amostra não se estende automaticamente a outras páginas ou ao ambiente com tecnologia assistiva.

## Integridade e portabilidade

A regressão exercitou confirmação manual, geração posterior, duas abas, conflito, falhas locais, reenvio idempotente, histórico e isolamento. Casos com SQLite real verificaram lixeira reversível, ZIP, restauração em caminho novo e perspectivas após restauração. A interface descreve o ZIP como exportação portátil e os testes da CLI tratam o SQLite como cópia operacional. A evidência anterior de backup real do piloto permanece aplicável ao ensaio executado, com agendamento e validação em dispositivos reais dependentes de confirmação própria. [Backup externo](../../specs/19-backup-externo.md) · [Piloto](../../specs/20-piloto-responsivo.md) · [Aceite P10-B](../../specs/34-perspectivas-e-conhecimento.md#aceite-local-no-windows)

## Roteiro de aceite humano

Use uma instância fictícia do Lorekeeper em porta independente e banco novo, conforme o [guia de desenvolvimento](../../DEVELOPMENT.md#comandos). Se testar no Android pela rede privada, use uma instância já preparada pelo mantenedor para o ensaio. Anote ambiente, navegador, largura, zoom, passos, ajuda recebida e resultado. Use os itens abaixo como tarefas, deixando os controles serem encontrados sem instruções prévias.

1. **Windows sem mouse.** Abra uma campanha de teste, retome a última sessão e registre uma pista. Salve, altere outra frase, saia e recupere o rascunho. Procure a pista com filtro, abra o resultado e volte. Observe ordem de Tab/Shift+Tab, retorno, foco visível e distinção entre rascunho e confirmação.
2. **Windows com NVDA ou leitor disponível.** Repita a abertura do editor, o salvamento e o retorno ao resultado. Em Informações, alterne entre jogador e personagem. Registre o que foi anunciado em rótulo, obrigatório, erro, confirmação, carregamento e mudança de perspectiva. Em 200% e 400%, confira foco sem bloqueio e acesso a Salvar.
3. **Android físico com Chrome.** Abra a campanha em retrato e paisagem. Expanda e feche a navegação, digite com teclado virtual, alcance Salvar e feche o teclado. Consulte um personagem e encaminhe uma anotação. Com TalkBack, registre os nomes ouvidos e verifique as ações de toque sem depender de gestos complexos.
4. **Sessão de RPG e revisão visual.** Ao longo das tarefas, marque ações difíceis de encontrar, texto cortado, tempo percebido e clareza de Codex. Confira um favorito, uma pendência e um anexo mostrando seus estados. Por fim, explique com suas palavras para que servem ZIP e backup e confirme que o destino da lixeira é compreendido.

O refinamento pode seguir para essa rodada humana. O encerramento do ciclo depende do resultado do roteiro e da decisão explícita do mantenedor. A P11 aguarda autorização própria.
