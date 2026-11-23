# P1 — Retomar campanha

- **Estado** — implementada, com CI remoto pendente.
- **Objetivo** — recuperar o contexto registrado ao voltar a uma campanha.
- **Rastreabilidade** — Pós-MVP P1 e produto §§4.3, 4.5 e 4.10.

## Comportamento e regras

`GET /api/campaigns/:campaignId/recap` reúne as três sessões ativas mais recentes, por data, atualização e ID. A última sessão recebe um trecho literal inicial de até 240 caracteres. As outras sessões trazem o mesmo tipo de trecho como referência a acontecimentos registrados. Menções Markdown confirmadas e vínculos manuais fornecem NPCs e localidades, sem inferir acontecimentos. Anotações rápidas vinculadas a essas sessões aparecem como pistas registradas. Missões abertas reutilizam a consulta existente. Referências ficam na própria campanha, com limite de dez itens por grupo. A lixeira fica fora das leituras; campanhas arquivadas permitem consulta. A API é somente leitura, sem alterar esquema ou backup.

| ID | Critério | Teste |
| --- | --- | --- |
| P1-01 | A última sessão pode ser aberta no painel. | E2E |
| P1-02 | NPCs, localidades e missões abrem os documentos de origem. | Integração e E2E |
| P1-03 | Campanha sem sessões tem estado vazio e campanha desconhecida retorna 404. | Integração e E2E |
| P1-04 | Edição, lixeira e restauração alteram o resultado da próxima consulta. | Integração |
| P1-05 | Campanhas homônimas mantêm dados separados. | Integração |
| P1-06 | A interface funciona a 320 px, com ações acessíveis. | E2E |
| P1-07 | Uma edição local não altera o trecho até Salvar. | E2E |

Em caso de falha de rede, o painel oferece nova consulta. As pistas estruturadas e seu estado chegam em P2. O trecho literal é identificado como texto registrado da sessão.

## Evidências de TDD

- **Red** — a consulta retornou 404 e o painel não existia no navegador.
- **Green** — a integração confirmou trecho, vínculos, isolamento e lixeira. O E2E navegou por uma campanha a 320 px.
- **Refactor** — consultas ficam em uma transação de leitura; a interface reaproveita missões abertas e confere recuperação de falha de rede.
