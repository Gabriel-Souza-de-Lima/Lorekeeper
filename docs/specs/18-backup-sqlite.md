# I4-02 — Cópia local do SQLite e restauração isolada

- **Estado** — implementada, com CI remoto pendente.
- **Objetivo** — gerar uma cópia consistente do banco e restaurá-la em um arquivo separado.
- **Rastreabilidade** — MVP-12 e seção de busca e recuperação da arquitetura.

| ID | Critério | Teste |
| --- | --- | --- |
| I4-02a | Gerar uma cópia consistente com o servidor aberto, incluindo gravações confirmadas em WAL. Validar integridade e chaves estrangeiras antes de disponibilizá-la. | Integração SQLite |
| I4-02b | Abrir a restauração em outra instância e recuperar campanha, sessão, revisões, notas, vínculos e busca. A origem preserva gravações feitas após a cópia. | Integração API e SQLite |
| I4-02c | Recusar origem ausente ou inválida, destino existente e arquivos auxiliares preexistentes. Limpar arquivos temporários após falha e manter os arquivos existentes. | Integração SQLite |

O comando recebe origem e destino explícitos. Backup e restauração utilizam a API de backup do SQLite e criam um novo arquivo, com publicação atômica no destino. O diretório de destino deve existir e o sistema de arquivos deve suportar hard links. A validação ocorre antes da publicação. A cópia local contém o banco em claro. Criptografia, cópia externa, agendamento e retenção ficam para a próxima entrega.


## Uso local

Execute a partir da raiz do repositório. Use diretórios já existentes, privados e em sistemas de arquivos com suporte a hard links no volume de destino, como NTFS ou ext4.

```sh
node src/server/backup-cli.ts backup data/lorekeeper.sqlite backups/lorekeeper-ficticio.sqlite
node src/server/backup-cli.ts restore backups/lorekeeper-ficticio.sqlite ensaio/lorekeeper.sqlite
```

Para abrir o ensaio em outro processo, use o arquivo restaurado e uma porta diferente:

```powershell
$env:LOREKEEPER_DB_PATH = 'ensaio/lorekeeper.sqlite'
$env:PORT = '3001'
npm start
```

No Linux, use `LOREKEEPER_DB_PATH=ensaio/lorekeeper.sqlite PORT=3001 npm start`. Abra o processo indicado, confira a busca e encerre-o após validar. Mantenha o destino original e a cópia verificada para recuperação.

## Evidências de TDD

- **Red** — os dois cenários iniciais falharam com a cópia ainda ausente.
- **Green** — a restauração isolada recuperou a sessão e as relações, enquanto a origem manteve a gravação posterior.
- **Refactor** — a publicação e a validação ficaram separadas no código. A regressão cobre também chaves estrangeiras órfãs e dois pedidos sobre o mesmo destino.
