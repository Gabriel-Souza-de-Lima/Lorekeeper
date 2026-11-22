import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'

interface QuickNote {
  id: string
  campaignId: string | null
  title: string
  body: string
  createdAt: string
}

const path = '/api/quick-notes'
const intakeSchema = {
  body: {
    type: 'object',
    required: ['id', 'body'],
    additionalProperties: false,
    properties: {
      id: { type: 'string', pattern: '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' },
      body: { type: 'string' },
    },
  },
}

export function registerQuickNotes(app: FastifyInstance, db: Database.Database) {
  const quickNotes = `
    SELECT id, campaign_id AS campaignId, title, body, created_at AS createdAt
    FROM documents WHERE type = 'quick_note'`
  const list = db.prepare<[], QuickNote>(`${quickNotes} AND campaign_id IS NULL ORDER BY created_at DESC, id DESC`)
  const select = db.prepare<[id: string], QuickNote>(`${quickNotes} AND id = ?`)
  const insert = db.prepare(`
    INSERT INTO documents (id, campaign_id, type, title, body, created_at, updated_at)
    VALUES (@id, NULL, 'quick_note', @title, @body, @now, @now)
    ON CONFLICT (id) DO NOTHING`)

  const capture = db.transaction((id: string, body: string) => {
    const firstLine = body.trim().split(/\r?\n/, 1)[0].trim()
    const title = Array.from(firstLine).slice(0, 120).join('')
    const result = insert.run({ id, body, title, now: new Date().toISOString() })
    const note = select.get(id)
    if (!note || note.body !== body) return { status: 409, message: 'O identificador já foi usado.' }
    return { status: result.changes ? 201 : 200, note }
  })

  app.get(path, () => list.all())
  app.post<{ Body: { id: string; body: string } }>(path, { schema: intakeSchema }, (request, reply) => {
    const { id, body } = request.body
    if (!body.trim()) return reply.code(400).send({ message: 'Escreva uma anotação antes de guardar.' })
    const result = capture.immediate(id.toLowerCase(), body)
    return reply.code(result.status).send(result.note ?? { message: result.message })
  })
}
