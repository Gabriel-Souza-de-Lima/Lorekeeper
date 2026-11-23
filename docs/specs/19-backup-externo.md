# I4-03 — Cópia externa criptografada

- **Estado** — implementada, com validação operacional externa pendente.
- **Rastreabilidade** — MVP-12 e a política de backup da arquitetura.

| ID | Critério | Teste |
| --- | --- | --- |
| I4-03a | Gerar uma cópia SQLite verificada, criptografar e publicar em um destino explícito sem sobrescrever um arquivo existente. | Integração |
| I4-03b | Autenticar todo o arquivo antes de publicar uma restauração isolada. Chave errada, truncamento e adulteração deixam o destino intacto. | Integração |

O formato `LKBACK01` usa cabeçalho autenticado, nonce aleatório de 12 bytes, AES-256-GCM e tag de 16 bytes. A chave binária de 32 bytes é fornecida por arquivo. A cópia temporária em claro fica no diretório temporário privado do processo. O destino externo recebe apenas o arquivo criptografado.

## Operação

O destino deve ser um volume independente, montado previamente e com suporte a hard links no diretório de backup. Use caminhos explícitos e diretórios privados. Guarde o arquivo de chave fora do repositório e em local separado das cópias. Mantenha uma cópia recuperável da chave. Uma interrupção abrupta pode deixar arquivos em claro no diretório temporário local, que deve estar em volume protegido.

```sh
node src/server/backup-cli.ts encrypt data/lorekeeper.sqlite /volume-externo/lorekeeper-2026-11-23.lkb /local-privado/chave.bin
node src/server/backup-cli.ts decrypt /volume-externo/lorekeeper-2026-11-23.lkb ensaio/restaurado.sqlite /local-privado/chave.bin
```

## Agendamento e retenção

Agende uma execução diária no host para um horário com pouca escrita. O agendador deve verificar que o volume independente está montado antes de executar e usar um nome novo por data. Considere concluída apenas a execução que retorna código zero. Registre horário, destino e resultado. Trate ausência de uma cópia aprovada nas últimas 24 horas como pendência operacional.

Mantenha as sete cópias diárias mais recentes e uma cópia por semana nas quatro semanas anteriores. Antes de remover qualquer cópia antiga, confirme uma nova gravação aprovada e um ensaio recente de recuperação, com a chave correspondente. O comando atual não remove arquivos nem instala agendadores. A ativação e a validação no volume externo real fazem parte do piloto.

## Evidências de TDD

- **Red** — integração falhou com a operação criptografada ainda ausente.
- **Green** — o teste gerou e recuperou uma cópia autenticada e rejeitou chave errada, truncamento e adulteração.
- **Refactor** — leitura e gravação em fluxo preservam o formato e limitam o uso de memória. A regressão também cobre chave de tamanho inválido e restauração sobre destino existente.
