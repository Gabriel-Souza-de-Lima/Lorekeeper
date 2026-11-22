# I3-03 — Cadastro básico da wiki

- **Estado** — implementada, com revisão de integração pendente.
- **Objetivo** — registrar e consultar páginas da própria campanha.
- **Rastreabilidade** — MVP-09 e seção 4.5 do produto.

## Comportamento e regras

Cada página usa a tabela de documentos, UUID estável, tipo (personagem, NPC, localidade ou missão), título obrigatório e descrição livre em Markdown. Títulos iguais são permitidos. O cliente conserva o UUID e os campos ao repetir um envio após falha; repetir os mesmos dados devolve a página existente. Uma campanha arquivada permite leitura. O cadastro fica restrito a campanhas não arquivadas, independentemente do estado narrativo.

| ID | Quando | Então | Teste |
| --- | --- | --- | --- |
| I3-03a | Criar e reler páginas dos quatro tipos | A página mantém tipo, título, texto e UUID após reabrir o banco. Reenvio idêntico não duplica. | Integração |
| I3-03b | Consultar outra campanha ou modificar uma arquivada | A API isola os resultados, rejeita entradas inválidas e bloqueia criação em campanha arquivada. | Integração |
| I3-03c | Atualizar um banco V4 | Os documentos, relações e revisões existentes permanecem íntegros. Uma falha desfaz a troca da tabela. | Integração SQLite |
| I3-03d | Abrir a wiki, cadastrar e consultar uma página | O fluxo funciona no navegador dentro da campanha, inclusive reenvio após perda da resposta e consulta após arquivar. | E2E |

## Dependências e limitações

A ampliação da restrição de tipos do SQLite exige reconstruir a tabela de documentos em transação. A mudança requer revisão específica pela política de integração. Edição de páginas, estados de missões, personagem em destaque, tags e vínculos da wiki ficam para entregas seguintes.

## Evidências de TDD

- **Red** — os quatro testes de integração falharam pela ausência da API ou da ampliação da restrição de tipos. O E2E parou ao procurar o botão da wiki.
- **Green** — a API e a migração passaram nos quatro testes focados, e o Chromium completou o cadastro e a consulta após arquivar.
- **Refactor** — os tipos aceitos pela migração foram fixados no SQL da V5, preservando o comportamento histórico da migração. A regressão do navegador também simula perda de resposta após a gravação e comprova que o reenvio gera uma única página.
