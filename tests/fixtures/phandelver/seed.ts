import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { FastifyInstance } from 'fastify'
import data from './phandelver-fixture.json' with { type: 'json' }
import expected from './resultados-esperados.json' with { type: 'json' }
export { expected }

type Variant = 'complete' | 'load'
const states = new Map([['Aberta', 'open'], ['Em andamento', 'investigating'], ['Concluída', 'resolved'], ['Cancelada', 'discarded']])
const types = new Map([['Pista', 'clue'], ['Pergunta', 'question'], ['Promessa', 'promise'], ['Tarefa', 'task'], ['Outro', 'other']])
const wikiTypes = new Map([['Personagem', 'character'], ['NPC', 'npc'], ['Localidade', 'location']])
const outcomes = new Map([['Confirmada', 'confirmed'], ['Refutada', 'refuted']])

function pdf(text: string) {
  const escape = (line: string) => line.replace(/[\\()]/g, '\\$&')
  const lines = text.match(/.{1,76}(?:\s|$)|.{1,76}/gu) ?? []
  const stream = 'BT /F1 11 Tf 15 TL 42 780 Td ' + lines.map((line) => `(${escape(line.trim())}) Tj T*`).join('\n') + ' ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
  ]
  let document = '%PDF-1.4\n'
  const offsets = objects.map((object, index) => {
    const offset = Buffer.byteLength(document, 'latin1')
    document += `${index + 1} 0 obj\n${object}\nendobj\n`
    return String(offset).padStart(10, '0') + ' 00000 n \n'
  })
  return Buffer.from(document + 'xref\n0 6\n0000000000 65535 f \n' + offsets.join('') +
    `trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${Buffer.byteLength(document, 'latin1')}\n%%EOF\n`, 'latin1')
}

