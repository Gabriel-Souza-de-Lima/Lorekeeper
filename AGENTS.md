
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
