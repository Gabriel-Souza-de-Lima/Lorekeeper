# P5 — Anexos de campanha

Na visão geral, os anexos ficam em seção expansível. O formulário abre por Adicionar anexo. Nomes e metadados têm largura própria, e as ações podem quebrar sem comprimir o nome. Guarda de navegação e reenvio preservam o mesmo arquivo e identificador. [Apresentação Phandelver V2](40-phandelver-v2.md)


**Estado.** Aprovado na validação local do Windows e na regressão de abertura da sessão.

## Armazenamento e ciclo de vida

A migração aditiva V11 usa BLOBs SQLite com limite de 10 MiB por arquivo e 50 MiB no acervo. Metadados, bytes e associações participam da mesma transação. Não construir caminhos de armazenamento a partir de nomes e não dar acesso a arquivos locais arbitrários. A aplicação mantém nome de exibição, origem, MIME validado, tamanho, SHA-256 e data. Associações usam IDs estáveis e só podem apontar a campanha, sessão ou página da wiki da mesma campanha. Uma associação pode ser removida com confirmação. Quando a última associação for removida, conservar os bytes para recuperação até existir uma regra específica de descarte. O limite de acervo inclui esses bytes.

## Upload e leitura

Limitar o corpo antes de persistir. Aceitar apenas PNG e PDF após verificar extensão e estrutura real. Imagens permitidas têm prévia no navegador. PDFs são entregues como download com `Content-Disposition: attachment`. Proibir HTML e SVG, enviar `X-Content-Type-Options: nosniff` e manter conteúdo fora de qualquer diretório estático. Validar também nomes reservados e caracteres de controle no nome de exibição e codificar o nome nos cabeçalhos. PNG tem limite de 16 milhões de pixels e precisa ter cabeçalho, dados de imagem, fechamento e CRCs válidos. O PDF passa pela validação da versão, do final e do marcador apontado por `startxref`. A aplicação só disponibiliza o PDF por download.

## Contratos

- `GET /api/campaigns/:campaignId/attachments?documentId=...` lista os metadados vinculados diretamente ao alvo. A ausência de documento indica a própria campanha. `?available=true` lista o catálogo da campanha, incluindo arquivos retidos para reassociação.
- `POST` no mesmo caminho recebe UUID, nome, origem e bytes em Base64. O corpo JSON tem limite próprio, suficiente para codificar um arquivo de 10 MiB. O servidor determina o MIME pelos bytes e confere a extensão. Repetir o mesmo UUID com os mesmos bytes e metadados recupera a associação existente.
- `GET /api/campaigns/:campaignId/attachments/:id/content` lê os bytes pelo UUID mediante associação a alvo consultável, com cabeçalhos específicos de imagem ou download.
- `PATCH /api/campaigns/:campaignId/attachments/:id` muda o nome de exibição. `PUT` e `DELETE` no subcaminho `/association` associam e removem o vínculo do alvo informado.

## Exportação e recuperação

O SQLite mantém bytes e metadados juntos no backup consistente. O ZIP portátil usa caminhos gerados a partir do UUID, registra tamanho e hash e mantém as associações. O ZIP inclui arquivos com associação consultável e usa armazenamento sem compressão para os binários. A exportação continua em memória. No ensaio local, um banco em disco com 50 MiB em cinco arquivos de teste exportou um ZIP de 50 MiB em 281 ms via HTTP. O pico do processo durante a medição, incluindo os uploads, foi de 392 MiB. A sexta gravação recebeu 413. A medição cobre a configuração do ensaio e varia com o volume de documentos e a memória do host.

O backup SQLite mantém associações removidas e anexos sem vínculos. O ensaio de restauração usa outro arquivo de banco, confirma a integridade SQLite e compara os bytes recuperados. As rotinas do backup atual continuam a copiar o mesmo banco.

## Critérios

| ID | Critério | Teste |
| --- | --- | --- |
| P5-01 | Anexar PNG ou PDF à campanha ou a um documento. | E2E e API |
| P5-02 | Recuperar bytes depois de reabrir o banco. | API com cópia restaurada |
| P5-03 | Associar o mesmo UUID a mais de um alvo da campanha. | API |
| P5-04 | Ler apenas bytes de um anexo vinculado na campanha solicitada. | API |
| P5-05 | Conferir tamanho, formato e extensão. | API e ensaio no limite |
| P5-06 | Rejeitar nomes que possam ser interpretados como caminhos. | API |
| P5-07 | Exibir PNG e entregar PDF apenas em download. | E2E e API |
| P5-08 | Reverter bytes e vínculo se a operação falhar. | SQLite real |
| P5-09 | Exportar bytes, metadados e vínculos recuperáveis. | Integração de ZIP |
| P5-10 | Restaurar backup com anexos em outro banco. | Integração SQLite |
| P5-11 | Remover só o vínculo solicitado e conservar os bytes. | E2E e API |
| P5-12 | Confinar as operações ao SQLite gerenciado. | API com nomes inválidos e isolamento |

