# I3-04 — Missões abertas e personagem em destaque

O destino Missões oferece guias Ativas e Encerradas e usa as mesmas páginas `quest` da Wiki. A visão geral mostra até três ativas e o indicador conta todas. [Apresentação Phandelver V2](40-phandelver-v2.md)


- **Estado** — implementada, com CI remoto pendente.
- **Objetivo** — retomar as pendências e abrir o personagem em destaque pela visão geral.
- **Rastreabilidade** — MVP-02, MVP-09 e seções 4.5 e 4.8 do produto.

| ID | Cenário | Resultado verificável | Teste |
| --- | --- | --- | --- |
| I3-04a | Concluir ou reabrir uma missão | Missões novas e existentes começam abertas. A visão geral só lista as abertas. A página da missão continua na wiki. | API e E2E |
| I3-04b | Destacar ou remover um personagem | Há no máximo um destaque por campanha. A visão geral abre a página do personagem. A API rejeita IDs de outro tipo ou campanha. | API e E2E |
| I3-04c | Consultar campanha arquivada | Missões e destaque continuam consultáveis. Alterações são bloqueadas. | API |
| I3-04d | Migrar V5 | A V6 adiciona campos sem reconstruir tabelas. Verificar integridade, preservação e rollback. | SQLite |

Conclusão de missão é reversível. Destacar outro personagem substitui o anterior. Campanhas começam sem destaque. Os comandos de estado recebem o valor desejado e podem ser repetidos. Alterações de título ou descrição continuam fora desta entrega.

## Evidências de TDD

- **Red** — cinco testes de integração falharam pela ausência dos campos e das rotas. O E2E falhou ao procurar a região de missões abertas.
- **Green** — os cinco testes focados e o cenário de navegador passaram após a implementação.
- **Refactor** — repetir a seleção do mesmo destaque também preserva a data de atualização.

A regressão ajustou os testes das migrações anteriores para comparar as colunas existentes e declarar explicitamente as colunas dos registros de teste. As verificações da V6 cobrem os novos campos.