export async function seedPhandelver(app: FastifyInstance, variant: Variant) {
  const ids = (symbol: string) => {
    const hex = createHash('sha256').update(`phv2:${variant}:${symbol}`).digest('hex').slice(0, 32)
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`
  }
  const api = async <T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, payload?: object, key?: string) => {
    const response = await app.inject({ method, url, payload, headers: key ? { 'idempotency-key': ids(key) } : {} })
    if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`${method} ${url} (${response.statusCode}): ${response.body}`)
    return (response.body ? response.json() : undefined) as T
  }
  const get = <T>(url: string) => api<T>('GET', url)
  const campaigns = '/api/campaigns'
  const create = async (name: string) => campaigns + '/' + (await api<{ id: string }>('POST', campaigns, { name })).id
  if ((await get<unknown[]>(campaigns)).length || (await get<unknown[]>(campaigns + '?archived=true')).length) {
    throw new Error('A fixture requer uma instância de teste vazia.')
  }
  const root = await create(variant === 'load' ? data.campaign.title + ' — carga' : data.campaign.title)
  const control = await create('Campanha de controle vazia')
  const small = await create('Campanha pequena com nome propositalmente extenso para validar a largura')
  await api('PUT', root, {
    name: variant === 'load' ? data.campaign.title + ' — carga' : data.campaign.title,
    system: data.campaign.system, rulesVersion: '', gameMaster: '', status: 'active',
    description: data.campaign.simulation, notes: '',
  })
  const sessions = root + '/sessions'
  const wiki = root + '/wiki'
  const session = (number: number) => ids('s' + number)
  for (const row of data.sessions) {
    const fields = { title: row.title, number: row.number, date: row.date, fictionalDate: '',
      participants: '', body: row.notes.join('\n\n') + '\n\n## Registro pessoal\n\n' + row.personal }
    await api('POST', sessions, { id: ids(row.id), ...fields }, row.id + ':create')
    await api('PUT', sessions + '/' + ids(row.id), { ...fields, version: 1, summary: row.summary }, row.id + ':summary')
  }
  await api('POST', small + '/sessions', { date: data.sessions[0].date })
  const wikiNames = new Map(data.wiki.map((row) => [row.id, row.name]))
  for (const row of data.wiki) {
    await api('POST', wiki, { id: ids(row.id), title: row.name, type: wikiTypes.get(row.kind),
      body: row.updates.map(([number, entry]) => `**Sessão ${number}** — ${entry}`).join('\n\n') })
    await api('PUT', sessions + '/' + session(row.first) + '/wiki-links/' + ids(row.id))
  }
  const featured = data.wiki.find((row) => row.featured)
  if (featured) await api('PUT', root + '/featured-character', { id: ids(featured.id) })
  for (const row of data.quests) {
    await api('POST', wiki, { id: ids(row.id), title: row.title, type: 'quest', body: [
      row.description, 'Origem: sessão ' + row.first,
      ...row.history.map(([number, state, note]) => `- Sessão ${number} · ${state} — ${note}`),
      ...row.links.map((symbol) => 'Referência: ' + wikiNames.get(symbol)),
    ].join('\n\n') })
    await api('PUT', sessions + '/' + session(row.first) + '/wiki-links/' + ids(row.id))
    if (row.history.at(-1)?.[1] === 'Concluída') await api('PUT', wiki + '/' + ids(row.id) + '/quest-state', { closed: true })
  }
  const pendings = variant === 'load' ? [...data.pending, ...data.stress] : data.pending
  for (const row of pendings) {
    const url = root + '/pending-items'
    const { state } = await api<{ state: string }>('POST', url, { id: ids(row.id), title: row.title, type: types.get(row.type),
      description: row.description, sessionId: session(row.first), origin: 'Sessão ' + row.first,
      notes: row.history.map(([number, current, note]) => `Sessão ${number} · ${current} — ${note}`).join('\n'),
      entityIds: row.links.map(ids) })
    let previous = state
    for (const [, status] of row.history) {
      const state = states.get(String(status))
      if (!state) throw new Error('Estado de pendência desconhecido: ' + status)
      if (previous !== state) await api('PATCH', url + '/' + ids(row.id) + '/state', { previous, state })
      previous = state
    }
  }
  for (const row of data.information) {
    const url = root + '/information/' + ids(row.id)
    const first = row.events[0]
    const nature = first[1] === 'Hipótese' ? 'theory' : 'report'
    const initial = await api<{ version: number }>('PUT', url, {
      version: 0, statement: row.title, nature, source: { documentId: session(row.first), text: String(first[3]) },
      documents: row.links.map(ids),
    }, row.id + ':create')
    let version = initial.version
    for (const [index, [number, state, detail, source]] of row.events.entries()) {
      const evidenceId = ids(row.id + ':evidence:' + index)
      const origin = { documentId: session(Number(number)), text: String(source) }
      const result = await api<{ version: number }>('PUT', url, { version,
        state: outcomes.get(String(state)) ?? 'open',
        justification: String(detail), decisionEvidenceId: evidenceId,
        evidence: [{ id: evidenceId, role: state === 'Refutada' ? 'contradicts' : state === 'Confirmada' ? 'supports' : 'contextualizes',
          source: { ...origin, text: `${source} — ${detail}` } }],
      }, row.id + ':event:' + index)
      version = result.version
    }
    let perspectiveVersion = 0
    for (const [index, [subject, number]] of row.subjects.entries()) {
      const key = row.id + ':perspective:' + index
      const saved = await api<{ version: number }>('PUT', url + '/perspectives', {
        version: perspectiveVersion, discovery: { id: ids(key), kind: 'heard',
          characterId: subject === 'player' ? undefined : ids(String(subject)), sessionId: session(Number(number)) },
      }, key + ':operation')
      perspectiveVersion = saved.version
    }
  }
  for (const row of data.notes) {
    await api('POST', '/api/quick-notes', { id: ids(row.id), body: row.title + '\n\n' + row.body })
    await api('PUT', '/api/quick-notes/' + ids(row.id) + '/campaign', { campaignId: root.split('/').at(-1) })
    await api('PUT', sessions + '/' + session(row.first) + '/quick-notes/' + ids(row.id))
  }
  for (const row of data.attachments) {
    const content = readFileSync(new URL('anexos/' + row.name, import.meta.url), 'utf8').trimEnd()
    if (content !== row.body.trimEnd()) throw new Error('Anexo divergente: ' + row.name)
    await api('POST', root + '/attachments', { id: ids(row.id), filename: row.name.replace(/\.txt$/, '.pdf'),
      source: `Sessão ${row.first} · ${row.origin}`, data: pdf(content).toString('base64') })
  }

  const [sessionRows, wikiRows, activeQuests, allPending, openPending, information, attachments, notes] = await Promise.all([
    get<{ id: string }[]>(sessions), get<{ type: string }[]>(wiki), get<unknown[]>(wiki + '?openQuests=true'),
    get<unknown[]>(root + '/pending-items'), get<unknown[]>(root + '/pending-items?open=true'),
    get<unknown[]>(root + '/information'), get<unknown[]>(root + '/attachments'), get<unknown[]>(root + '/quick-notes'),
  ])
  const people = (type: string) => wikiRows.filter((row) => row.type === type).length
  const quests = people('quest')
  const extras = variant === 'load' ? data.stress.length : 0
  return { root, control, small, ids, complete: {
    sessoesAtivas: sessionRows.length,
    sessoesRecentes: sessionRows.slice(0, 3).map(({ id }) => data.sessions.find((row) => ids(row.id) === id)?.id),
    missoesTotal: quests, missoesAtivas: activeQuests.length, missoesEncerradas: quests - activeQuests.length,
    pendenciasTotal: allPending.length - extras, pendenciasAbertas: openPending.length - extras,
    pendenciasFechadas: allPending.length - openPending.length,
    personagensJogadores: people('character'), npcs: people('npc'), personagensENpcs: people('character') + people('npc'),
    localidades: people('location'), wikiOriginal: wikiRows.length - quests,
    informacoes: information.length, anexos: attachments.length, notas: notes.length,
  }, load: {
    pendenciasExtras: extras, pendenciasTotal: allPending.length, pendenciasAbertas: openPending.length,
    pendenciasFechadas: allPending.length - openPending.length, paginasAbertasComOito: Math.ceil(openPending.length / 8),
  } }
}
