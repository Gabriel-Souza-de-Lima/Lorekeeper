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

## Integração autônoma no repositório público

O Incremento 1 entrou na `main` no commit `a737343`. O [run do push pós-merge](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/44943221429) mostrou sucesso para o workflow `CI`, com o job `validar`. A [página pública de Rulesets](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/rules) exibiu uma lista vazia na verificação de 21 de novembro de 2026. A proteção clássica, as permissões de bypass e a configuração de auto-merge ainda precisam de verificação administrativa. A API do Codex Cloud retornou HTTP 403.

### Configuração administrativa

1. Em **Settings → Rules → Rulesets**, crie um **New branch ruleset**, com **Enforcement status: Active** e destino da regra `main`. Deixe **Bypass list** vazia para que as identidades usadas pelo fluxo também fiquem sujeitas à proteção.
2. Marque **Require a pull request before merging**. Para PRs comuns, use zero aprovações obrigatórias. Reserve revisão específica para autenticação, exposição, CI, permissões e migrações potencialmente destrutivas.
3. Marque **Require status checks to pass** e selecione **validar**, do GitHub Actions, conforme o job observado no run publicado. Marque **Require branches to be up to date before merging**. Confirme que uma atualização da base invalida aprovação anterior até nova execução.
4. Em **Settings → General → Pull Requests**, habilite **Allow auto-merge**. Confirme o Ruleset publicado e a disponibilidade do auto-merge num PR de teste. O fluxo só pode armar auto-merge após verificar que o candidato atual obteve `success` explícito em todos os checks obrigatórios. Checks pendentes, ignorados, neutros, cancelados, obsoletos ou indisponíveis mantêm o merge suspenso. Uma checagem de status exigida pelo GitHub pode aceitar estados além de `success` e por isso a proteção isolada precisa ser verificada com esses cenários antes do uso autônomo.

### Fluxo de entrega

Parta da última `main` integrada e validada. Use o [roadmap](ROADMAP.md) para selecionar um incremento e registre critérios e casos em `docs/specs/`. Rode lint, análise de tipos, build e as três suítes após concluir Red → Green → Refactor. Faça push de uma branch própria e abra PR para `main` com a especificação, evidências e resultados. Em caso de falha remota, use os logs para corrigir a mesma branch e exija nova execução. Um HTTP 403 ou 404 pode impedir a consulta sem dizer nada sobre o resultado do CI.

Com as proteções verificadas e acesso de escrita autenticado à API, solicite auto-merge nativo no PR elegível. Confira no GitHub o SHA que entrou e a execução pós-merge antes de prosseguir para o próximo incremento. Em caso de API indisponível, publique a branch e forneça o link de comparação. Para restabelecer a automação, configure acesso a `api.github.com` no Codex Cloud e uma identidade autorizada a criar PRs e armar auto-merge sob o Ruleset, por exemplo um GitHub App restrito ao Lorekeeper. Armazene sua credencial apenas em um cofre ou na configuração segura do ambiente. Verifique em um PR de teste que a identidade dispara o CI sem intervenção humana.

O repositório público hospeda o código. A implantação da aplicação continua privada e seus dados ficam fora do repositório. Cada entrega dependente aguarda a anterior na `main`. Novas tarefas ainda dependem de uma nova execução Codex na ausência de um orquestrador que confirme merges e enfileire trabalho por SHA.
