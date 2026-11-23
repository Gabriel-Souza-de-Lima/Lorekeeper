import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'

interface QuickNote {
  id: string
  campaignId: string | null
  title: string
  body: string
  createdAt: string
}

type SessionParams = { campaignId: string; sessionId: string }
type LinkParams = SessionParams & { noteId: string }

const path = '/api/quick-notes'
const uuid = { type: 'string', pattern: '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' }
function noteBody(properties: Record<string, unknown>) {
  return { body: { type: 'object', required: Object.keys(properties), additionalProperties: false, properties } }
}

const intakeSchema = noteBody({ id: uuid, body: { type: 'string' } })

export function registerQuickNotes(app: FastifyInstance, db: Database.Database) {
  const quickNotes = `
    SELECT id, campaign_id AS campaignId, title, body, created_at AS createdAt
    FROM documents WHERE type = 'quick_note'`
  const order = 'ORDER BY created_at DESC, id DESC'
  const list = db.prepare<[], QuickNote>(`${quickNotes} AND campaign_id IS NULL ${order}`)
  const listByCampaign = db.prepare<[id: string], QuickNote>(`${quickNotes} AND campaign_id = ? ${order}`)
  const campaign = db.prepare<[id: string], { archivedAt: string | null }>(
    'SELECT archived_at AS archivedAt FROM campaigns WHERE id = ?',
  )
  const setCampaign = db.prepare(`
    UPDATE documents SET campaign_id = @campaignId, updated_at = @now, version = version + 1
    WHERE type = 'quick_note' AND id = @id AND campaign_id IS NULL`)
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

  const assign = db.transaction((id: string, campaignId: string) => {
    const note = select.get(id)
    if (!note) return { status: 404, message: 'Anotação não encontrada.' }
    if (note.campaignId === campaignId) return { status: 200, note }
    if (note.campaignId !== null) return { status: 409, message: 'A anotação já está em outra campanha.' }
    const target = campaign.get(campaignId)
    if (!target) return { status: 404, message: 'Campanha não encontrada.' }
    if (target.archivedAt !== null) return { status: 409, message: 'Reative a campanha antes de encaminhar.' }
    setCampaign.run({ id, campaignId, now: new Date().toISOString() })
    return { status: 200, note: { ...note, campaignId } }
  })

  const sessionInCampaign = db.prepare<[campaignId: string, sessionId: string]>(`
    SELECT 1 FROM sessions s JOIN documents d ON d.id = s.document_id
    WHERE d.campaign_id = ? AND d.id = ? AND d.type = 'session' AND s.trashed_at IS NULL`)
  const linkedNotes = db.prepare<[campaignId: string, sessionId: string], QuickNote>(`
    ${quickNotes} AND campaign_id = ?
      AND id IN (SELECT source_id FROM document_links WHERE target_id = ? AND origin = 'manual')
    ${order}`)
  const link = db.prepare(`
    INSERT INTO document_links (source_id, target_id, origin) VALUES (?, ?, 'manual')
    ON CONFLICT (source_id, target_id, origin) DO NOTHING`)
  const unlink = db.prepare("DELETE FROM document_links WHERE source_id = ? AND target_id = ? AND origin = 'manual'")
  const updateLink = db.transaction((params: LinkParams, add: boolean) => {
    const { campaignId, sessionId, noteId } = params
    if (!sessionInCampaign.get(campaignId, sessionId)) return { status: 404, message: 'Sessão não encontrada.' }
    const id = noteId.toLowerCase()
    const note = select.get(id)
    if (!note || (note.campaignId !== campaignId && !(add && note.campaignId === null))) {
      return { status: 404, message: 'Anotação não encontrada.' }
    }
    if (campaign.get(campaignId)?.archivedAt !== null) {
      return { status: 409, message: 'Reative a campanha para alterar vínculos.' }
    }
    if (note.campaignId === null) setCampaign.run({ id, campaignId, now: new Date().toISOString() })
    const statement = add ? link : unlink
    statement.run(id, sessionId)
    return { status: 204 }
  })

  const sessionNotes = '/api/campaigns/:campaignId/sessions/:sessionId/quick-notes'
  app.get<{ Params: SessionParams }>(sessionNotes, (request, reply) => {
    const { campaignId, sessionId } = request.params
    if (!sessionInCampaign.get(campaignId, sessionId)) return reply.code(404).send({ message: 'Sessão não encontrada.' })
    return linkedNotes.all(campaignId, sessionId)
  })
  app.route<{ Params: LinkParams }>({
    method: ['PUT', 'DELETE'],
    url: `${sessionNotes}/:noteId`,
    schema: { params: { type: 'object', required: ['noteId'], properties: { noteId: uuid } } },
    handler(request, reply) {
      const result = updateLink.immediate(request.params, request.method === 'PUT')
      if (result.status === 204) return reply.code(204).send()
      return reply.code(result.status).send({ message: result.message })
    },
  })
  app.get(path, () => list.all())
  app.get<{ Params: { campaignId: string } }>('/api/campaigns/:campaignId/quick-notes', (request, reply) => {
    const { campaignId } = request.params
    if (!campaign.get(campaignId)) return reply.code(404).send({ message: 'Campanha não encontrada.' })
    return listByCampaign.all(campaignId)
  })
  app.put<{ Params: { noteId: string }; Body: { campaignId: string } }>(`${path}/:noteId/campaign`, {
    schema: {
      ...noteBody({ campaignId: uuid }),
      params: { type: 'object', required: ['noteId'], properties: { noteId: uuid } },
    },
  }, (request, reply) => {
    const result = assign.immediate(request.params.noteId.toLowerCase(), request.body.campaignId.toLowerCase())
    return reply.code(result.status).send(result.note ?? { message: result.message })
  })
  app.post<{ Body: { id: string; body: string } }>(path, { schema: intakeSchema }, (request, reply) => {
    const { id, body } = request.body
    if (!body.trim()) return reply.code(400).send({ message: 'Escreva uma anotação antes de guardar.' })
    const result = capture.immediate(id.toLowerCase(), body)
    return reply.code(result.status).send(result.note ?? { message: result.message })
  })
}
