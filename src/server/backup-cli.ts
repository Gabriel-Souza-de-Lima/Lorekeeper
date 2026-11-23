import { copyDatabase } from './backup.ts'

const [command, source, destination, ...extra] = process.argv.slice(2)
if ((command !== 'backup' && command !== 'restore') || !source?.trim() || !destination?.trim() || extra.length > 0) {
  console.error('Uso: node src/server/backup-cli.ts <backup|restore> <origem.sqlite> <destino.sqlite>')
  process.exitCode = 1
} else {
  try {
    await copyDatabase(source, destination)
    console.log(command === 'backup' ? 'Cópia SQLite criada e verificada.' : 'Cópia isolada restaurada e verificada.')
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Não foi possível concluir a cópia SQLite.')
    process.exitCode = 1
  }
}
