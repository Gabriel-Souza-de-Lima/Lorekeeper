import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { createApp } from '../../src/server/app.ts'
import { expected, seedPhandelver } from '../fixtures/phandelver/seed.ts'

test('PHV2-10/13: campanha completa e carga isolada seguem o oráculo em SQLite', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'lk-phv2-test-'))
  try {
    for (const variant of ['complete', 'load'] as const) {
      const path = join(directory, variant + '.sqlite')
      const app = createApp(path)
      try {
        const report = await seedPhandelver(app, variant)
        assert.deepEqual(report.complete, expected.campanhaCompleta)
        if (variant === 'load') assert.deepEqual(report.load, expected.carga)
        const { root, control, ids } = report
        const lookup = (url: string) => app.inject({ url })
        assert.equal((await lookup(control + '/sessions/' + ids('s1'))).statusCode, 404)
        assert.equal((await lookup(control + '/information/' + ids('i2'))).statusCode, 404)
        const info = (await lookup(root + '/information/' + ids('i2'))).json()
        assert.equal(info.state, 'refuted')
        assert.equal(info.history[0].source.documentId, ids('s1'))
        assert.ok(info.evidence.some((entry: { role: string }) => entry.role === 'contradicts'))
        const knowledge = (await lookup(root + '/information/' + ids('i2') + '/perspectives')).json()
        assert.equal(knowledge.events.length, 5)
      } finally { await app.close() }
      const db = new Database(path, { readonly: true })
      try {
        assert.equal(db.pragma('integrity_check', { simple: true }), 'ok')
        assert.deepEqual(db.pragma('foreign_key_check'), [])
      } finally { db.close() }
    }
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
