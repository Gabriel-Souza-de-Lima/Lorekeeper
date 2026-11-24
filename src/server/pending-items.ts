import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { pendingStates, pendingTypes, type PendingFields, type PendingItem, type PendingItemSummary, type PendingState, type PendingType } from '../contracts.ts'

type Params = { campaignId: string }
type ItemParams = Params & { id: string }
type Input = {
  id: string
  title: string
  type?: PendingType
  description?: string
  origin?: string
  notes?: string
  sessionId?: string | null
  entityIds?: string[]
}
type Row = Omit<PendingItem, 'entityIds' | 'history'>
const uuid = { type: 'string', pattern: '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' }
const text = { type: 'string' }
const fields = { title: text, type: { type: 'string', enum: pendingTypes }, description: text,
  origin: text, notes: text, sessionId: { anyOf: [uuid, { type: 'null' }] },
  entityIds: { type: 'array', maxItems: 50, items: uuid } }
type Edit = PendingFields & { editVersion: number }

function sameFields(current: PendingFields, values: PendingFields) {
  return current.title === values.title && current.type === values.type &&
    current.description === values.description && current.origin === values.origin &&
    current.notes === values.notes && current.sessionId === values.sessionId &&
    current.entityIds.length === values.entityIds.length &&
    current.entityIds.every((value, index) => value === values.entityIds[index])
}

function entityIds(input: string[] = []) {
  return [...new Set(input.map((id) => id.toLowerCase()))].sort()
}

const state = { type: 'string', enum: pendingStates }

