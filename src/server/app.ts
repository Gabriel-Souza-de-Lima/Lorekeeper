import { createHash, randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import staticFiles from '@fastify/static'
import { campaignStatuses } from '../contracts.ts'
import type { Campaign, CampaignFields, Session, SessionFields, SessionSummary } from '../contracts.ts'
import { openDatabase } from './database.ts'
import { registerSearch } from './search.ts'
import { registerExport } from './export.ts'
import { registerDocumentTags } from './document-tags.ts'
import { prepareMarkdownLinks } from './markdown-links.ts'
import { registerQuickNotes } from './quick-notes.ts'
import { registerWiki } from './wiki.ts'

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
const operationIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
type SaveDraft = SessionFields & { version: number }

function hashDraft(draft: SaveDraft) {
  const { version, title, body, date, fictionalDate, participants, number } = draft
  return createHash('sha256')
    .update(JSON.stringify([version, title, body, date, fictionalDate, participants, number]))
    .digest('hex')
}

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
      c.featured_character_id AS featuredCharacterId,
      (SELECT title FROM documents WHERE id = c.featured_character_id) AS featuredCharacterTitle,
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
  const character = db.prepare("SELECT 1 FROM documents WHERE id = ? AND campaign_id = ? AND type = 'character'")
  const setFeatured = db.prepare(`
    UPDATE campaigns SET featured_character_id = @id, updated_at = @now
    WHERE id = @campaignId AND featured_character_id IS NOT @id`)
  const featureCharacter = db.transaction((campaignId: string, id: string | null) => {
    const current = campaignState.get(campaignId)
    if (!current) return { status: 404, message: 'Campanha não encontrada.' }
    if (current.archivedAt) return { status: 409, message: 'Reative a campanha para mudar o destaque.' }
    if (id !== null && !character.get(id, campaignId)) return { status: 404, message: 'Personagem não encontrado.' }
    setFeatured.run({ id, now: new Date().toISOString(), campaignId })
    return { status: 200, campaign: selectCampaign.get(campaignId) }
  })
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

  app.put<{ Params: CampaignParams; Body: { id: string | null } }>(
    `${campaignPath}/featured-character`, { schema: bodySchema({ id: { type: ['string', 'null'] } }) }, (request, reply) => {
      const id = request.body.id?.toLowerCase() ?? null
      if (id !== null && !operationIdPattern.test(id)) return reply.code(400).send({ message: 'Identificador inválido.' })
      const result = featureCharacter.immediate(request.params.campaignId, id)
      return reply.code(result.status).send(result.campaign ?? { message: result.message })
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
  const sessionExists = db.prepare<[campaignId: string, sessionId: string]>(
    `SELECT 1 ${sessionSelect} AND d.id = ?`,
  )
  const insertDocument = db.prepare(`
    INSERT INTO documents (id, campaign_id, type, title, body, created_at, updated_at)
    VALUES (@id, @campaignId, 'session', @title, @body, @now, @now)
    ON CONFLICT (id) DO NOTHING`)
  const insertSession = db.prepare(`
    INSERT INTO sessions (document_id, session_date, fictional_date, participants, number)
    VALUES (@id, @date, @fictionalDate, @participants, @number)`)
  const updateDocument = db.prepare(`
    UPDATE documents SET title = @title, body = @body, version = version + 1, updated_at = @now
    WHERE id = @id AND campaign_id = @campaignId AND version = @version`)
  const syncMarkdownLinks = prepareMarkdownLinks(db)
  const updateSession = db.prepare(`
    UPDATE sessions SET session_date = @date, fictional_date = @fictionalDate,
      participants = @participants, number = @number WHERE document_id = @id`)

  const insertRevision = db.prepare<[id: string]>(`
    INSERT INTO session_revisions (document_id, version, title, body, created_at)
    SELECT id, version, title, body, updated_at FROM documents WHERE id = ?`)
  const listRevisions = db.prepare<[id: string]>(`
    SELECT version, title, body, created_at AS createdAt
    FROM session_revisions WHERE document_id = ? ORDER BY version DESC`)
  const selectReceipt = db.prepare<[id: string, key: string], { requestHash: string; responseJson: string }>(`
    SELECT request_hash AS requestHash, response_json AS responseJson FROM session_save_receipts
    WHERE document_id = ? AND operation_id = ?`)
  const insertReceipt = db.prepare(`
    INSERT INTO session_save_receipts (document_id, operation_id, revision, request_hash, response_json)
    SELECT @id, @operationId, MAX(version), @requestHash, @responseJson
    FROM session_revisions WHERE document_id = @id`)

  function editability(campaignId: string) {
    const campaign = campaignState.get(campaignId)
    if (!campaign) return 404
    return campaign.archivedAt ? 409 : 200
  }

  const createSession = db.transaction((campaignId: string, id: string, fields: SessionFields, operationId?: string) => {
    const requestHash = operationId ? hashDraft({ ...fields, version: 0 }) : null
    const receipt = operationId && selectSession.get(campaignId, id) ? selectReceipt.get(id, operationId) : undefined
    if (receipt) {
      if (receipt.requestHash !== requestHash) return { status: 409, message: 'O identificador já foi usado.' }
      return { status: 200, session: JSON.parse(receipt.responseJson) as Session }
    }
    const status = editability(campaignId)
    if (status === 404) return { status, message: 'Campanha não encontrada.' }
    if (status === 409) return { status, message: 'Reative a campanha para criar sessões.' }
    const values = { ...fields, id, campaignId, now: new Date().toISOString() }
    if (!insertDocument.run(values).changes) return { status: 409, message: 'O identificador já foi usado.' }
    insertSession.run(values)
    if (fields.body) syncMarkdownLinks(id, campaignId, fields.body)
    insertRevision.run(id)
    const session = { ...fields, id, version: 1 }
    if (operationId) insertReceipt.run({ id, operationId, requestHash, responseJson: JSON.stringify(session) })
    return { status: 201, session }
  })
  const saveSession = db.transaction((params: SessionParams, draft: SaveDraft, operationId?: string) => {
    const { campaignId, sessionId: id } = params
    const current = selectSession.get(campaignId, id)
    if (!current) return { status: 404, message: 'Sessão não encontrada.' }
    const requestHash = operationId ? hashDraft(draft) : null
    const receipt = operationId ? selectReceipt.get(id, operationId) : undefined
    if (receipt) {
      if (receipt.requestHash !== requestHash) return { status: 409, message: 'A chave já foi usada para outra gravação.' }
      return { status: 200, session: JSON.parse(receipt.responseJson) as Session }
    }
    if (editability(campaignId) === 409) return { status: 409, message: 'Reative a campanha para editar.' }
    if (current.version !== draft.version) return { status: 409, message: 'A sessão foi alterada desde que você a abriu.' }
    const textChanged = current.title !== draft.title || current.body !== draft.body
    const metadataChanged = current.date !== draft.date || current.fictionalDate !== draft.fictionalDate ||
      current.participants !== draft.participants || current.number !== draft.number
    let session = current
    if (textChanged || metadataChanged) {
      const values = { ...draft, id, campaignId, now: new Date().toISOString() }
      if (!updateDocument.run(values).changes) throw new Error('A sessão não pôde ser confirmada.')
      if (metadataChanged) updateSession.run(values)
      if (textChanged) {
        syncMarkdownLinks(id, campaignId, draft.body)
        insertRevision.run(id)
      }
      session = { id, ...draft, version: current.version + 1 }
    }
    if (operationId) insertReceipt.run({ id, operationId, requestHash, responseJson: JSON.stringify(session) })
    return { status: 200, session }
  })

  app.get<{ Params: CampaignParams }>(sessionsPath, (request, reply) => {
    const id = request.params.campaignId
    if (!campaignState.get(id)) return reply.code(404).send({ message: 'Campanha não encontrada.' })
    return listSessions.all(id)
  })
  const creationFields = Object.fromEntries(Object.entries(sessionFields).filter(([field]) => field !== 'version'))
  app.post<{ Params: CampaignParams; Body: { date: string } | (SessionFields & { id: string }) }>(
    sessionsPath, { schema: { body: { oneOf: [
      bodySchema({ date }).body,
      bodySchema({ ...creationFields, id: { type: 'string', pattern: '^[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' } }).body,
    ] } } }, (request, reply) => {
      const body = request.body
      if (!validDate(body.date)) return reply.code(400).send({ message: 'Informe uma data válida.' })
      let id: string
      let fields: SessionFields
      let operationId: string | undefined
      if ('id' in body) {
        const key = request.headers['idempotency-key']
        if (typeof key !== 'string' || !operationIdPattern.test(key)) {
          return reply.code(400).send({ message: 'Chave de criação inválida.' })
        }
        const { id: clientId, ...submitted } = body
        id = clientId.toLowerCase()
        fields = { ...submitted, title: submitted.title.trim() }
        operationId = key.toLowerCase()
      } else {
        id = randomUUID()
        fields = { date: body.date, title: 'Nova sessão', body: '', fictionalDate: '', participants: '', number: null }
      }
      if (!fields.title) return reply.code(400).send({ message: 'Informe o título da sessão.' })
      const result = createSession.immediate(request.params.campaignId, id, fields, operationId)
      return reply.code(result.status).send(result.session ?? { message: result.message })
    })
  app.get<{ Params: SessionParams }>(sessionPath, (request, reply) => {
    const { campaignId, sessionId } = request.params
    return selectSession.get(campaignId, sessionId) ?? reply.code(404).send({ message: 'Sessão não encontrada.' })
  })
  app.get<{ Params: SessionParams }>(`${sessionPath}/revisions`, (request, reply) => {
    const { campaignId, sessionId } = request.params
    if (!sessionExists.get(campaignId, sessionId)) return reply.code(404).send({ message: 'Sessão não encontrada.' })
    return listRevisions.all(sessionId)
  })
  app.put<{ Params: SessionParams; Body: SaveDraft }>(
    sessionPath, { schema: bodySchema(sessionFields) }, (request, reply) => {
      if (!validDate(request.body.date)) return reply.code(400).send({ message: 'Informe uma data válida.' })
      const title = request.body.title.trim()
      if (!title) return reply.code(400).send({ message: 'Informe o título da sessão.' })
      const key = request.headers['idempotency-key']
      if (key !== undefined && (typeof key !== 'string' || !operationIdPattern.test(key))) {
        return reply.code(400).send({ message: 'Chave de gravação inválida.' })
      }
      const result = saveSession.immediate(request.params, { ...request.body, title }, key?.toLowerCase())
      return reply.code(result.status).send(result.session ?? { message: result.message })
    })

  registerQuickNotes(app, db)
  registerWiki(app, db)
  registerSearch(app, db)
  registerExport(app, db)
  registerDocumentTags(app, db)
  return app
}
