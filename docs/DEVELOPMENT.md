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

## Ensaio do check obrigatório

Em um PR apenas de documentação, acompanhe o job `validar` para o SHA atual. Enquanto estiver pendente, o GitHub deve bloquear a integração. Depois de `success`, com a branch atualizada e os demais requisitos satisfeitos, o PR deve ficar elegível sem aprovação humana obrigatória. Registre o link da execução e o estado do botão de merge nas duas fases.

## Publicação com GitHub App

O [workflow privilegiado](../.github/workflows/github-app.yml) roda na `main` após o sinal de publicação de uma branch interna `codex/`, após a conclusão de CI de PR e por agendamento como contingência. O sinal de push roda sem permissões, sem checkout, sem artefatos e sem secrets. O fluxo privilegiado valida o tipo de evento, repositório e caminho do workflow que enviou o sinal e redescobre os commits e PRs pela API. Ele usa a versão da branch padrão, ações fixadas por SHA e um token temporário do Lorekeeper PR Bot limitado ao repositório, com Contents, Pull requests e Checks em escrita. O token da App não tem permissão para editar o Ruleset. A variável é `LOREKEEPER_APP_CLIENT_ID` e o secret é `LOREKEEPER_APP_PRIVATE_KEY`. O `GITHUB_TOKEN` do workflow é somente leitura. O job privilegiado não executa testes, nem faz checkout ou instala dependências do PR. Mantenha o acesso de escrita ao repositório restrito a identidades confiáveis. Os secrets de repositório dependem dessa fronteira.

A App abre PR para a `main` quando encontra uma nova branch interna `codex/<nome>` atualizada e permitida. O token da App permite que a abertura publique o evento normal de PR. Branches que já tiveram PR fechado não são reutilizadas. A lista conservadora aceita alterações comuns em `src/web/`, `tests/` e `docs/specs/`, sujeitas às exclusões da política. Mudanças de servidor, dependências, configuração, CI, autenticação e migrações seguem revisão específica. Se a `main` avançar, atualize a branch com Git, repita as validações e publique novamente. A automação não resolve conflitos e não reescreve branches.

O workflow consulta `GET /rules/branches/main` com o `GITHUB_TOKEN` e `GET /rulesets/{id}` com um verificador separado. O GitHub documenta que a segunda resposta omite `bypass_actors` quando a identidade não pode editar o Ruleset. Campo ausente ou oculto, lista não vazia ou origem divergente de check bloqueiam a admissão. A configuração de auto-merge e do método de merge é lida com o token da App (Contents em escrita). [Contrato da API de Rulesets](https://docs.github.com/en/rest/repos/rules#get-a-repository-ruleset)

O Ruleset exige `validar` da integração GitHub Actions (15368) e `integracao-lorekeeper` do ID numérico da App. O segundo check mantém o PR bloqueado mesmo após o CI. A App confirma a execução oficial mais recente e o passo de checkout de `validar` para a combinação exata de base e head, relê o PR e a proteção, solicita auto-merge nativo e confirma a solicitação pela API. Depois de reler o candidato, os pais, a proteção e a tentativa de CI, publica o check de admissão no SHA testado. Uma recusa GraphQL é registrada por motivo, sem despejar respostas ou credenciais. O bot nunca chama o endpoint de merge direto. Em PRs internos fora da política de auto-merge a App pode confirmar o mesmo check após o CI exato, deixando a integração ao mantenedor. PRs externos ficam fora desse fluxo.

### Ativação da admissão obrigatória

1. Integre primeiro a atualização da infraestrutura pelo PR protegido pelo `validar` atual. Exigir o novo check antes de o código chegar à `main` bloquearia o próprio PR de instalação.
2. Na configuração da GitHub App, em **Permissions & events → Repository permissions**, conceda **Checks: Read and write** e aceite a atualização na instalação do Lorekeeper. Em **Settings → Secrets and variables → Actions → Variables**, cadastre `LOREKEEPER_APP_ID` com o **App ID** numérico da App, distinto do Client ID.
3. Em **Settings → Environments**, configure `lorekeeper-ruleset-verification` para aceitar somente deployments da branch `main`. Adicione o secret de ambiente `LOREKEEPER_RULESET_VERIFIER_TOKEN` com um token fine-grained do mantenedor, restrito ao Lorekeeper e com permissão de edição de Rulesets (**Administration: Read and write**), com validade curta. O script usa essa credencial exclusivamente em GET de Rulesets, separada do token que publica PRs e checks. A API só revela a lista de bypass a quem pode editar a regra. Preserve a lista vazia e não conceda Administração à App de merge.
4. No Ruleset ativo da `main`, mantenha `validar` associado a **GitHub Actions** e acrescente `integracao-lorekeeper` associado ao **Lorekeeper PR Bot**. Mantenha revalidação estrita e ausência de bypass. Se o seletor não oferecer o novo check, um administrador pode adicionar ao Ruleset pela API a entrada `{"context":"integracao-lorekeeper","integration_id":APP_ID}`, preservando a entrada de `validar` e as demais regras.

O primeiro PR que instala ou altera o workflow privilegiado requer integração manual após o CI e revisão das permissões. Depois da integração da infraestrutura e da configuração acima, publique uma branch nova, como `codex/ensaio-integracao`, com uma alteração fictícia em `docs/specs/`. Observe no GitHub a abertura do PR pelo bot, a execução inicialmente pendente do CI, o sucesso de `validar` para o candidato e o estado real do PR após a solicitação de auto-merge. Registre o SHA, os links e os resultados. O agendamento pode atrasar. A validação remota de ponta a ponta ainda é necessária antes de usar o mecanismo para os próximos incrementos.
