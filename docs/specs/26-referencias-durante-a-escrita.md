# P3 — Referências durante a escrita

- **Objetivo** — localizar, criar e mencionar páginas da wiki sem sair do editor.
- **Dependências** — salvamento manual, wiki por campanha e referências por UUID.
- **Escopo** — editor de sessões editáveis. Nenhuma migração.

Ao digitar `[[` no texto, o editor oferece busca contextual. Uma referência aberta sem fechar, ou com `]]` antes ou após o cursor, pode ser resolvida por seleção explícita. Texto fora do intervalo permanece intacto, inclusive se houver conteúdo após a referência. Seleções que não fazem parte da referência não são substituídas. Cancelar mantém o texto original. Esc cancela o seletor e devolve o foco ao editor.

A busca local usa o catálogo da campanha, obtido sob demanda pelo endpoint existente. Acentos e caixa não impedem a localização. Resultados exibem categoria. Homônimos exibem também um identificador para evitar seleção ambígua. Nenhum resultado é confirmado automaticamente. Uma referência incompleta abandona a busca ao mudar de linha.

A criação exige ação explícita, título e categoria. Usa `POST /api/campaigns/:campaignId/wiki` com UUID estável durante reenvio e corpo vazio. Em falha, mantém o texto e permite tentar novamente. Se a página for criada e o intervalo de texto tiver mudado, conserva o texto atual e não substitui o intervalo antigo. A nova página é persistida imediatamente. A sessão continua como rascunho até o usuário clicar em Salvar. Um título com caracteres de Markdown é escapado pelo mecanismo existente.

| ID | Critério | Teste |
| --- | --- | --- |
| P3-01 | Abrir busca ao digitar `[[`. | E2E |
| P3-02 | Inserir link por UUID. | E2E |
| P3-03 | Criar página sem perder texto existente. | E2E |
| P3-04 | Navegar ao destino após renomear. | E2E |
| P3-05 | Exigir decisão explícita para homônimos. | E2E |
| P3-06 | Nunca criar por digitação ou cancelamento. | E2E |
| P3-07 | Preservar texto e foco ao cancelar. | E2E |
| P3-08 | Respeitar o salvamento manual e FTS do conteúdo salvo. | E2E |
| P3-09 | Coexistir com links Markdown atuais. | E2E existente e novo |
| P3-10 | Filtrar em memória sem requisição a cada tecla. | E2E com contagem de requisições |


## Evidências de TDD

- **Red** — o teste não encontrava a busca após `[[`. Um segundo cenário falhou ao concluir `[[Nome]]` com o cursor no fim.
- **Green** — o E2E criou e vinculou uma página sem perder o texto, repetiu o UUID após perda da resposta, manteve a sessão fora do servidor até Salvar e navegou após renomear o destino.
- **Refactor** — a busca normaliza o catálogo uma vez por atualização e filtra em memória. O fluxo reaproveita a serialização de vínculos e o rascunho existentes.

O catálogo é carregado ao usar a referência pela primeira vez na sessão do editor. Alterações feitas em outro dispositivo aparecem ao reabrir o editor. Referências que ficarem como texto literal não entram no índice como vínculos.
