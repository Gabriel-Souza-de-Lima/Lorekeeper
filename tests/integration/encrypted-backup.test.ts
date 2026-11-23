import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { openDatabase } from '../../src/server/database.ts'
import { encryptBackup, restoreEncryptedBackup } from '../../src/server/encrypted-backup.ts'

test('I4-03a/b: recupera uma cópia autenticada e rejeita adulteração, truncamento e chave errada', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-encrypted-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const source = join(dir, 'source.sqlite')
  const encrypted = join(dir, 'external.lkb')
  const restored = join(dir, 'restored.sqlite')
  const keyFile = join(dir, 'key')
  const wrong = join(dir, 'wrong')
  writeFileSync(keyFile, randomBytes(32))
  writeFileSync(wrong, randomBytes(32))
  const invalid = join(dir, 'invalid')
  writeFileSync(invalid, randomBytes(31))
  const db = openDatabase(source)
  try {
    db.exec("INSERT INTO documents (id, title, body, type, created_at, updated_at) VALUES ('nota', 'Farol', 'Pista fictícia', 'quick_note', 'hoje', 'hoje')")
    await assert.rejects(encryptBackup(source, encrypted, invalid), /32 bytes/)
    assert.equal(existsSync(encrypted), false)
    await encryptBackup(source, encrypted, keyFile)
    const bytes = readFileSync(encrypted)
    assert.equal(bytes.subarray(0, 8).toString(), 'LKBACK01')
    assert.equal(bytes.includes(Buffer.from('Pista fictícia')), false)
    await assert.rejects(encryptBackup(source, encrypted, keyFile), /EEXIST/)
    assert.deepEqual(readFileSync(encrypted), bytes)
    await assert.rejects(restoreEncryptedBackup(encrypted, restored, wrong))
    assert.equal(existsSync(restored), false)
    const damaged = join(dir, 'damaged.lkb')
    writeFileSync(damaged, bytes.subarray(0, 10))
    await assert.rejects(restoreEncryptedBackup(damaged, restored, keyFile))
    const modified = Buffer.from(bytes)
    modified[22] ^= 1
    writeFileSync(damaged, modified)
    await assert.rejects(restoreEncryptedBackup(damaged, restored, keyFile))
    assert.equal(existsSync(restored), false)
    await restoreEncryptedBackup(encrypted, restored, keyFile)
    await assert.rejects(restoreEncryptedBackup(encrypted, restored, keyFile), /destino/i)
    const replica = openDatabase(restored)
    try {
      assert.equal(replica.prepare('SELECT body FROM documents').pluck().get(), 'Pista fictícia')
    } finally { replica.close() }
  } finally { db.close() }
})
