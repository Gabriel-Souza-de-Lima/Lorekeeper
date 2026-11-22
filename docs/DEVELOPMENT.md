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

## Publicação com GitHub App

Um [workflow sem checkout, token com escopos ou secrets](../.github/workflows/notify-codex-branch.yml) sinaliza o push de uma branch interna `codex/`. A [reconciliação](../.github/workflows/github-app.yml) roda com código da `main` após o sinal, na conclusão de CI de um PR interno e por agendamento como contingência. O bot redescobre os commits e os PRs pela API. A App usa token temporário restrito ao Lorekeeper com **Contents** e **Pull requests** em escrita. Usa as configurações existentes `LOREKEEPER_APP_CLIENT_ID` e `LOREKEEPER_APP_PRIVATE_KEY`. O token padrão lê Actions, Contents e Pull Requests. O job privilegiado não faz checkout, instala dependências ou executa código do PR.

Use uma branch nova `codex/<nome>` baseada na `main`, com diff revisado e critérios aplicáveis testados. A lista de elegibilidade aceita alterações comuns em `src/web/`, `tests/` e `docs/specs/`, com exclusões para caminhos sensíveis. O bot abre o PR se o conjunto de arquivos for elegível e não houver PR existente para essa branch. Branches com PR fechado ou integrado não são recicladas. Mudanças de servidor, dependências, configuração, CI, autenticação e migrações seguem revisão separada.

### Auto-merge nativo

O administrador mantém o Ruleset da `main` ativo, exigindo PR, `validar` da origem **GitHub Actions** (15368), base atualizada, revalidação estrita e lista de bypass vazia. Confirme **Allow auto-merge** e o método de merge por commit nas configurações do repositório. O bot verifica as regras efetivas públicas para PR e `validar` estrito. GitHub aplica o Ruleset e decide se pode integrar. A App não faz merge direto, não precisa editar o Ruleset e não tenta ler campos administrativos ocultos. Este fluxo usa apenas o check `validar`.

Para um PR recém-aberto pela App, o bot confere autoria, repositório, base, head, diff e candidato sem conflito. Se o CI estiver pendente ou ainda não estiver registrado, relê a base, o PR e a proteção e solicita o auto-merge por GraphQL com o SHA esperado do head. Confirma que o GitHub registrou a App como autora da solicitação. CI reprovado, conclusão já conhecida, inconsistência de referências ou proteção indisponível deixam o PR aberto. Se o GitHub disser que o PR já está integrável, registre que a janela de solicitação passou. Isso não autoriza um merge alternativo.

Mantenha os escritores da branch confiáveis e preserve o diff aprovado após armar o auto-merge. O GitHub pode manter a solicitação quando um escritor envia outro commit. Para corrigir a entrega depois de armar, desarme o auto-merge antes de atualizar a branch. Mudanças fora da política devem usar branch de revisão própria. O Ruleset continua exigindo CI para o candidato corrente.

### Ensaio

A alteração que instala os workflows passa primeiro por PR de infraestrutura com revisão apropriada. Depois que chegar à `main`, publique uma branch inédita `codex/` com um arquivo fictício em `docs/specs/`. Observe a execução de sinalização, a autoria do PR e da solicitação nativa, o CI pendente, a conclusão de `validar`, o merge e o CI na `main`. Registre SHAs e links e avance no roadmap somente após o ensaio real.
