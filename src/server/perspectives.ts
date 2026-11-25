import { createHash } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { FastifyInstance } from 'fastify'
import { activeDiscoveries, coverageValues, discoveryKinds, type Coverage, type Discovery, type Knowledge,
  type Perspective, type PerspectiveUpdate } from '../perspectives.ts'

const uuid = { type: 'string', pattern: '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$' }
type Scope = { campaignId: string; id: string }
type Head = { version: number; coverage: Coverage }
type EventRow = Omit<Discovery, 'evidence' | 'session'> & {
  evidenceId: string | null; role: string | null; evidenceSource: string | null
  sessionId: string | null; sessionTitle: string | null; sessionAvailable: number
}

export function registerPerspectives(app: FastifyInstance, db: Database.Database) {
  const info = db.prepare<[string, string], { statement: string; archived_at: string | null }>(`
    SELECT n.statement,c.archived_at FROM narrative_items n JOIN campaigns c ON c.id=n.campaign_id
    WHERE n.campaign_id=? AND n.id=?`)
  const campaign = db.prepare('SELECT 1 FROM campaigns WHERE id=?')
  const character = db.prepare('SELECT 1 FROM documents WHERE campaign_id=? AND id=? AND type=\'character\'')
  const session = db.prepare<[string, string], { title: string }>(
    "SELECT title FROM active_documents WHERE campaign_id=? AND id=? AND type='session'")
  const evidence = db.prepare('SELECT 1 FROM narrative_evidence WHERE campaign_id=? AND item_id=? AND id=?')
  const head = db.prepare<[string, string], Head>('SELECT version,coverage FROM perspective_heads WHERE campaign_id=? AND item_id=?')
  const setHead = db.prepare(`INSERT INTO perspective_heads VALUES (?,?,?,?)
    ON CONFLICT(campaign_id,item_id) DO UPDATE SET version=excluded.version,coverage=excluded.coverage`)
  const append = db.prepare(`INSERT INTO perspective_events (
    campaign_id,item_id,id,version,character_id,kind,evidence_id,session_id,session_title,fictional_date,
    note,statement,replaces_id,coverage,created_at
  ) VALUES (@campaignId,@id,@eventId,@version,@characterId,@kind,@evidenceId,@sessionId,@sessionTitle,@fictionalDate,
    @note,@statement,@replacesId,@coverage,@createdAt)`)
  const receipt = db.prepare<[string, string], { item_id: string; request_hash: string; response: string }>(
    'SELECT item_id, request_hash, response FROM perspective_receipts WHERE campaign_id=? AND operation_id=?')
  const remember = db.prepare('INSERT INTO perspective_receipts VALUES (?,?,?,?,?)')
  const events = db.prepare<[string,string], EventRow>(`
    SELECT p.id,p.version,p.kind,p.character_id AS characterId,d.title AS characterName,p.statement,
      p.evidence_id AS evidenceId,e.role,e.source AS evidenceSource,p.session_id AS sessionId,p.session_title AS sessionTitle,
      EXISTS(SELECT 1 FROM active_documents WHERE id=p.session_id) AS sessionAvailable,
      p.fictional_date AS fictionalDate,p.note,p.replaces_id AS replacesId,p.coverage,p.created_at AS createdAt
    FROM perspective_events p LEFT JOIN documents d ON d.id=p.character_id
    LEFT JOIN narrative_evidence e ON e.campaign_id=p.campaign_id AND e.item_id=p.item_id AND e.id=p.evidence_id
    WHERE p.campaign_id=? AND p.item_id=? ORDER BY p.version`)
  const owned = db.prepare<[string, string | null], { item_id: string }>(`
    SELECT DISTINCT p.item_id FROM perspective_events p
    WHERE p.campaign_id=? AND p.character_id IS ? AND p.kind IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM perspective_events correction WHERE correction.campaign_id=p.campaign_id
        AND correction.item_id=p.item_id AND correction.replaces_id=p.id) ORDER BY p.item_id`)

  function read(campaignId: string, id: string): Perspective {
    const snapshot = head.get(campaignId,id) ?? { version: 0, coverage: 'undefined' as const }
    const history = events.all(campaignId,id).map(({ evidenceId, role, evidenceSource, sessionId, sessionTitle, sessionAvailable, ...row }): Discovery => ({
      ...row,
      evidence: evidenceId && role && evidenceSource ? { id: evidenceId, role, text: JSON.parse(evidenceSource).text } : null,
      session: sessionId ? { id: sessionId, title: sessionTitle ?? '', available: Boolean(sessionAvailable) } : null,
    }))
    return { ...snapshot, player: activeDiscoveries(history).some(({ characterId }) => !characterId), events: history }
  }

  const readSnapshot = db.transaction(read)
  const readKnowledge = db.transaction((campaignId: string, characterId: string | null): Knowledge[] =>
    owned.all(campaignId,characterId).map(({ item_id }) => ({
      id: item_id,
      discoveries: activeDiscoveries(read(campaignId,item_id).events).filter((entry) => entry.characterId === characterId),
    })))

  const commit = db.transaction(({ campaignId, id }: Scope, key: string, input: PerspectiveUpdate) => {
    const { discovery: entry } = input
    const hash = createHash('sha256').update(JSON.stringify([input.version,input.coverage,entry && [
      entry.id,entry.kind,entry.characterId,entry.evidenceId,entry.sessionId,entry.fictionalDate,entry.note,entry.replacesId,
    ]])).digest('hex')
    const previous = receipt.get(campaignId,key)
    if (previous) {
      return previous.item_id === id && previous.request_hash === hash
        ? { status: 200, result: JSON.parse(previous.response) as Perspective }
        : { status: 409, message: 'Chave usada para outra gravação.' }
    }
    const item = info.get(campaignId,id)
    if (!item) return { status: 404, message: 'Informação não encontrada nesta campanha.' }
    if (item.archived_at) return { status: 409, message: 'Reative a campanha para editar perspectivas.' }
    const current = read(campaignId,id)
    if (current.version !== input.version) return { status: 409, message: 'A perspectiva mudou. Compare a versão atual.' }
    if (Boolean(entry) === Boolean(input.coverage)) return { status: 400, message: 'Escolha uma descoberta ou uma declaração.' }
    const active = activeDiscoveries(current.events)
    if (entry?.characterId && !character.get(campaignId,entry.characterId)) {
      return { status: 404, message: 'Personagem não encontrado nesta campanha.' }
    }
    if (entry && (entry.kind === 'evidence') !== Boolean(entry.evidenceId)) {
      return { status: 400, message: 'Selecione a evidência conhecida.' }
    }
    if (entry?.evidenceId && !evidence.get(campaignId,id,entry.evidenceId)) {
      return { status: 404, message: 'Evidência não encontrada nesta informação.' }
    }
    const original = entry?.replacesId ? active.find((event) => event.id === entry.replacesId) : undefined
    if (entry?.replacesId && !original) return { status: 409, message: 'A descoberta já foi corrigida ou não existe.' }
    const source = entry?.sessionId
      ? original?.session?.id === entry.sessionId ? original.session : session.get(campaignId,entry.sessionId)
      : null
    if (entry?.sessionId && !source) return { status: 404, message: 'Sessão de origem indisponível.' }
    const eventId = entry?.id ?? key
    if (current.events.some((event) => event.id === eventId)) return { status: 409, message: 'O UUID do registro já foi usado.' }
    if (input.coverage === 'none' && active.some((event) => event.characterId)) {
      return { status: 409, message: 'Já há personagens com descobertas registradas.' }
    }
    const coverage = input.coverage ?? (entry?.characterId ? 'undefined' : current.coverage)
    const version = input.version + 1
    setHead.run(campaignId,id,version,coverage)
    append.run({ campaignId,id,version,coverage,eventId,characterId:entry?.characterId ?? null,
      kind:entry?.kind ?? null,evidenceId:entry?.evidenceId ?? null,sessionId:entry?.sessionId ?? null,
      sessionTitle:source?.title ?? null,fictionalDate:entry?.fictionalDate?.trim() ?? '',note:entry?.note?.trim() ?? '',
      statement: original ? original.statement : item.statement, replacesId:entry?.replacesId ?? null, createdAt:new Date().toISOString() })
    const result = read(campaignId,id)
    remember.run(campaignId,id,key,hash,JSON.stringify(result))
    return { status: 200, result }
  })

  const root = '/api/campaigns/:campaignId'
  const path = root + '/information/:id/perspectives'
  app.get<{ Params: Scope }>(path, ({ params }, reply) => info.get(params.campaignId,params.id)
    ? readSnapshot(params.campaignId,params.id) : reply.code(404).send({ message:'Informação não encontrada.' }))
  app.get<{ Params: Scope; Querystring: { characterId?: string } }>(root + '/perspectives', ({ params, query }, reply) => {
    if (!campaign.get(params.campaignId) || (query.characterId && !character.get(params.campaignId,query.characterId))) {
      return reply.code(404).send({ message:'Campanha ou personagem não encontrado.' })
    }
    return readKnowledge(params.campaignId,query.characterId ?? null)
  })
  app.put<{ Params: Scope; Body: PerspectiveUpdate }>(path, { schema: { body: {
    type: 'object', additionalProperties: false, required: ['version'],
    properties: {
      version: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER - 1 }, coverage: { enum: coverageValues },
      discovery: { type:'object', required:['id','kind'], additionalProperties:false, properties:{
        id:uuid, kind:{ enum:discoveryKinds }, characterId:uuid, evidenceId:uuid, sessionId:uuid, replacesId:uuid,
        fictionalDate:{ type:'string',maxLength:200 }, note:{ type:'string',maxLength:12000 },
      } },
    },
  } } }, ({ params, body, headers }, reply) => {
    const key = headers['idempotency-key']
    if (typeof key !== 'string' || !new RegExp(uuid.pattern).test(key)) return reply.code(400).send({ message:'Chave inválida.' })
    const result = commit.immediate(params,key,body)
    return reply.code(result.status).send(result.result ?? { message:result.message })
  })
}
