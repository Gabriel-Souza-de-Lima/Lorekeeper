# UXR-06.4 — Superfícies secundárias e regressão

Base aprovada pelo mantenedor no PR #78, commit `c5188a1`, com CI pós-merge concluído. Este recorte completa a aplicação dos padrões compartilhados. [Design System Codex](../ux-ui/design-system-codex.md) · [Auditoria UXR-03](../ux-ui/auditoria/uxr-03.md)

| ID | Critério | Verificação |
| --- | --- | --- |
| UX64-01 | Captura, encaminhamento, importação, anexos e pendências compartilham espaçamento, campos e ações Codex. Controle de arquivo e exportação têm alvos reconhecíveis por teclado e foco visível. | Playwright em 320 e 1280 CSS px, inspeção e capturas. G05–G08, G10, G12, F07, F12–F14 e F17. |
| UX64-02 | O estado de carregamento é anunciado e distinguível de erro e vazio nos recortes alterados. Apenas ações efetivas aparecem como ações. A lixeira explica reversibilidade e a exportação comunica finalidade portátil. | Rede controlada, teclado e regressões de captura, anexos, importação, lixeira e exportação. G03, G06, G09 e F06/F17. |
| UX64-03 | Usar os contratos e APIs existentes, preservando dados, versões, reenvio, histórico e isolamento. Consolidar a evidência para os 45 requisitos, com lacunas de julgamento humano e aplicabilidade. | Regressão completa e matriz consolidada. G04/G13–G15 e especificações até P10-B. |

Exclusão de notas rápidas e exclusão definitiva de sessões permanecem na P11. UXR-07 terá roteiro próprio e aguarda autorização.

## Inspeção, mudanças e evidências

| Superfície | Inconsistência observada | Resultado |
| --- | --- | --- |
| Campanhas, escrita, busca, wiki e perspectivas | Fundamentos, estados de escrita e escopo já protegidos nos incrementos anteriores. | Cobertura mantida pela regressão. Nenhuma nova iconografia foi necessária. |
| Captura e encaminhamento | Captura e detalhes de destino não seguiam a mesma escala. Notas curtas herdavam a altura mínima da prévia longa. | Espaçamento compartilhado, serifa na anotação, controles de sistema e destino separado por divisor. Aviso de confirmação incerta usa texto e cor. |
| Pendências | Carregamento aparecia como um botão desabilitado. Campos, edição e detalhes tinham ritmos diferentes. | Carregamento anunciado, ação de recarga só em falha, vazio distinto e espaçamento compartilhado. A transição e o histórico continuam separados da edição de campos. |
| Importação e anexos | Controle nativo de arquivo destoava dos alvos Codex. Informações de destino e limite de importação estavam dispersas. | Selecionador com contorno e altura consistentes, limites visíveis e associados ao campo, ação explícita e espaçamento compartilhado para associar arquivos. O idioma do texto nativo depende do navegador. |
| Lixeira e exportação | A reversibilidade não estava explicada. O link de exportação tinha alvo curto e não informava o formato. | Lixeira informa a restauração possível. Link de 44 CSS px com descrição acessível do ZIP portátil. A rota de download e o backup operacional permanecem separados. |

**Red → Green → Refactor.** O cenário focal falhou na base porque o link de exportação carecia de descrição acessível. Com a mudança, verificou descrição, dimensão do alvo, foco após abrir a importação, limite do arquivo, reflow e mudança de carregamento para vazio. A primeira repetição da regressão focal encontrou uma regressão introduzida no nome acessível da anotação já preenchida. O rótulo explícito ficou fora do campo e o teste de reenvio após recarga voltou a localizar a anotação pelo nome exato. Asserções de recuperação foram preservadas.

**Capturas.** Aplicação Vite/Fastify com dados fictícios e SQLite isolado. PNGs de Anexos, Pendências e Lixeira em 1280 CSS px e de Captura e Importação em 390 CSS px acompanham o relatório fora do Git.

**Bundle para a UXR-07.** Build Vite 8.3.8 com o ambiente local e as mesmas dependências. Na base `c5188a1`, JS **501,45 kB** / **149,30 kB gzip** e CSS **9,51 kB** / **2,84 kB gzip**. Nesta entrega, JS **502,95 kB** / **149,63 kB gzip** e CSS **10,99 kB** / **3,10 kB gzip**. O aviso de 500 kB continua ativo. Os números impressos pelo Vite são referência de build, sem medição de tempo de interação. Não houve otimização de bundle.

A [rastreabilidade dos 45 requisitos e o roteiro UXR-07](../ux-ui/auditoria/rastreabilidade-uxr-06.md) distinguem implementação, automação, aplicabilidade condicional e validação humana. A UXR-07 aguarda autorização.

**Validação local.** Lint, análise de tipos e build aprovados. Passaram 22 execuções focais em duas repetições e a regressão completa de 5 testes unitários, 83 de integração e 50 E2E com dois workers.

**Diagnóstico do candidato inicial do PR #79.** A [execução 45915961144](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45915961144) encontrou uma corrida no teste preexistente do editor. As duas medições separadas observaram a lateral em estados diferentes durante a mudança de viewport. Uma reprodução controlada gerou os mesmos valores do CI, 119,71875 e 254,71875 CSS px. O teste agora aguarda a atualização da lateral e compara os dois elementos na mesma avaliação do navegador. A revisão não altera a composição operacional.
