import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import staticFiles from '@fastify/static'
import { campaignStatuses } from '../contracts.ts'
import type { Campaign, CampaignFields, Session, SessionFields, SessionSummary } from '../contracts.ts'
import { openDatabase } from './database.ts'

const text = { type: 'string' }
const date = { ...text, pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' }
const campaignFields = {
  name: text, description: text, gameMaster: text, system: text, rulesVersion: text, notes: text,
  status: { type: 'string', enum: campaignStatuses },
}
const sessionFields = {
  title: text, date, fictionalDate: text, participants: text, body: text,
  number: { type: ['integer', 'null'], minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
  version: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER - 1 },
}

function bodySchema(properties: Record<string, unknown>) {
  return { body: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } }
}

function validDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

type CampaignParams = { campaignId: string }
type SessionParams = CampaignParams & { sessionId: string }
const campaignPath = '/api/campaigns/:campaignId'
const sessionsPath = `${campaignPath}/sessions`
const sessionPath = `${sessionsPath}/:sessionId`

export function createApp(database: string, webRoot?: string) {
  const db = openDatabase(database)
  const app = Fastify({ ajv: { customOptions: { coerceTypes: false, removeAdditional: false } } })
  app.addHook('onClose', () => db.close())
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof Error && 'validation' in error) return reply.code(400).send({ message: 'Revise os campos informados.' })
    return reply.send(error)
  })
  app.addHook('onRequest', (request, reply, done) => {
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store')
    done()
  })
  if (webRoot) app.register(staticFiles, { root: webRoot })

  const campaignSelect = `
    SELECT c.id, c.name, c.description, c.game_master AS gameMaster, c.system,
      c.rules_version AS rulesVersion, c.notes, c.status, c.archived_at AS archivedAt,
      COUNT(s.document_id) AS sessionCount, MAX(s.session_date) AS lastSessionDate
    FROM campaigns c
    LEFT JOIN documents d ON d.campaign_id = c.id AND d.type = 'session'
    LEFT JOIN sessions s ON s.document_id = d.id`
  const listCampaigns = db.prepare<[booleanAsInt: number], Campaign>(`
    ${campaignSelect} WHERE (c.archived_at IS NOT NULL) = ? GROUP BY c.id ORDER BY c.name, c.id`)
  const campaignState = db.prepare<[id: string], { archivedAt: string | null }>(
    'SELECT archived_at AS archivedAt FROM campaigns WHERE id = ?',
  )
  const selectCampaign = db.prepare<[id: string], Campaign>(`${campaignSelect} WHERE c.id = ? GROUP BY c.id`)
  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (id, name, created_at, updated_at) VALUES (@id, @name, @now, @now)`)
  const updateCampaign = db.prepare(`
    UPDATE campaigns SET name = @name, description = @description, game_master = @gameMaster,
      system = @system, rules_version = @rulesVersion, notes = @notes, status = @status, updated_at = @now
    WHERE id = @id AND archived_at IS NULL`)
  const archiveCampaign = db.prepare('UPDATE campaigns SET archived_at = ?, updated_at = ? WHERE id = ?')

  app.get<{ Querystring: { archived?: string } }>('/api/campaigns', (request) =>
    listCampaigns.all(Number(request.query.archived === 'true')))
  app.post<{ Body: { name: string } }>('/api/campaigns', { schema: bodySchema({ name: text }) }, (request, reply) => {
    const name = request.body.name.trim()
    if (!name) return reply.code(400).send({ message: 'Informe o nome da campanha.' })
    const id = randomUUID()
    insertCampaign.run({ id, name, now: new Date().toISOString() })
    return reply.code(201).send(selectCampaign.get(id))
  })
  app.get<{ Params: CampaignParams }>(campaignPath, (request, reply) =>
    selectCampaign.get(request.params.campaignId) ?? reply.code(404).send({ message: 'Campanha não encontrada.' }))
  app.put<{ Params: CampaignParams; Body: CampaignFields }>(
    campaignPath, { schema: bodySchema(campaignFields) }, (request, reply) => {
      const id = request.params.campaignId
      const current = campaignState.get(id)
      if (!current) return reply.code(404).send({ message: 'Campanha não encontrada.' })
      if (current.archivedAt) return reply.code(409).send({ message: 'Reative a campanha para editar.' })
      const name = request.body.name.trim()
      if (!name) return reply.code(400).send({ message: 'Informe o nome da campanha.' })
      updateCampaign.run({ ...request.body, name, id, now: new Date().toISOString() })
      return selectCampaign.get(id)
    })
  app.patch<{ Params: CampaignParams; Body: { archived: boolean } }>(
    campaignPath, { schema: bodySchema({ archived: { type: 'boolean' } }) }, (request, reply) => {
      const id = request.params.campaignId
      const now = new Date().toISOString()
      const result = archiveCampaign.run(request.body.archived ? now : null, now, id)
      if (!result.changes) return reply.code(404).send({ message: 'Campanha não encontrada.' })
      return selectCampaign.get(id)
    })

  const sessionSelect = `
    FROM documents d JOIN sessions s ON s.document_id = d.id
    WHERE d.campaign_id = ? AND d.type = 'session'`
  const listSessions = db.prepare<[id: string], SessionSummary>(`
    SELECT d.id, d.title, s.session_date AS date, s.number ${sessionSelect}
    ORDER BY s.session_date DESC, d.created_at DESC, d.id DESC`)
  const selectSession = db.prepare<[campaignId: string, sessionId: string], Session>(`
    SELECT d.id, d.title, d.body, d.version, s.session_date AS date, s.fictional_date AS fictionalDate,
      s.participants, s.number ${sessionSelect} AND d.id = ?`)
  const insertDocument = db.prepare(`
    INSERT INTO documents (id, campaign_id, type, title, created_at, updated_at)
    VALUES (@id, @campaignId, 'session', 'Nova sessão', @now, @now)`)
  const insertSession = db.prepare('INSERT INTO sessions (document_id, session_date) VALUES (?, ?)')
  const updateDocument = db.prepare(`
    UPDATE documents SET title = @title, body = @body, version = version + 1, updated_at = @now
    WHERE id = @id AND campaign_id = @campaignId AND version = @version`)
  const updateSession = db.prepare(`
    UPDATE sessions SET session_date = @date, fictional_date = @fictionalDate,
      participants = @participants, number = @number WHERE document_id = @id`)

  function editability(campaignId: string) {
    const campaign = campaignState.get(campaignId)
    if (!campaign) return 404
    return campaign.archivedAt ? 409 : 200
  }

  const createSession = db.transaction((campaignId: string, date: string) => {
    const status = editability(campaignId)
    if (status !== 200) return { status }
    const id = randomUUID()
    insertDocument.run({ id, campaignId, now: new Date().toISOString() })
    insertSession.run(id, date)
    return { status: 201, session: selectSession.get(campaignId, id) }
  })
  const saveSession = db.transaction((params: SessionParams, draft: SessionFields & { version: number }) => {
    const { campaignId, sessionId: id } = params
    if (!selectSession.get(campaignId, id)) return { status: 404, message: 'Sessão não encontrada.' }
    if (editability(campaignId) === 409) return { status: 409, message: 'Reative a campanha para editar.' }
    const values = { ...draft, id, campaignId, now: new Date().toISOString() }
    if (!updateDocument.run(values).changes) return { status: 409, message: 'A sessão foi alterada desde que você a abriu.' }
    updateSession.run(values)
    return { status: 200, session: selectSession.get(campaignId, id) }
  })

  app.get<{ Params: CampaignParams }>(sessionsPath, (request, reply) => {
    const id = request.params.campaignId
    if (!campaignState.get(id)) return reply.code(404).send({ message: 'Campanha não encontrada.' })
    return listSessions.all(id)
  })
  app.post<{ Params: CampaignParams; Body: { date: string } }>(
    sessionsPath, { schema: bodySchema({ date }) }, (request, reply) => {
      if (!validDate(request.body.date)) return reply.code(400).send({ message: 'Informe uma data válida.' })
      const result = createSession.immediate(request.params.campaignId, request.body.date)
      if (result.status === 404) return reply.code(404).send({ message: 'Campanha não encontrada.' })
      if (result.status === 409) return reply.code(409).send({ message: 'Reative a campanha para criar sessões.' })
      return reply.code(201).send(result.session)
    })
  app.get<{ Params: SessionParams }>(sessionPath, (request, reply) => {
    const { campaignId, sessionId } = request.params
    return selectSession.get(campaignId, sessionId) ?? reply.code(404).send({ message: 'Sessão não encontrada.' })
  })
  app.put<{ Params: SessionParams; Body: SessionFields & { version: number } }>(
    sessionPath, { schema: bodySchema(sessionFields) }, (request, reply) => {
      if (!validDate(request.body.date)) return reply.code(400).send({ message: 'Informe uma data válida.' })
      const title = request.body.title.trim()
      if (!title) return reply.code(400).send({ message: 'Informe o título da sessão.' })
      const result = saveSession.immediate(request.params, { ...request.body, title })
      return reply.code(result.status).send(result.session ?? { message: result.message })
    })

  return app
}