## Evidências de TDD

- **Red** — a API retornou 404, os testes de migração falharam sem as tabelas e o navegador não encontrou a seção de anexos.
- **Green** — a API aceita PNG e PDF, rejeita extensão incompatível e vínculos de outra campanha, preserva o anexo após renomear ou desvincular, devolve PDF para download e reverte a gravação quando o vínculo falha. O ZIP e a restauração recuperam os bytes. O navegador mostra a imagem e exige confirmação antes de remover o vínculo.
- **Refactor** — a consulta de vínculos ativos é compartilhada pela leitura de bytes e pela exportação. Campanha, sessão e wiki usam o mesmo componente de anexos.

## Limitações

A primeira versão aceita PNG e PDF. A remoção de vínculo conserva os bytes no acervo e conta para o limite de 50 MiB. A remoção definitiva e a importação de ZIP permanecem fora desta etapa.

## Validação local no Windows

Revisão `523a5f8`. [PR #53](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/pull/53) · [CI pós-merge aprovado](https://github.com/Gabriel-Souza-de-Lima/Lorekeeper/actions/runs/45246088986)

**P5-01 a P5-12 exercitados.** Na instância isolada, o Chromium enviou e exibiu o PNG da campanha, renomeou-o e baixou o PDF anexado à sessão. O mesmo PNG permaneceu associado à campanha após desvinculação da sessão e pôde ser reassociado. A consulta de bytes pela outra campanha retornou 404. Após reiniciar o servidor, os dois arquivos continuaram acessíveis. O ZIP continha os binários, hashes e associações correspondentes.

A CLI executou `backup` e `restore` sobre arquivos SQLite fictícios distintos. No restaurado, `integrity_check` retornou `ok` e `foreign_key_check` ficou vazio. A API da instância restaurada devolveu PNG e PDF com SHA-256 idêntico ao dos originais e os vínculos esperados. A integração também exercitou rollback entre a gravação dos bytes e a criação do vínculo.

Em outro SQLite temporário, a API rejeitou conteúdo inválido, extensão incompatível e nome com caminho (400). Rejeitou arquivo acima de 10 MiB (413), aceitou cinco PDFs fictícios de 10 MiB e rejeitou um arquivo adicional (413), mantendo cinco registros e 50 MiB.

**Ressalva de navegação.** Em tentativas que iniciaram o upload logo após abrir a sessão, o ensaio não observou o POST do PDF e a lista ficou vazia. Na execução que aguardou a abertura do editor, a habilitação de Anotações e o fim do carregamento dos anexos, o POST retornou 201 e o download passou. A causa da primeira observação ficou sem confirmação. Os bancos operacionais, as chaves e o agendamento ficaram fora do ensaio. [Integração de anexos](../../tests/integration/attachments.test.ts) · [E2E de anexos](../../tests/e2e/attachments.spec.ts) · [Ambiente e regressão](24-retomar-campanha.md#ambiente-e-regressão-p1p5)

### Regressão ao abrir uma sessão

| Critério | Comportamento esperado | Verificação |
| --- | --- | --- |
| P5-01/04/07 | Ao abrir uma sessão, o formulário ainda montado da campanha fica indisponível durante a transição. O formulário da sessão permite o primeiro upload assim que os anexos estiverem carregados, com confirmação no documento correto. | E2E com respostas controladas, seleção de PDF, verificação do POST e download |

Ao abrir uma sessão existente, a aplicação aguarda a leitura HTTP antes de trocar de tela. Durante essa espera, a seção de anexos ainda pertence à campanha. O ensaio anterior podia selecionar o PDF nesse formulário e encontrar um campo vazio no novo formulário após a troca. Sem arquivo no novo campo, a validação nativa impede o envio antes do manipulador e da leitura assíncrona. A investigação confirmou a janela de interação com o formulário anterior. O primeiro ensaio tinha instrumentação insuficiente para confirmar a sequência exata de eventos.

- **Red** — com a resposta da sessão retida, o navegador encontrou o seletor da campanha habilitado depois do clique para abrir a sessão.
- **Green** — a interação com o formulário da campanha fica bloqueada durante a navegação. Ao montar o editor, o formulário da sessão só aparece quando a leitura dos anexos termina. O teste controla as duas respostas, usa o primeiro seletor habilitado da sessão, confirma o POST 201 para o documento correto, verifica que a campanha continua sem anexos e baixa o PDF.
- **Regressão** — os dois testes focados de anexos passaram em três repetições. A integração de P5-01 a P5-12 passou, incluindo exportação ZIP, restauração isolada, preservação de bytes e vínculos e rollback. O contrato e o esquema permanecem iguais. [E2E de anexos](../../tests/e2e/attachments.spec.ts) · [Integração de anexos](../../tests/integration/attachments.test.ts)
