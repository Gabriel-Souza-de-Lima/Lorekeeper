# I1-C — Gerenciamento de campanhas

- **Estado** — pronta para implementar.
- **Objetivo** — abrir o Lorekeeper, criar uma campanha com poucos campos e reencontrar suas sessões.
- **Rastreabilidade** — MVP-01 (interface e navegação), MVP-02, Produto §§4.1–4.2 e 6.

## Comportamento e regras

O dashboard responsivo em português brasileiro usa tema escuro. Mostra nome, sistema quando preenchido, estado narrativo, quantidade de sessões e última data registrada. Somente o nome, com conteúdo após remover espaços nas extremidades, é obrigatório. Descrição, mestre, sistema, versão das regras e observações são opcionais. A campanha começa ativa. O estado narrativo pode ser ativo, pausado ou encerrado.

Arquivamento é reversível e independente do estado narrativo. Campanhas arquivadas aparecem em uma visão própria, permitem consulta das sessões e podem ser reativadas. Alterações e novas sessões exigem reativação. O arquivamento mantém dados e contagens. Campanhas podem ter nomes iguais e são identificadas por UUID.

| ID | Cenário e critério verificável | Teste |
| --- | --- | --- |
| C01 | Criar com nome, abrir pelo dashboard, editar metadados e recusar nome composto apenas de espaços. | Integração e E2E de campanhas |
| C02 | Arquivar, consultar o histórico, reativar e verificar que o estado narrativo e as sessões foram preservados. | Integração e E2E de campanhas |
| C03 | Exibir a contagem e a data da última sessão da própria campanha. Reabrir os dados após reiniciar com o mesmo banco. | Integração e E2E de sessões |

## Dependências e limites

SQLite persistente. Acesso de desenvolvimento em loopback com dados fictícios. Personagem em destaque, missões abertas, acesso privado entre dispositivos e imagens dependem de incrementos posteriores.
