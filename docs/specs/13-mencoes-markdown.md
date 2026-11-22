# I3-06 — Menções em Markdown

- **Estado** — implementada, com revisão de integração pendente.
- **Objetivo** — abrir uma página da wiki a partir de uma menção no texto da sessão.
- **Rastreabilidade** — MVP-10 e seção 4.6 do produto.

O editor insere um link Markdown com rótulo do trecho selecionado, ou com o título da página quando não há seleção. O destino é a referência interna `#wiki-UUID`. A prévia abre a página no contexto da campanha. O servidor extrai links Markdown verdadeiros, incluindo referências definidas no texto, e ignora imagens, código e páginas de outras campanhas. O texto original é preservado.

| ID | Resultado verificável | Teste |
| --- | --- | --- |
| I3-06a | Uma gravação atualiza texto, revisão e backlinks de forma atômica. Alterar, restaurar ou reenviar a mesma gravação mantém os backlinks coerentes. | Integração |
| I3-06b | Destinos inválidos, externos ou de outra campanha não geram relação. Remover a menção preserva vínculos manuais com o mesmo destino. | Integração |
| I3-06c | Inserir uma menção pelo seletor, salvar, abrir pela prévia e retornar pelo backlink. | E2E |

A sintaxe `[[Nome]]` fica para uma etapa posterior. A seleção resolve páginas pelo UUID, mesmo quando existem títulos iguais.

## Evidências de TDD

- **Red** — o teste de integração gravou o texto sem encontrar backlinks. O E2E falhou ao procurar a ação de inserir no Markdown.
- **Green** — passaram a gravação revisada, a navegação pela prévia e o retorno pelo backlink.
- **Refactor** — a sincronização passou a remover somente relações obsoletas. Um gatilho SQLite simula falha no vínculo e verifica a reversão do texto, da versão e das relações.

O servidor usa as versões de `remark-parse` e `unified` já fixadas no lockfile, agora declaradas como dependências diretas.
