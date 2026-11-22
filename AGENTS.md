
# Lorekeeper - Instruções para o Codex

## Contexto
Lorekeeper é uma aplicação web pessoal para organizar anotações e conhecimentos de campanhas de RPG.

O sistema será utilizado por um único usuário, em diferentes computadores. Não haverá distribuição comercial, colaboração ou cadastro público.

## Documentação
Antes de tomar decisões sobre arquitetura ou implementar funcionalidades, consulte:

- `docs/PRODUCT.md`: requisitos completos do produto.
- `docs/MVP.md`: escopo e critérios de aceitação do MVP, quando disponível.
- `docs/ARCHITECTURE.md`: decisões técnicas já estabelecidas, quando disponível.

A especificação do produto é a principal referência para o escopo funcional.

## Prioridades
1. Anotações rápidas durante as sessões.
2. Preservação e segurança dos dados.
3. Sincronização entre dispositivos.
4. Busca eficiente.
5. Organização de múltiplas campanhas.
6. Relacionamentos entre informações.

## Diretrizes de desenvolvimento
- Priorize soluções simples, gratuitas e fáceis de manter.
- Evite complexidade prematura.
- Não implemente funcionalidades comerciais ou multiusuário.
- Não transforme o projeto em um VTT.
- Mantenha o código modular e organizado.
- Desenvolva em incrementos pequenos e verificáveis.
- Adicione testes para funcionalidades críticas.
- Não altere requisitos ou decisões técnicas estabelecidas sem justificar.
- Não descarte dados existentes em migrações.
- Preserve as anotações durante falhas de conexão ou salvamento.
- Mantenha a interface em português brasileiro.

## Fluxo de trabalho
Antes de implementar uma funcionalidade grande, apresente um plano.

Para cada entrega:
- Descreva as alterações realizadas.
- Execute os testes aplicáveis.
- Informe limitações e pendências.
- Mantenha a documentação técnica atualizada.

Não tente implementar todas as funcionalidades do produto simultaneamente.

## SDD, TDD e CI

- Antes de implementar, consulte ou escreva a especificação em `docs/specs/`, use o modelo dessa pasta e vincule seus critérios aos IDs em `docs/MVP.md`. Apresente ambiguidades que alterem regras de negócio para decisão antes de implementar o comportamento afetado.
- Para cada comportamento testável, siga Red → Green → Refactor. Escreva o teste antes do código de produção, confirme a falha pela razão esperada, faça a mudança mínima e rode os testes após refatorar.
- Use somente dados fictícios. Teste persistência, migrações, recuperação e integridade com SQLite real. Preserve o banco de desenvolvimento e os dados pessoais.
- Rode os comandos aplicáveis em `docs/DEVELOPMENT.md` e registre o vínculo entre critérios, testes e resultados. Informe contagens, falhas e motivos de verificações não executadas.
- Considere a funcionalidade concluída após cumprir os critérios da especificação, obter aprovação nas verificações aplicáveis e atualizar a documentação. A integração depende do check `validar` do CI.
- Se a consulta ao GitHub estiver indisponível, registre o bloqueio e continue o trabalho independente autorizado. Aguarde a confirmação do merge e do CI na `main` para avançar nas etapas que dependem da entrega.

## Integração com a GitHub App

- Para uma entrega comum e verificável, use uma branch `codex/<nome>` somente quando o diff estiver revisado, os testes locais passarem e a branch estiver atualizada com a `main`. O prefixo autoriza a App a criar o PR. Mantenha especificação, testes e evidências na entrega.
- Separe mudanças em `AGENTS.md`, CI, autenticação, infraestrutura, configuração, dependências e migrações em PRs de revisão específica. Inclua essas mudanças em uma funcionalidade comum somente se ela depender delas e sinalize a revisão no PR. Nunca exponha chaves, dados de produção ou material privado.
- Deixe a App abrir e integrar PRs elegíveis. Acompanhe o `validar` e o merge pelo GitHub. Reserve à App as operações de merge e auto-merge dos PRs elegíveis. Um HTTP 403 do Codex Cloud indica acesso indisponível por esse caminho. Consulte evidências públicas da App e do Actions e só repita uma operação bloqueada se o acesso mudar.
- A App solicita auto-merge nativo para um PR que ela abriu enquanto `validar` ainda está pendente. Mantenha o Ruleset ativo, sem bypass e com revalidação estrita. O GitHub só integra após as exigências da branch. Confirme o merge e o CI na `main` antes de avançar para uma etapa dependente. Veja o [guia de desenvolvimento](docs/DEVELOPMENT.md#publicação-com-github-app).
- Uma branch `codex/` publicada é uma entrega revisada. Se o diff passar a conter mudanças críticas ou fora da lista, abra uma branch de revisão separada. GitHub pode manter o auto-merge armado após o push de uma identidade com escrita. Para corrigir uma entrega já armada, desarme o auto-merge antes de atualizar a branch.
