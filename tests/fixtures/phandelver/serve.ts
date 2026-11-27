import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createApp } from '../../../src/server/app.ts'
import { expected, seedPhandelver } from './seed.ts'

const variant = process.argv[2] ?? 'complete'
if (variant !== 'complete' && variant !== 'load') throw new Error('Use complete ou load.')

const directory = mkdtempSync(join(tmpdir(), 'lorekeeper-phv2-'))
const database = join(directory, 'lorekeeper.sqlite')
const app = createApp(database, resolve('dist'))
try {
  const { complete, load } = await seedPhandelver(app, variant)
  assert.deepEqual(complete, expected.campanhaCompleta)
  if (variant === 'load') assert.deepEqual(load, expected.carga)
  const origin = await app.listen({ host: '127.0.0.1', port: 0 })
  console.log(JSON.stringify({ variant, origin, LOREKEEPER_DB_PATH: database, complete, ...(variant === 'load' ? { load } : {}) }, null, 2))
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => { void app.close() })
  }
} catch (error) {
  await app.close()
  throw error
}
