# I2 — Integridade do editor de sessões

- **Estado** — proposta para implementação em entregas pequenas.
- **Objetivo** — preservar o texto durante falhas de rede e recuperar a sessão depois de trocar de aba ou dispositivo.
- **Rastreabilidade** — MVP-01 (acesso privado), MVP-04 (histórico e estado), MVP-05, MVP-06 e MVP-07. Produto §§4.3 e 7. [Arquitetura](../ARCHITECTURE.md#salvamento-e-sincronização).

## Entregas e critérios

| Ordem | ID | Cenário e critério verificável | Teste previsto |
| --- | --- | --- | --- |
| 1. Histórico e idempotência | I2-01 | Abrir um banco do Incremento 1, manter os registros e guardar um retrato do texto atual como primeira revisão disponível. Gravar a próxima versão e registrar sua revisão na mesma transação. | Integração com SQLite em disco e migração a partir da versão anterior |
| 1. Histórico e idempotência | I2-02 | Após confirmar a transação e perder a resposta, repetir a mesma mutação e receber a versão originalmente confirmada sem adicionar revisão. Reusar uma chave para outro conteúdo resulta em conflito e mantém o texto já salvo. | Integração com reenvio e inspeção do histórico |
| 2. Rascunhos e fila | I2-03 | Digitar durante queda da rede, aguardar confirmação do IndexedDB, fechar a aba e reabrir a sessão online no mesmo perfil. Recuperar o rascunho e enviar a mesma operação pendente. | E2E com queda de rede e reabertura de página |
| 2. Rascunhos e fila | I2-04 | Manter alterações mais novas quando uma resposta antiga chega. Uma falha do IndexedDB é visível e o texto continua disponível para cópia ou download. | E2E com atraso de resposta e falha de armazenamento |
| 3. Resolução e restauração | I2-05 | Editar a mesma base em dois contextos. Mostrar versão local e remota sem sobrescrever nenhuma. O usuário pode combinar, preservar para depois ou descartar explicitamente. Uma nova gravação concorrente exige nova comparação. | E2E com dois contextos independentes |
| 3. Resolução e restauração | I2-06 | Consultar revisões e recuperar o título e o corpo de uma versão anterior numa nova revisão, mantendo as anteriores disponíveis. | Integração e E2E |
| 4. Acesso privado | I2-07 | Em dois dispositivos autorizados, abrir o mesmo serviço HTTPS e observar o texto confirmado mais recente. Um dispositivo fora da rede autorizada não alcança a aplicação ou a API. | Ensaio documentado de implantação com dispositivos reais |

## Regras e limites

- Chaves idempotentes são vinculadas à sessão e ao conteúdo original. Uma confirmação cobre apenas a geração local enviada. Ao receber conflito, preservar o rascunho e exigir escolha explícita para usar uma nova versão-base.
- Rascunhos ficam separados por sessão e aba. Ao reabrir um perfil com mais de um rascunho da mesma sessão, apresentar as opções de recuperação. Falha de gravação local ou de rede nunca é apresentada como confirmação do servidor.
- Histórico e restauração cobrem título e corpo. Registros criados antes da migração trazem seu último conteúdo conhecido. A migração é aditiva e deve ser exercitada com banco fictício da versão anterior.
- Abertura inicial sem rede, cache de campanhas e instalação da PWA permanecem fora do escopo. O ensaio de rede privada depende do ambiente e dos dispositivos autorizados do usuário. As entregas de persistência e editor podem ser testadas em loopback com dados fictícios.

## Contrato da primeira entrega

- `GET /api/campaigns/:campaignId/sessions/:sessionId/revisions` lista os retratos de título e corpo por versão decrescente. Sessões arquivadas continuam legíveis e uma sessão de outra campanha retorna 404.
- `PUT` de sessão aceita o cabeçalho opcional `Idempotency-Key` com UUID. Uma repetição com os mesmos campos normalizados e a mesma versão-base devolve a resposta original, mesmo após uma edição posterior. Reaproveitar a chave com campos ou versão-base diferentes retorna 409. A chave é específica da sessão. Requisições sem chave preservam o contrato do Incremento 1.
- A migração V2 é aditiva. Ela registra apenas a versão disponível do texto legado, com sua data de atualização. As revisões de novas sessões começam na versão 1. Atualização do documento, metadados, revisão e confirmação idempotente compartilham a mesma transação.
- Comprovantes idempotentes ficam retidos nesta etapa. Uma política de expiração só será introduzida junto com a reconciliação de operações antigas.

## Evidências da primeira entrega

- **Red** — os testes de integração receberam 404 ao consultar o histórico da sessão legada e 409 ao reenviar a gravação já confirmada.
- **Green** — os testes passaram com a migração V2, o histórico e o comprovante idempotente. O teste de falha injetada na gravação do comprovante demonstrou que a transação preserva a versão e o histórico anterior.
- **Refactor** — as verificações de escopo passaram a usar uma consulta de existência compartilhada, sem carregar o texto da sessão. A regressão completa inclui persistência em disco, reabertura e o fluxo de edição do Incremento 1.

Esta entrega implementa I2-01 e I2-02. I2-03–I2-07 continuam planejados.

## Contrato de rascunhos e fila

- O IndexedDB identifica o rascunho pela sessão e por uma edição individual. Uma aba detém um Web Lock durante a edição. Outra aba pode editar a mesma sessão sem substituir o rascunho ativo.
- Após reabrir online, a interface oferece os rascunhos recuperáveis do mesmo perfil. Escolher um deles preserva sua versão-base e a operação eventualmente pendente. Uma aba que já detém o rascunho continua com a posse.
- Antes de enviar um PUT, grave localmente o UUID, o conteúdo exato e a versão-base da operação. Uma edição posterior mantém essa operação congelada. A confirmação de uma geração antiga mantém as edições seguintes na fila.
- Ofereça nova tentativa e tente novamente após o retorno da conexão. Erro de armazenamento é visível e permite baixar o texto. Conflitos mantêm o rascunho para resolução posterior.
- I2-03 e I2-04 são verificados em Chromium com queda de rede, perda de resposta após gravação, atraso da confirmação, reabertura e falha de IndexedDB. A comparação de versões no conflito pertence ao próximo incremento interno.

### Evidências de I2-03 e I2-04

- **Red** — Chromium demonstrou ausência do UUID na perda de resposta e ausência de aviso quando o IndexedDB falhou.
- **Green** — testes E2E confirmam o reenvio do mesmo UUID após reabrir a aba, preservação de edição mais recente, falha local com download e recuperação de duas edições offline independentes.
- **Refactor** — a confirmação durável passou a ser comparada ao rascunho atual no evento de saída. O foco retorna às anotações depois da verificação inicial e da recuperação.

A fila do navegador depende da integração dos comprovantes idempotentes da primeira entrega. O histórico visual, a resolução de conflitos e o acesso privado ficam nas próximas entregas internas do Incremento 2.

## Contrato de conflitos e restauração

- I2-05. Um conflito mantém o rascunho e permite consultar a versão do servidor. O editor mostra os valores locais e os da versão consultada. Editar o rascunho continua possível e a combinação só é enviada após confirmação explícita, com nova chave e a versão-base exibida. Se outra gravação ultrapassar essa versão, exija nova consulta. É possível sair com um rascunho confirmado no IndexedDB ou descartá-lo explicitamente em favor da versão exibida. Falha no descarte local mantém o texto.
- I2-06. O histórico permite inspecionar e restaurar título e Markdown. A restauração usa a fila versionada normal e cria uma revisão, preservando metadados e histórico anterior. A ação exige confirmação e fica indisponível enquanto houver rascunho ativo ou a campanha estiver arquivada.

### Evidências de I2-05 e I2-06

- **Red** — Chromium encontrou a gravação em conflito, mas falhou ao procurar a comparação de versões e o histórico.
- **Green** — dois contextos de navegador confirmam que o conflito preserva o rascunho, que uma nova edição remota exige outra comparação e que a restauração adiciona uma revisão mantendo os metadados.
- **Refactor** — a combinação e a restauração reaproveitam a fila durável. O descarte adota a versão do servidor apenas após confirmar a exclusão local. A regressão cobre sair com o rascunho, reencontrá-lo, cancelar o descarte e manter o texto se o IndexedDB falhar.

O ensaio de acesso HTTPS privado em dispositivos reais (I2-07) permanece pendente.

### Encerramento do servidor no teste I2-06

Após a restauração e a confirmação do histórico, o servidor de teste deve parar de aceitar conexões, concluir respostas HTTP em andamento e recolher as conexões persistentes quando ficarem ociosas. O teste de integração usa uma requisição em andamento para verificar a entrega integral da resposta e o término do servidor.

**Red → Green → Refactor.** Com apenas `app.close()`, a reprodução entregou a resposta, mas manteve aberta a conexão que ficou ociosa depois do início do fechamento. Com a drenagem compartilhada, a resposta continuou íntegra e o servidor fechou sem esperar o keep-alive. I2-05 e I2-06 usam o mesmo procedimento no encerramento.

Todos os cenários E2E que iniciam Fastify usam a drenagem compartilhada, inclusive quando o cenário reinicia o servidor. Ela preserva respostas ativas e evita que uma conexão HTTP já ociosa bloqueie o fechamento.

Ao concluir o I2-06, o navegador confirma que os painéis terminaram as leituras. O contexto e o cliente da API são encerrados antes do Fastify. As etapas dos clientes e do servidor têm nomes distintos no relatório de CI.
