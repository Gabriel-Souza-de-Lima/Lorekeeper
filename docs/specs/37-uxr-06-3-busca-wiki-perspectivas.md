# UXR-06.3 — Busca, wiki e perspectivas

O mantenedor aprovou a UXR-06.2. Base `18a964a`, PR #77 com CI pós-merge aprovado. [Design System Codex](../ux-ui/design-system-codex.md) · [Achado A1](../ux-ui/auditoria/uxr-03.md) · [P10-B](34-perspectivas-e-conhecimento.md)

| ID | Critério | Evidência |
| --- | --- | --- |
| UX63-01 | Ao voltar diretamente de sessão, wiki ou anotação aberta na busca, preservar texto e filtros em memória e consultar de novo a pesquisa submetida. Restaurar foco pela identidade campanha/tipo/ID mesmo se mudar o título. Se o resultado sumir, anunciar e focar o título da lista. Uma abertura recusada informa o problema e atualiza a lista. | Playwright com alteração, remoção e erro de abertura. G01, G03, G05, G11, F10, A1. |
| UX63-02 | Wiki e Personagens mostram campanha, tipo, título e conteúdo em hierarquia de leitura. Anexos, tags, backlinks e edição continuam acessíveis. O registro global permanece a entrada de Informações e a consulta é acionada explicitamente. | Inspeção e E2E de wiki, vínculos e P10. G01, G06, G12, F08, F15 e F16. |
| UX63-03 | Ao consultar outro sujeito ou sair do módulo, não exibir resposta de solicitação anterior sob o novo contexto. Distinguir carregamento, vazio, erro e resultado. Preservar proveniência, evidências, concorrência, rascunhos e histórico. | Playwright com duas respostas em ordem inversa e regressão. G03, G11, G13, G14, F15 e F16. |

Escopo de retorno interno na mesma aba. URL persistente, recarga e trilha entre documentos encadeados ficam fora do recorte. O retorno do editor usa a proteção de saída existente. O índice e os contratos do servidor permanecem os mesmos.

## Evidências de execução

- **Red.** O teste de busca falhou ao procurar Voltar à busca no editor. O cenário da consulta atrasada também falhou no estado inicial porque faltava explicitar Registro global. As proteções contra resposta atrasada já presentes foram preservadas e ampliadas.
- **Green.** O resultado renomeado recupera foco pelo mesmo identificador. Para uma abertura temporariamente indisponível, a consulta é refeita e o título dos resultados recebe foco com aviso. Quando o item saiu da busca, a lista é atualizada e o título recebe foco. Um personagem aberto pela busca mostra a campanha e o tipo, e o retorno restaura o foco no resultado. Em P10-B, o teste retém deliberadamente uma resposta, muda de sujeito e depois de campanha, e verifica a apresentação com personagens de mesmo nome.
- **Refactor.** A busca mantém o formulário em memória durante a visita direta. A atualização usa os mesmos parâmetros submetidos, preservando inclusive os filtros. A identidade da consulta de perspectiva inclui campanha, sujeito e tentativa. O ciclo do efeito ignora resultados das requisições já substituídas. A leitura da wiki usa hierarquia de contexto e largura de leitura, com foco no título ao abrir e retorno ao item quando ainda presente.
- **Limites.** Resultado indisponível pode voltar a aparecer após reconsulta se ainda corresponder ao índice. O aviso permanece visível e permite tentar novamente. Navegação, texto e filtros ficam na mesma aba. Validação em Windows, leitor de tela e toque em dispositivo real permanece pendente. Capturas da aplicação real com SQLite em memória e dados fictícios acompanham a entrega fora do Git.

A UXR-06.4 depende de autorização posterior. A P11 permanece reservada para depois do ciclo de UX/UI.

**Validação local.** Lint, análise de tipos e build passaram. Foram aprovadas 20 execuções focais em duas repetições, além de quatro repetições do teste de corrida com checagem após a resposta completa. A regressão completa passou com 5 testes unitários, 83 de integração e 49 E2E com dois workers. O build manteve o aviso de tamanho do bundle ao passar do limiar de 500 kB.
