import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import Database from 'better-sqlite3'
import { strFromU8, unzipSync } from 'fflate'
import { createApp } from '../../src/server/app.ts'
import { copyDatabase } from '../../src/server/backup.ts'
import { openDatabase } from '../../src/server/database.ts'

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMImMb1HwAEGgHwIgPnSQAAAABJRU5ErkJggg=='

function workspace(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-attachments-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('P5-01 a P5-12: valida vínculos e preserva bytes no ZIP e na restauração isolada', async (t) => {
  const dir = workspace(t)
  const path = join(dir, 'live.sqlite')
  const app = createApp(path)
  const id = randomUUID()
  const upload = { id, filename: 'farol.png', source: 'Mapa fictício', data: png }
  const bytes = Buffer.from(png, 'base64')
  let root: string
  try {
    const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload })
    const campaign = async (name: string) => '/api/campaigns/' + (await post('/api/campaigns', { name })).json().id
    root = await campaign('Ilhas') + '/attachments'
    const foreign = await campaign('Serra')
    const campaignUrl = root.slice(0, -'/attachments'.length)
    const wiki = randomUUID()
    assert.equal((await post(campaignUrl + '/wiki', { id: wiki, title: 'Farol', type: 'location', body: '' })).statusCode, 201)
    const foreignWiki = randomUUID()
    assert.equal((await post(foreign + '/wiki', { id: foreignWiki, title: 'Serra', type: 'location', body: '' })).statusCode, 201)
    assert.deepEqual((await app.inject(root)).json(), [])
    for (const input of [{ filename: '../farol.png' }, { filename: 'farol.pdf' },
      { data: Buffer.from('conteúdo de teste').toString('base64') }, { data: png.slice(0, -8) }]) {
      assert.equal((await post(root, { ...upload, ...input })).statusCode, 400)
    }
    assert.equal((await post(root + '?documentId=' + foreignWiki, upload)).statusCode, 404)
    assert.equal((await post(root, { ...upload, data: Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64') })).statusCode, 413)
    assert.deepEqual((await app.inject(root)).json(), [])
    const created = await post(root, upload)
    assert.equal(created.statusCode, 201, created.body)
    assert.equal(created.json().mime, 'image/png')
    assert.equal(created.json().size, bytes.length)
    assert.equal((await post(root, upload)).statusCode, 200)
    assert.equal((await app.inject(foreign + '/attachments/' + id + '/content')).statusCode, 404)
    const association = root + '/' + id + '/association'
    assert.equal((await app.inject({ method: 'PUT', url: association + '?documentId=' + foreignWiki })).statusCode, 404)
    assert.equal((await app.inject({ method: 'PUT', url: association + '?documentId=' + wiki })).statusCode, 204)
    assert.equal((await app.inject({ method: 'DELETE', url: association })).statusCode, 204)
    assert.deepEqual((await app.inject(root)).json(), [])
    assert.equal((await app.inject(root + '?documentId=' + wiki)).json()[0].id, id)
    assert.equal((await app.inject({ method: 'PATCH', url: root + '/' + id, payload: { name: 'Mapa do farol' } })).statusCode, 200)
    const zip = unzipSync((await app.inject('/api/export')).rawPayload)
    const manifest = JSON.parse(strFromU8(zip['lorekeeper.json']))
    assert.equal(manifest.attachments[0].sha256, createHash('sha256').update(bytes).digest('hex'))
    assert.deepEqual(Buffer.from(zip[manifest.attachments[0].path]), bytes)
    assert.equal(manifest.attachmentAssociations[0].document_id, wiki)
    assert.equal((await app.inject({ method: 'PATCH', url: campaignUrl, payload: { archived: true } })).statusCode, 200)
    assert.equal((await app.inject(root + '?documentId=' + wiki)).json()[0].name, 'Mapa do farol')
    assert.equal((await app.inject({ method: 'DELETE', url: association + '?documentId=' + wiki })).statusCode, 409)
    await copyDatabase(path, join(dir, 'backup.sqlite'))
  } finally { await app.close() }
  const restoredPath = join(dir, 'restored.sqlite')
  await copyDatabase(join(dir, 'backup.sqlite'), restoredPath)
  const db = openDatabase(restoredPath)
  try { assert.deepEqual(db.pragma('integrity_check'), [{ integrity_check: 'ok' }]) }
  finally { db.close() }
  const restored = createApp(restoredPath)
  try {
    const response = await restored.inject(root + '/' + id + '/content')
    assert.deepEqual(response.rawPayload, bytes)
    assert.equal(response.headers['x-content-type-options'], 'nosniff')
    assert.match(String(response.headers['content-type']), /^image\/png/)
  } finally { await restored.close() }
})

test('P5-05/07/08: PDF apenas por download e rollback de falha entre bytes e vínculo', async (t) => {
  const path = join(workspace(t), 'upload.sqlite')
  const app = createApp(path)
  const db = new Database(path)
  try {
    const campaign = await app.inject({ method: 'POST', url: '/api/campaigns', payload: { name: 'Mapa' } })
    const root = '/api/campaigns/' + campaign.json().id + '/attachments'
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>',
    ]
    let pdf = '%PDF-1.4\n'
    const offsets = objects.map((object, index) => {
      const offset = pdf.length
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
      return offset
    })
    const xref = pdf.length
    pdf += 'xref\n0 4\n0000000000 65535 f \n'
    pdf += offsets.map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n').join('')
    pdf += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
    const id = randomUUID()
    const payload = { id, filename: 'ficha.pdf', data: Buffer.from(pdf).toString('base64') }
    const upload = () => app.inject({ method: 'POST', url: root, payload })
    db.exec(`CREATE TRIGGER fail_attachment BEFORE INSERT ON attachment_associations
      BEGIN SELECT RAISE(ABORT, 'falha de teste'); END`)
    assert.equal((await upload()).statusCode, 500)
    assert.equal(db.prepare('SELECT count(*) FROM attachments').pluck().get(), 0)
    db.exec('DROP TRIGGER fail_attachment')
    assert.equal((await upload()).statusCode, 201)
    const content = await app.inject(root + '/' + id + '/content')
    assert.match(String(content.headers['content-disposition']), /^attachment;/)
    assert.equal(content.body, pdf)
  } finally { db.close(); await app.close() }
})

function v10(t: TestContext, collision = false) {
  const path = join(workspace(t), 'v10.sqlite')
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = OFF')
    for (let version = 1; version <= 10; version++) {
      db.exec(readFileSync(new URL(`../fixtures/sqlite-v${version}.sql`, import.meta.url), 'utf8'))
    }
    db.exec("INSERT INTO campaigns (id, name, created_at, updated_at) VALUES ('ilhas', 'Ilhas', 'hoje', 'hoje')")
    db.exec(`INSERT INTO pending_items (id, campaign_id, title, type, state, created_at, updated_at)
      VALUES ('pergunta', 'ilhas', 'Onde está o farol?', 'question', 'open', 'hoje', 'hoje')`)
    if (collision) db.exec('CREATE TABLE attachment_associations (id TEXT)')
  } finally { db.close() }
  return path
}

test('migration-preservation P5: V11 preserva a pendência de V10', (t) => {
  const db = openDatabase(v10(t))
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 17)
    assert.equal(db.prepare('SELECT title FROM pending_items').pluck().get(), 'Onde está o farol?')
  } finally { db.close() }
})

test('migration-integrity P5: rejeita vínculos de anexos órfãos', (t) => {
  const db = openDatabase(v10(t))
  try {
    assert.throws(() => db.exec("INSERT INTO attachment_associations (attachment_id, campaign_id) VALUES ('ausente', 'ilhas')"), /FOREIGN KEY/)
    assert.deepEqual(db.pragma('foreign_key_check'), [])
  } finally { db.close() }
})

test('migration-rollback P5: colisão reverte integralmente as novas tabelas', (t) => {
  const path = v10(t, true)
  assert.throws(() => openDatabase(path), /attachment_associations already exists/)
  const db = new Database(path)
  try {
    assert.equal(db.pragma('user_version', { simple: true }), 10)
    assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name = 'attachments'").get(), undefined)
    assert.equal(db.prepare('SELECT title FROM pending_items').pluck().get(), 'Onde está o farol?')
  } finally { db.close() }
})
