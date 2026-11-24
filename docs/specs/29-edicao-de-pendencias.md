# P6 — Edição de pendências

- **Estado** — implementada.
- **Objetivo** — corrigir os dados de uma pendência com confirmação explícita.
- **Rastreabilidade** — produto §4.10, MVP-12 e [P2](25-pendencias.md).

## Comportamento e regras

O formulário é iniciado com os campos confirmados. Cancelar restaura a visualização, e erros de rede mantêm o formulário aberto. Em conflito, a versão confirmada aparece para comparação sem substituir o texto digitado. Para reenviar, o usuário precisa reconhecer a nova base e confirmar de novo.

`PUT /api/campaigns/:campaignId/pending-items/:id` recebe os sete campos editáveis e `editVersion`. Alterações de estado usam o contrato atual. Alterações de campos incrementam apenas `editVersion`. Uma repetição que coincide com os campos já confirmados devolve a versão atual. Um conflito devolve 409. A validação e gravação são atômicas.

V12 acrescenta a versão dos campos com valor inicial 1 e marcações de remoção para vínculos de entidades. A edição pode preservar uma sessão na lixeira ou trocar para uma sessão ativa da mesma campanha. O ZIP exporta os vínculos ativos e a versão dos campos. O backup inclui as marcações de remoção.

## Cenários

| Cenário | Quando | Então |
| --- | --- | --- |
| Confirmação | O usuário altera o formulário e salva | O painel e as consultas mostram os campos confirmados |
| Cancelamento | O usuário cancela | A versão confirmada permanece |
| Conflito | Outro dispositivo grava campos diferentes | O formulário permanece editável para comparação |
| Isolamento | O destino pertence a outra campanha | A operação falha sem gravar parte dos campos |

## Critérios de aceitação e testes

| ID | Critério | Teste |
| --- | --- | --- |
| P6-01 | Editar todos os campos existentes. | SQLite e E2E |
| P6-02 | Gravar exclusivamente por confirmação. | E2E |
| P6-03 | Cancelar sem gravar. | E2E |
| P6-04 | Rejeitar vínculos entre campanhas. | SQLite |
| P6-05 | Preservar o histórico de estados. | SQLite |
| P6-06 | Detectar conflito e preservar o formulário. | SQLite e E2E |
| P6-07 | Mostrar a edição na retomada e nas consultas. | SQLite e E2E |
| P6-08 | Preservar a edição no ZIP e após restaurar e reabrir. | SQLite |

## Dependências, limitações e decisões pendentes

P2 fornece a consulta. O rascunho de edição fica na tela em caso de conflito ou erro de rede. O MVP histórico permanece como referência.


## Evidências de TDD

- **Red** — a edição retornou 404, a versão V12 ainda não existia e o teste de navegador não encontrou a ação de editar.
- **Green** — a edição confirmou os campos, rejeitou vínculos externos e conflitos sem gravar, preservou estados e recuperou os campos do backup restaurado.
- **Refactor** — cadastro e edição usam o mesmo conjunto de campos e a apresentação de pendências usa os vínculos ativos. A consulta de estado permanece separada.
