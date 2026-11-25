import { createHash } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { assessmentError, assessments, evidenceRoles, natures, type NarrativeUpdate, type Source, type SourceInput,
  type NarrativeDetail, type NarrativeSummary } from '../narrative.ts'

const uuid = { type: 'string', pattern: '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' }
const text = { type: 'string', maxLength: 12000 }
const sourceSchema = { type: 'object', additionalProperties: false, properties: { documentId: uuid, text } }
type Scope = { campaignId: string; id: string }
type Stored<T> = Omit<T, 'source'> & { source: string }
class Invalid extends Error {
  readonly status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value !== null && typeof value === 'object') {
    return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => JSON.stringify(key) + ':' + canonical(entry)).join(',') + '}'
  }
  return JSON.stringify(value)
}

export function registerNarrative(app: FastifyInstance, db: Database.Database) {
  const campaign = db.prepare<[string], { archived_at: string | null }>('SELECT archived_at FROM campaigns WHERE id = ?')
  const columns = 'id, statement, nature, state, source, version, created_at AS createdAt, updated_at AS updatedAt'
  const find = db.prepare<[string, string], Stored<NarrativeSummary>>(`SELECT ${columns} FROM narrative_items WHERE campaign_id = ? AND id = ?`)
  const list = db.prepare(`SELECT ${columns} FROM narrative_items WHERE campaign_id = @campaignId
    AND (@nature IS NULL OR nature = @nature) AND (@state IS NULL OR state = @state) ORDER BY updated_at DESC, id`)
  const document = db.prepare<[string, string], { id: string; title: string; type: string; body: string; revision: number | null; available: number }>(`
    SELECT d.id, d.title, d.type, d.body, (SELECT max(version) FROM session_revisions WHERE document_id = d.id) AS revision,
      EXISTS(SELECT 1 FROM active_documents WHERE id = d.id) AS available
    FROM documents d WHERE d.campaign_id = ? AND d.id = ? AND d.type <> 'quick_note'`)
  const pending = db.prepare<[string, string], { id: string; title: string }>('SELECT id, title FROM pending_items WHERE campaign_id = ? AND id = ?')
  const readEvidence = db.prepare<[string, string], Stored<NarrativeDetail['evidence'][number]>>(`
    SELECT id, role, source, replaces_id AS replacesId FROM narrative_evidence
    WHERE campaign_id = ? AND item_id = ? ORDER BY rowid`)
  const history = db.prepare<[string, string], Stored<NarrativeDetail['history'][number]>>(`
    SELECT version, statement, nature, state, justification, source, decision_evidence_id AS decisionEvidenceId, created_at AS createdAt
    FROM narrative_history WHERE campaign_id = ? AND item_id = ? ORDER BY version`)
  const documents = db.prepare<[string, string], { document_id: string }>('SELECT document_id FROM narrative_document_links WHERE campaign_id = ? AND item_id = ?')
  const pendings = db.prepare<[string, string], { pending_id: string }>('SELECT pending_id FROM narrative_pending_links WHERE campaign_id = ? AND item_id = ?')
  const put = db.prepare(`INSERT INTO narrative_items(campaign_id,id,statement,nature,state,source,version,created_at,updated_at)
    VALUES(@campaignId,@id,@statement,@nature,@state,@source,@version,@now,@now)
    ON CONFLICT(campaign_id,id) DO UPDATE SET statement=excluded.statement,nature=excluded.nature,
      state=excluded.state,version=excluded.version,updated_at=excluded.updated_at`)
  const record = db.prepare('INSERT INTO narrative_history VALUES (?,?,?,?,?,?,?,?,?,?)')
  const addEvidence = db.prepare('INSERT INTO narrative_evidence VALUES (?,?,?,?,?,?,?)')
  const linkDocument = db.prepare('INSERT INTO narrative_document_links VALUES (?,?,?) ON CONFLICT DO NOTHING')
  const linkPending = db.prepare('INSERT INTO narrative_pending_links VALUES (?,?,?) ON CONFLICT DO NOTHING')
  const receipt = db.prepare<[string, string], { item_id: string; request_hash: string; response: string }>(
    'SELECT item_id, request_hash, response FROM narrative_save_receipts WHERE campaign_id=? AND operation_id=?')
  const remember = db.prepare('INSERT INTO narrative_save_receipts VALUES (?,?,?,?,?)')

  function capture(campaignId: string, input: SourceInput | undefined, now: string): Source {
    const text = input?.text?.trim() ?? ''
    if (!input?.documentId) return { kind: text ? 'manual' : 'direct', text, capturedAt: now }
    const target = document.get(campaignId, input.documentId)
    if (!target?.available) throw new Invalid(404, 'Documento de origem indisponível nesta campanha.')
    return { kind: 'document', documentId: target.id, type: target.type, title: target.title,
      revision: target.revision ?? undefined, text: text || target.body.slice(0, 240) || target.title, capturedAt: now }
  }

  function decode<T>(campaignId: string, row: Stored<T>) {
    const source = JSON.parse(row.source) as Source
    if (source.documentId) source.available = Boolean(document.get(campaignId, source.documentId)?.available)
    return { ...row, source }
  }

  const detail = db.transaction((campaignId: string, id: string): NarrativeDetail | undefined => {
    const item = find.get(campaignId, id)
    if (!item) return
    return { ...decode(campaignId, item),
      evidence: readEvidence.all(campaignId, id).map((row) => decode(campaignId, row)),
      history: history.all(campaignId, id).map((row) => decode(campaignId, row)),
      documents: documents.all(campaignId, id).flatMap(({ document_id }) => {
        const row = document.get(campaignId, document_id)
        return row ? [{ id: row.id, title: row.title, type: row.type, available: Boolean(row.available) }] : []
      }),
      pending: pendings.all(campaignId, id).flatMap(({ pending_id }) => pending.get(campaignId, pending_id) ?? []),
    }
  })

  const save = db.transaction(({ campaignId, id }: Scope, key: string, input: NarrativeUpdate) => {
    const hash = createHash('sha256').update(canonical(input)).digest('hex')
    const previous = receipt.get(campaignId, key)
    if (previous) {
      if (previous.item_id !== id || previous.request_hash !== hash) throw new Invalid(409, 'Chave usada para outra gravação.')
      return JSON.parse(previous.response) as { status: number; item: NarrativeDetail }
    }
    const owner = campaign.get(campaignId)
    if (!owner) throw new Invalid(404, 'Campanha não encontrada.')
    if (owner.archived_at) throw new Invalid(409, 'Reative a campanha para editar informações.')
    const current = find.get(campaignId, id)
    if ((current?.version ?? 0) !== input.version) throw new Invalid(409, 'A informação foi alterada. Compare a versão atual.')
    const statement = input.statement?.trim() ?? current?.statement
    const nature = input.nature ?? current?.nature
    if (!statement || !nature) throw new Invalid(400, 'Informe o enunciado e a natureza.')
    if ((!current && input.state && input.state !== 'open') || (current && input.source)) {
      throw new Invalid(400, 'A origem inicial e o estado de criação são preservados.')
    }
    const state = input.state ?? current?.state ?? 'open'
    const now = new Date().toISOString()
    const version = input.version + 1
    const origin = current?.source ?? JSON.stringify(capture(campaignId, input.source, now))
    put.run({ campaignId, id, statement, nature, state, source: origin, version, now })

    for (const entry of input.evidence ?? []) {
      const source = capture(campaignId, entry.source, now)
      if (source.kind === 'direct') throw new Invalid(400, 'Informe uma descrição ou fonte da evidência.')
      const existing = readEvidence.all(campaignId, id)
      if (existing.some((item) => item.id === entry.id || (entry.replacesId && item.replacesId === entry.replacesId)) ||
          (entry.replacesId && !existing.some((item) => item.id === entry.replacesId))) {
        throw new Invalid(409, 'A evidência já foi registrada ou corrigida.')
      }
      addEvidence.run(campaignId, id, entry.id, entry.role, JSON.stringify(source), entry.replacesId ?? null, now)
    }
    for (const target of input.documents ?? []) {
      if (!document.get(campaignId, target)?.available) throw new Invalid(404, 'Documento não encontrado nesta campanha.')
      linkDocument.run(campaignId, id, target)
    }
    for (const target of input.pending ?? []) {
      if (!pending.get(campaignId, target)) throw new Invalid(404, 'Pendência não encontrada nesta campanha.')
      linkPending.run(campaignId, id, target)
    }
    const evidence = input.decisionEvidenceId && readEvidence.all(campaignId, id).find((row) => row.id === input.decisionEvidenceId)
    if (input.decisionEvidenceId && !evidence) throw new Invalid(400, 'Selecione uma evidência desta informação.')
    const decision = input.decisionSource ? capture(campaignId, input.decisionSource, now)
      : evidence ? JSON.parse(evidence.source) as Source : JSON.parse(origin) as Source
    const justification = input.justification?.trim() ?? ''
    const problem = assessmentError(current?.state ?? 'open', state, justification, decision.kind !== 'direct')
    if (problem) throw new Invalid(400, problem)
    if (!current || statement !== current.statement || nature !== current.nature || state !== current.state) {
      record.run(campaignId, id, version, statement, nature, state, justification, JSON.stringify(decision), input.decisionEvidenceId ?? null, now)
    }
    const result = { status: current ? 200 : 201, item: detail(campaignId, id)! }
    remember.run(campaignId, id, key, hash, JSON.stringify(result))
    return result
  })

  const path = '/api/campaigns/:campaignId/information'
  app.get<{ Params: Scope; Querystring: { nature?: string; state?: string } }>(path, ({ params, query }, reply) =>
    campaign.get(params.campaignId) ? (list.all({ campaignId: params.campaignId, nature: query.nature ?? null,
      state: query.state ?? null }) as Stored<NarrativeSummary>[]).map((row) => decode(params.campaignId, row))
      : reply.code(404).send({ message: 'Campanha não encontrada.' }))
  app.get<{ Params: Scope }>(path + '/:id', ({ params }, reply) =>
    detail(params.campaignId, params.id) ?? reply.code(404).send({ message: 'Informação não encontrada.' }))
  app.put<{ Params: Scope; Body: NarrativeUpdate }>(path + '/:id', { schema: { body: {
    type: 'object', required: ['version'], additionalProperties: false,
    properties: {
      version: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER - 1 },
      statement: text, nature: { enum: natures }, state: { enum: assessments },
      source: sourceSchema, justification: text, decisionSource: sourceSchema, decisionEvidenceId: uuid,
      documents: { type: 'array', maxItems: 50, items: uuid }, pending: { type: 'array', maxItems: 50, items: uuid },
      evidence: { type: 'array', maxItems: 20, items: { type: 'object', additionalProperties: false,
        required: ['id', 'role', 'source'], properties: { id: uuid, role: { enum: evidenceRoles },
          source: sourceSchema, replacesId: uuid } } },
    },
  } } }, ({ params, body, headers }, reply) => {
    const pattern = new RegExp(uuid.pattern)
    const key = headers['idempotency-key']
    if (typeof key !== 'string' || !pattern.test(key) || !pattern.test(params.id)) {
      return reply.code(400).send({ message: 'Identificador ou chave de gravação inválidos.' })
    }
    try {
      const result = save.immediate(params, key, body)
      return reply.code(result.status).send(result.item)
    } catch (failure) {
      if (failure instanceof Invalid) return reply.code(failure.status).send({ message: failure.message })
      throw failure
    }
  })
}