export function registerPendingItems(app: FastifyInstance, db: Database.Database) {
  const campaign = db.prepare<[string], { archivedAt: string | null }>(
    'SELECT archived_at AS archivedAt FROM campaigns WHERE id = ?',
  )
  const list = db.prepare<[string, number], PendingItemSummary>(`
    SELECT id, title, type, state FROM pending_items
    WHERE campaign_id = ? AND (? = 0 OR state IN ('open', 'investigating'))
    ORDER BY updated_at DESC, id`)
  const item = db.prepare<[string, string], Row>(`
    SELECT id, title, type, state, description, origin, notes, session_id AS sessionId,
      created_at AS createdAt, updated_at AS updatedAt, edit_version AS editVersion
    FROM pending_items WHERE campaign_id = ? AND id = ?`)
  const entities = db.prepare<[string], string>('SELECT document_id FROM pending_item_entities WHERE item_id = ? AND removed_at IS NULL ORDER BY document_id').pluck()
  const history = db.prepare<[string], PendingItem['history'][number]>(`
    SELECT state, created_at AS createdAt FROM pending_item_states WHERE item_id = ? ORDER BY id`)
  const session = db.prepare(`
    SELECT 1 FROM active_documents WHERE campaign_id = ? AND id = ? AND type = 'session'`)
  const entity = db.prepare(`
    SELECT 1 FROM documents WHERE campaign_id = ? AND id = ? AND type IN ('npc', 'location')`)
  const insert = db.prepare(`
    INSERT INTO pending_items (id, campaign_id, session_id, title, type, description, origin, notes, state, created_at, updated_at)
    VALUES (@id, @campaignId, @sessionId, @title, @type, @description, @origin, @notes, 'open', @now, @now)
    ON CONFLICT (id) DO NOTHING`)
  const relate = db.prepare('INSERT INTO pending_item_entities (item_id, document_id) VALUES (?, ?)')
  const link = db.prepare(`
    INSERT INTO pending_item_entities (item_id, document_id) VALUES (?, ?)
    ON CONFLICT (item_id, document_id) DO UPDATE SET removed_at = NULL`)
  const unlink = db.prepare('UPDATE pending_item_entities SET removed_at = ? WHERE item_id = ? AND document_id = ?')
  const updateFields = db.prepare(`
    UPDATE pending_items SET title = @title, type = @type, description = @description,
      origin = @origin, notes = @notes, session_id = @sessionId,
      edit_version = edit_version + 1, updated_at = @now WHERE id = @id`)
  const record = db.prepare('INSERT INTO pending_item_states (item_id, state, created_at) VALUES (?, ?, ?)')
  const update = db.prepare('UPDATE pending_items SET state = ?, updated_at = ? WHERE id = ?')

  function details(row: Row): PendingItem {
    return { ...row, entityIds: entities.all(row.id), history: history.all(row.id) }
  }

  const read = db.transaction((campaignId: string, id: string) => {
    const row = item.get(campaignId, id)
    return row ? details(row) : null
  })

  const create = db.transaction((campaignId: string, input: Input) => {
    const target = campaign.get(campaignId)
    if (!target) return { status: 404, message: 'Campanha não encontrada.' }
    if (target.archivedAt) return { status: 409, message: 'Reative a campanha antes de cadastrar pendências.' }
    const id = input.id.toLowerCase()
    const values = {
      id, campaignId, sessionId: input.sessionId?.toLowerCase() ?? null, title: input.title,
      type: input.type ?? 'other', description: input.description ?? '', origin: input.origin ?? '', notes: input.notes ?? '',
    }
    const ids = entityIds(input.entityIds)
    const existing = item.get(campaignId, id)
    if (existing) {
      const current = details(existing)
      return sameFields(current, { ...values, entityIds: ids })
        ? { status: 200, item: current } : { status: 409, message: 'O identificador já foi usado.' }
    }
    if ((values.sessionId && !session.get(campaignId, values.sessionId)) ||
        ids.some((value) => !entity.get(campaignId, value))) {
      return { status: 404, message: 'Sessão ou entidade não encontrada nesta campanha.' }
    }
    const now = new Date().toISOString()
    if (!insert.run({ ...values, now }).changes) return { status: 409, message: 'O identificador já foi usado.' }
    for (const value of ids) relate.run(id, value)
    record.run(id, 'open', now)
    return { status: 201, item: details(item.get(campaignId, id)!) }
  })

  const edit = db.transaction((campaignId: string, id: string, input: Edit) => {
    const row = item.get(campaignId, id)
    if (!row) return { status: 404, message: 'Pendência não encontrada.' }
    if (campaign.get(campaignId)?.archivedAt) return { status: 409, message: 'Reative a campanha para editar pendências.' }
    const current = details(row)
    const values = { ...input, sessionId: input.sessionId?.toLowerCase() ?? null, entityIds: entityIds(input.entityIds) }
    if (sameFields(current, values)) return { status: 200, item: current }
    if (current.editVersion !== input.editVersion) return { status: 409, message: 'A pendência foi editada em outro dispositivo.' }
    if ((values.sessionId && values.sessionId !== current.sessionId && !session.get(campaignId, values.sessionId)) ||
        values.entityIds.some((value) => !entity.get(campaignId, value))) {
      return { status: 404, message: 'Sessão ou entidade não encontrada nesta campanha.' }
    }
    const now = new Date().toISOString()
    updateFields.run({ ...values, id, now })
    for (const value of current.entityIds) if (!values.entityIds.includes(value)) unlink.run(now, id, value)
    for (const value of values.entityIds) if (!current.entityIds.includes(value)) link.run(id, value)
    return { status: 200, item: details(item.get(campaignId, id)!) }
  })

  const changeState = db.transaction((campaignId: string, id: string, previous: PendingState, next: PendingState) => {
    const current = item.get(campaignId, id)
    if (!current) return { status: 404, message: 'Pendência não encontrada.' }
    if (campaign.get(campaignId)?.archivedAt) return { status: 409, message: 'Reative a campanha para alterar pendências.' }
    if (current.state === next) return { status: 200, item: details(current) }
    if (current.state !== previous) return { status: 409, message: 'O estado mudou. Reabra a pendência antes de alterar.' }
    const now = new Date().toISOString()
    update.run(next, now, id)
    record.run(id, next, now)
    return { status: 200, item: details({ ...current, state: next, updatedAt: now }) }
  })

  const path = '/api/campaigns/:campaignId/pending-items'
  app.get<{ Params: Params; Querystring: { open?: string } }>(path, ({ params, query }, reply) =>
    campaign.get(params.campaignId) ? list.all(params.campaignId, Number(query.open === 'true'))
      : reply.code(404).send({ message: 'Campanha não encontrada.' }))
  app.get<{ Params: ItemParams }>(`${path}/:id`, ({ params }, reply) => {
    return read(params.campaignId, params.id.toLowerCase()) ?? reply.code(404).send({ message: 'Pendência não encontrada.' })
  })
  app.post<{ Params: Params; Body: Input }>(path, { schema: { body: {
    type: 'object', required: ['id', 'title'], additionalProperties: false,
    properties: { id: uuid, ...fields },
  } } }, ({ params, body }, reply) => {
    const title = body.title.trim()
    if (!title) return reply.code(400).send({ message: 'Informe o título da pendência.' })
    const result = create.immediate(params.campaignId, { ...body, title })
    return reply.code(result.status).send(result.item ?? { message: result.message })
  })
  app.put<{ Params: ItemParams; Body: Edit }>(`${path}/:id`, { schema: { body: {
    type: 'object', required: ['editVersion', ...Object.keys(fields)], additionalProperties: false,
    properties: { ...fields, editVersion: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } },
  } } }, ({ params, body }, reply) => {
    const title = body.title.trim()
    if (!title) return reply.code(400).send({ message: 'Informe o título da pendência.' })
    const result = edit.immediate(params.campaignId, params.id.toLowerCase(), { ...body, title })
    return reply.code(result.status).send(result.item ?? { message: result.message })
  })
  app.patch<{ Params: ItemParams; Body: { previous: PendingState; state: PendingState } }>(`${path}/:id/state`, {
    schema: { body: { type: 'object', required: ['previous', 'state'], additionalProperties: false,
      properties: { previous: state, state } } },
  }, ({ params, body }, reply) => {
    const result = changeState.immediate(params.campaignId, params.id.toLowerCase(), body.previous, body.state)
    return reply.code(result.status).send(result.item ?? { message: result.message })
  })
}
