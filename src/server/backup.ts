import { chmod, link, lstat, mkdtemp, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import Database from 'better-sqlite3'

async function checkDestination(path: string) {
  for (const candidate of [path, `${path}-wal`, `${path}-shm`, `${path}-journal`]) {
    try {
      await lstat(candidate)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
    throw new Error('O destino ou um arquivo auxiliar já existe.')
  }
}

function validateSnapshot(path: string) {
  const db = new Database(path, { readonly: true, fileMustExist: true })
  try {
    const version = db.pragma('user_version', { simple: true })
    const tables = db.prepare(`
      SELECT count(*) FROM sqlite_schema WHERE type = 'table'
      AND name IN ('campaigns', 'documents', 'sessions')`).pluck().get()
    if (typeof version !== 'number' || version < 1 || tables !== 3) {
      throw new Error('A origem não possui um esquema do Lorekeeper.')
    }
    const integrity = db.prepare<[], string>('PRAGMA integrity_check').pluck().all()
    if (integrity.length !== 1 || integrity[0] !== 'ok' || db.prepare('PRAGMA foreign_key_check').get()) {
      throw new Error('A cópia falhou na verificação de integridade do SQLite.')
    }
  } finally {
    db.close()
  }
}

export async function copyDatabase(source: string, destination: string) {
  const target = resolve(destination)
  await checkDestination(target)
  const staged = await mkdtemp(join(dirname(target), '.lorekeeper-backup-'))
  const snapshot = join(staged, 'snapshot.sqlite')
  try {
    const db = new Database(resolve(source), { readonly: true, fileMustExist: true })
    try {
      await db.backup(snapshot)
    } finally {
      db.close()
    }
    validateSnapshot(snapshot)
    await chmod(snapshot, 0o600)
    await checkDestination(target)
    // Publishing by hard link keeps the verified file on the same volume and
    // refuses an existing destination atomically, including concurrent copies.
    await link(snapshot, target)
  } finally {
    await rm(staged, { recursive: true, force: true })
  }
}
