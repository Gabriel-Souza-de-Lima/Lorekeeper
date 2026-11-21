# Desenvolvimento e validação

A arquitetura de referência usa TypeScript, Fastify, React com Vite e SQLite. A infraestrutura inicial exercita o driver SQLite e um Chromium real no Codex Cloud, no GitHub Actions ou localmente. O Incremento 1 introduz a interface, a API e a primeira migração SQLite.

## SDD e TDD

1. Abra ou escreva a [especificação](specs/README.md) e confira o vínculo com o [MVP](MVP.md). Se uma regra de negócio estiver indefinida, apresente a dúvida para decisão e deixe o comportamento afetado pendente.
2. Selecione um critério e escreva o teste de menor nível que reproduz o comportamento.
3. **Red** — rode o teste focado e confirme que a falha demonstra o comportamento ausente. Erros de instalação, compilação ou configuração devem ser resolvidos antes de usar a falha como evidência.
4. **Green** — altere só o necessário para atender ao critério e rode o mesmo teste.
5. **Refactor** — melhore a estrutura mantendo o comportamento. Rode novamente o teste focado, a suíte existente e as verificações de CI aplicáveis.
6. Registre na entrega os IDs dos critérios, comandos, falha esperada do Red, resultado do Green e da regressão final, além de qualquer verificação indisponível e seu motivo.

Uma entrega está pronta para integração quando os critérios aplicáveis forem demonstrados, os testes e o CI aplicáveis passarem e a documentação refletir o comportamento entregue. Se uma verificação obrigatória estiver bloqueada, a entrega permanece pendente. Use asserções sobre resultados e dados persistidos em vez de perseguir metas artificiais de cobertura.

## Estratégia de teste

| Nível | Ferramentas e cobertura |
| --- | --- |
| Unitário | `node:test` e `node:assert/strict` para regras de negócio, validações e funções isoladas. O Node executa o subconjunto apagável de TypeScript. |
| Integração | Mesmo runner com SQLite real. Verificar persistência após reabertura, migrações, transações, isolamento de campanhas, vínculos, versões de gravação, idempotência, FTS5, exportação e restauração. Usar injeção HTTP do Fastify quando a API existir. |
| E2E | Playwright e Chromium. Conforme os fluxos forem implementados, iniciar a aplicação de teste em loopback, criar contextos independentes para dois dispositivos e testar autosave, perda de rede, reabertura, sincronização, concorrência e recuperação. Manter o teste de IndexedDB como verificação do navegador. |

Cada teste de integração que precisar de persistência deve criar seu próprio diretório temporário e banco, aplicar migrações reais quando disponíveis, semear o mínimo necessário e fechar as conexões antes de remover os arquivos. Use o equivalente no E2E para isolar dados do servidor e perfis do navegador. Uma restauração deve usar um caminho distinto do banco de origem. Os testes usam apenas conteúdo fictício. Nenhum serviço externo ou segredo é necessário para executar a suíte após instalar as dependências.

## Comandos

Execute na raiz do checkout, com as versões em `.nvmrc` e `package.json`. Use o npm distribuído com essa versão do Node e mantenha o lockfile no Git. Linux pode precisar de Python 3, make e compilador C++ se o driver SQLite precisar ser compilado. A instalação do navegador também pode precisar de bibliotecas do sistema.

| Comando | Finalidade |
| --- | --- |
| `npm ci --include=dev` | Instalar dependências a partir do lockfile. |
| `npx playwright install chromium` | Instalar o navegador definido pela versão do Playwright. Em Linux com permissões para instalar bibliotecas do sistema, use `npx playwright install --with-deps chromium`. |
| `npm run lint` | Executar ESLint. |
| `npm run typecheck` | Executar TypeScript em modo estrito sem emitir arquivos. |
| `npm run test:unit` | Rodar as regras isoladas. O diretório ainda aguarda código de domínio. |
| `npm run test:integration` | Rodar verificações com SQLite. |
| `npm run test:e2e` | Rodar verificações com Chromium. |
| `npm test` | Executar os três níveis em sequência. |
| `npm run build` | Compilar a interface para `dist/`. Rode antes de `npm start` ou dos testes E2E. |
| `npm start` | Servir a interface compilada e a API em `http://127.0.0.1:3000`. |

No Codex Cloud, se o diretório pessoal estiver somente para leitura, a instalação precisa de cache gravável tanto para o npm quanto para o node-gyp:

