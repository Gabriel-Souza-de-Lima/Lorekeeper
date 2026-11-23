import { copyDatabase } from './backup.ts'
import { encryptBackup, restoreEncryptedBackup } from './encrypted-backup.ts'

const [command, source, destination, keyFile, ...extra] = process.argv.slice(2)
const encrypted = command === 'encrypt' || command === 'decrypt'
const local = command === 'backup' || command === 'restore'
if ((!local && !encrypted) || !source?.trim() || !destination?.trim() ||
    (encrypted ? !keyFile?.trim() : keyFile !== undefined) || extra.length > 0) {
  console.error('Uso: node src/server/backup-cli.ts <backup|restore> <origem> <destino>')
  console.error('     node src/server/backup-cli.ts <encrypt|decrypt> <origem> <destino> <arquivo-chave>')
  process.exitCode = 1
} else {
  try {
    if (command === 'encrypt' && keyFile) await encryptBackup(source, destination, keyFile)
    else if (command === 'decrypt' && keyFile) await restoreEncryptedBackup(source, destination, keyFile)
    else await copyDatabase(source, destination)
    console.log('Operação de cópia concluída e verificada.')
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Não foi possível concluir a cópia SQLite.')
    process.exitCode = 1
  }
}
