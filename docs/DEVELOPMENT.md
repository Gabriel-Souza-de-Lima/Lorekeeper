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
| E2E | Playwright e Chromium. Conforme os fluxos forem implementados, iniciar a aplicação de teste em loopback, criar contextos independentes para dois dispositivos e testar proteção local, gravação explícita, perda de rede, reabertura, sincronização, concorrência e recuperação. Manter o teste de IndexedDB como verificação do navegador. |

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

## Atualizar a interface local após receber mudanças

O Git ignora `dist/`. `npm start` inicia a API e serve os arquivos compilados já presentes nesse diretório. Atualizar o checkout exige recompilar a interface para que o navegador receba o frontend correspondente.

1. Confira `git status --short --branch`, preserve alterações locais e atualize a `main` com `git switch main` e `git pull --ff-only`.
2. Compare `git rev-parse HEAD` e `git rev-parse origin/main` com o commit esperado.
3. Execute `npm run build` na raiz do checkout.
4. Inicie com `npm start`. Se a porta estiver ocupada, identifique a instância antes de reiniciá-la.
5. Atualize a página em `http://127.0.0.1:3000` e confira o JavaScript em `/assets/` na aba **Rede** do navegador. O HTML servido deve apontar para o bundle referenciado no novo `dist/index.html`.
6. Confirme as ações esperadas da versão integrada. Use uma campanha fictícia em um banco separado para testar criação, confirmação, lixeira e recuperação de rascunho.

Na investigação de `136906b`, a porta 3000 já entregava o bundle atualizado quando foi inspecionada. O estado anterior de `dist/` ficou sem confirmação. Se a interface ainda divergir após a compilação, compare a URL, o processo e o JavaScript recebido antes de investigar cache. Preserve os rascunhos no IndexedDB.

Recomendação pendente: adicionar um comando optativo `start:local` que execute `npm run build && npm start`. `npm start` continua adequado para servir um build já preparado.

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

O [sinal de push e de PR](../.github/workflows/notify-codex-branch.yml) roda sem checkout, secrets ou permissões. A [reconciliação privilegiada](../.github/workflows/github-app.yml) roda a partir da `main`, após o sinal, após o CI de um PR interno ou por agendamento. Ela consulta a API para confirmar repositório, estado, autores, referências, diff e proteção. O token temporário da App continua limitado a **Contents** e **Pull requests** em escrita no Lorekeeper. O job privilegiado executa somente código da `main`.

### Autorização e escopo

- `codex/`, `feat/`, `fix/`, `chore/` e `docs/` identificam branches internas elegíveis. O dono do repositório e a App são autorizados. Se necessário, configure `LOREKEEPER_AUTHORIZED_AUTHORS` com logins confiáveis separados por vírgula. Autores desconhecidos, forks e rascunhos ficam fora do fluxo de integração.
- A App pode publicar PR a partir de um sinal de push autorizado para o SHA atual. O agendamento consulta sinais recentes para recuperar notificações perdidas. PRs de um autor autorizado criados por outro caminho também entram na reconciliação. Branches fechadas ou já integradas permanecem fora da publicação automática.
- Código de servidor, frontend, testes, documentação e infraestrutura de aplicação pode ser integrado. As raízes de confiança da automação e do CI, como workflows, scripts do bot, manifestos de dependências e configurações das verificações, ficam em PR de revisão específica. Patches indisponíveis, truncados ou com indícios de credenciais bloqueiam a integração automática. A verificação de segredos usa padrões conhecidos e complementa as proteções do GitHub.
- Mudanças no esquema SQLite exigem testes de integração com casos `test(...)` nomeados com os prefixos `migration-integrity`, `migration-preservation` e `migration-rollback`. Os testes precisam verificar relações, dados existentes e uma falha exercitada; os marcadores ajudam a identificar os casos no diff. SQL potencialmente destrutivo, como exclusão de tabelas ou desligamento de chaves estrangeiras durante uma troca de tabela, exige revisão específica mesmo com testes.

### Auto-merge nativo e recuperação tardia

O Ruleset da `main` exige PR, `validar` de GitHub Actions, atualização da base e ausência de bypass. Para um PR interno elegível sem conflito, a App confere o candidato e solicita auto-merge nativo com o SHA esperado se o CI estiver pendente. O GitHub decide quando as exigências permitem integrar.

Se o GitHub encerrar a janela de solicitação nativa, a conclusão do CI ou o agendamento volta a verificar o PR. A App exige sucesso do workflow oficial e do job `validar`, incluindo a etapa de checkout para o SHA do candidato sintético atual. Só envia a operação de merge normal com o SHA esperado quando o PR estiver limpo, a versão da `main` permanecer atual e as regras forem confirmadas. O GitHub ainda aplica o Ruleset a essa operação. CI ausente após uma falha de consulta, reprovado, cancelado, ignorado ou associado a outro candidato deixa o PR aberto.

Mantenha os escritores confiáveis e revise o diff antes do push. Para alterar uma entrega já armada, desarme primeiro o auto-merge. O GitHub pode mantê-lo armado quando outro escritor autorizado modifica a branch. Registre merge e CI pós-merge antes de etapas dependentes. Um HTTP 403 no Codex Cloud indica limitação de acesso desse ambiente; confira os runs públicos antes de atribuir falha ao bot.

### Ensaio da ampliação

A alteração da própria automação é integrada primeiro por PR de revisão específica com `validar`. Depois, publique numa branch interna inédita uma alteração pequena em `src/server/` com testes. Registre o autor do PR, a identidade da solicitação, os SHAs do head e do candidato, o estado de `validar`, o merge e o CI pós-merge. A validação simulada não substitui esse ensaio.

### Resultado do ensaio real

A branch `codex/ensaio-auto-merge-final` partiu de `bb47c13` e publicou `b58022b`. O [sinal](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/44987317118) passou e o [workflow da App](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/44987327680) abriu o [PR #7](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/7). O GitHub registra abertura, solicitação de auto-merge e merge por `lorekeeper-pr-bot[bot]`.

O pedido foi registrado às 01h58min22s, horário de Brasília, com o CI ainda aguardando. O [job validar](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/44987340745/job/137100699306) aprovou o candidato `22e0403`, e o GitHub integrou o PR às 01h59min31s no commit `dce0d9d`. O [CI pós-merge](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/44987415546) passou na `main`.

## Alterações de frontend

No SDD e no TDD existentes, relacione mudanças de frontend aos critérios funcionais e aos requisitos de UX/UI aprovados que se aplicam à entrega. Use os padrões de interação e o Design System aprovados, confira acessibilidade e responsividade e inclua evidências de regressão funcional, avaliação visual e avaliação humana conforme o risco e o critério.

A [proposta revisada de UX/UI](ux-ui/README.md) orienta a avaliação. Critérios ainda em proposta podem embasar a discussão. Sua adoção como critérios de aceite depende da aprovação do mantenedor.