```sh
XDG_CACHE_HOME=/tmp/lorekeeper-build-cache npm ci --include=dev --cache /tmp/lorekeeper-npm
```

No Codex Cloud, use o Chromium disponível na imagem quando a política de rede impedir o download pelo Playwright. Nesta instância, o comando reproduzível é `LOREKEEPER_CHROMIUM_PATH=/usr/bin/chromium npm test`. Em outra máquina, use o caminho real do executável ou instale o Chromium do Playwright e execute `npm test` sem a variável.

- `NODE_ENV=test` é definido no CI. Os testes iniciam sua própria instância do servidor em uma porta efêmera e fornecem um caminho temporário para o SQLite.
- `LOREKEEPER_DB_PATH` permite escolher o arquivo SQLite. O padrão do servidor é `data/lorekeeper.sqlite`. `PORT` permite escolher a porta local. O Incremento 1 deve ser usado em loopback com dados fictícios.
- `LOREKEEPER_CHROMIUM_PATH` é opcional e seleciona um Chromium já instalado. O padrão é o navegador do Playwright.
- `PLAYWRIGHT_BROWSERS_PATH` é opcional e seleciona o diretório de instalação e execução dos navegadores do Playwright.

## GitHub Actions

O [workflow](../.github/workflows/ci.yml) roda nas PRs, nos pushes para `main` e nas filas de merge. O job `validar` falha quando um comando obrigatório falha. Após a primeira execução, quem administra o repositório deve selecionar esse status check em uma regra para `main` que exija PR e verificações aprovadas antes do merge. A aplicação da regra depende do plano, das permissões e das configurações do repositório privado. O workflow já fornece o status que a regra deve exigir.

## Validação da infraestrutura inicial

No Codex Cloud, a instalação limpa com o lockfile, o lint e a análise de tipos concluíram com sucesso. O teste de integração verificou SQLite em disco, cópia, integridade e busca FTS5. A verificação de navegador passou com o Chromium 156 da imagem e demonstrou a recuperação de um rascunho fictício após recarregar a página e o isolamento entre contextos. O download do Chromium pelo Playwright retornou HTTP 403 na rede do Codex Cloud.

A suíte unitária executou zero casos. O comando de build terminou sem compilar porque ainda não há script de build. O YAML do workflow foi inspecionado localmente. O usuário confirmou sucesso do job `validar` após o merge da infraestrutura na `main` no [run 44941680404](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/44941680404). A exigência do status check em `main` permanece sem confirmação. A consulta de proteção da branch pela API do GitHub retornou `Forbidden`.

## Evidências do Incremento 1

Os critérios C01–C03 e S01–S04 estão nas especificações de [campanhas](specs/01-gerenciamento-de-campanhas.md) e [sessões](specs/02-editor-de-sessoes.md).

- **Red** — `node --test tests/integration/campaigns.test.ts` falhou em dois casos porque as rotas ainda retornavam 404. A execução de `npx playwright test tests/e2e/campaigns.spec.ts`, sobre o build inicial, falhou ao procurar o botão “Nova campanha”.
- **Green** — os dois casos de integração e o fluxo de navegador passaram após a implementação. O navegador também confirmou que o texto permanecia no editor quando o envio falhava e chegava ao SQLite ao tentar novamente.
- **Refactor** — as gravações passaram a consultar o estado de arquivamento sem recomputar as métricas da campanha. A regressão incluiu lint, análise de tipos, build, SQLite e Chromium. O runner unitário continua sem casos. O SQLite e o fluxo de interface são os pontos de verificação dos comportamentos deste incremento.

O uso privado entre dispositivos, o histórico, os rascunhos locais duráveis e a resolução de conflitos fazem parte do Incremento 2. Neste incremento a versão-base protege o texto já gravado, e uma alteração pendente fica disponível na aba enquanto ela permanece aberta.

## Integração automatizada

### Estado atual e evidências

O PR #2 está na `main` em `a737343`. O Git por HTTPS funciona no Codex Cloud. A consulta REST aos metadados do repositório, proteção de branch e regras retornou HTTP 403. Isso impede confirmar o plano, a configuração de auto-merge e os checks obrigatórios com as credenciais atuais.

A [auditoria](../.github/workflows/audit-integration.yml) é acionada por `workflow_run` quando o CI de um PR termina. Usa somente `actions: read`, `checks: read`, `contents: read` e `pull-requests: read`. Executa o script da revisão padrão do evento, sem instalar dependências ou executar código do PR. O workflow precisa existir na branch padrão antes de receber esses eventos.

