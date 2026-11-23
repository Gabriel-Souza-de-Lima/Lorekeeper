# P5 — Anexos de campanha

**Estado.** Implementação em revisão como incremento independente.

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