A auditoria verifica a identidade do workflow, a tentativa, o resultado do job `validar`, a associação a um PR, o repositório, a branch, os arquivos alterados, o candidato e seus pais. O resumo registra a decisão. `eligible` indica que a evidência coletada para `validar` passou na política de simulação. Se a API fornecer apenas o SHA do head e não o SHA do candidato sintético, a auditoria registra evidência indisponível. Paths fora da lista, mudanças críticas e renomeações a partir de caminhos críticos exigem revisão. A lista de paths é uma triagem conservadora, complementada por revisão de mudanças sensíveis antes de uma futura ativação.

Testes locais da [política](../tests/unit/integration-gate.test.ts) cobrem aprovação, falha, pendência, cancelamento, conclusão ignorada, mudança de head ou base, conflito e PR fora da lista. A [integração HTTP](../tests/integration/integration-audit.test.ts) exercita o script contra uma API simulada e verifica que ele faz exclusivamente GET. A simulação não estabelece o comportamento da API real ou um merge de ponta a ponta.

### Ativação proposta

Priorizar auto-merge nativo se o repositório privado oferecer as proteções necessárias. Um administrador deve verificar **Settings → Rules → Rulesets** ou **Settings → Branches** e **Settings → General → Pull Requests**. Configurar a `main` para exigir PR e o check `validar` do GitHub Actions, exigir atualização da base e nova validação, impedir bypass inclusive por administradores e habilitar **Allow auto-merge** quando disponível. Para PRs comuns, zero aprovações obrigatórias. Para mudanças críticas, usar revisão específica antes da ativação para aquele PR.

Antes de ativar o merge, demonstrar em PRs descartáveis os casos da [especificação](specs/03-integracao-automatizada.md). O GitHub pode aceitar conclusões como `skipped` ou `neutral` para checks obrigatórios. A política do projeto exige `success` explícito. Confirmar o bloqueio desses estados por um check confiável, sem execução condicional, associado ao candidato exato. Quando a fila de merge estiver disponível, manter o evento `merge_group` no CI e demonstrar que a fila testa o candidato construído sobre a base atual antes de integrar. Conferir todos os checks obrigatórios configurados no GitHub. Testar também uma atualização da base entre validação e tentativa de integração. Habilitar auto-merge por PR somente depois que todas essas garantias forem verificadas.

O endpoint REST de merge verifica um SHA esperado para o head. Ele não oferece uma condição equivalente para o SHA da base. A concorrência de Actions serializa seus próprios jobs, enquanto outros atores ainda podem atualizar a `main`. Sem uma proteção do GitHub que feche essa janela, manter a opção de workflow separado em modo de auditoria.

### Publicação de PRs e continuidade

O push via credencial Git do Codex Cloud e a criação de PR via API são operações independentes. Se o acesso REST continuar bloqueado, verificar nas configurações de rede do ambiente o acesso a `api.github.com` e a identidade autorizada no GitHub. Se o token gerenciado não puder abrir PRs, considerar GitHub App instalado apenas no Lorekeeper, com `Contents: read` e `Pull requests: write` para abrir PRs de branches já publicadas e permissões de Actions/Checks em leitura para acompanhamento. Guardar a chave no cofre ou nos secrets do ambiente. Qualquer permissão futura de integração precisa ser avaliada separadamente. Um PR criado com token do App deve passar por ensaio para confirmar que o evento iniciou o CI automaticamente. PRs criados com `GITHUB_TOKEN` podem ter execução suprimida ou exigir aprovação, conforme o evento e a configuração. Evitar esse caminho para este fluxo.

Em falha do CI, guardar o link e identificar o job que falhou. Fazer a correção na mesma branch com SDD/TDD, rodar testes locais e publicar nova revisão para revalidação remota. Uma falha da API indica indisponibilidade da evidência, sem alterar a conclusão dos testes locais.

Cada incremento precisa de uma execução Codex. O repositório ainda não tem integração que dispare tarefas automaticamente após o merge. Uma futura orquestração pode receber o evento de merge confirmado, enfileirar uma única tarefa por novo SHA da `main` e fornecer a tarefa e o SHA como entradas. Essa integração precisa ser verificada em ambiente real antes de ser usada como mecanismo de continuidade.
