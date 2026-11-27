import { usePendingNavigation } from './navigation-guard.tsx'
import { useEffect, useRef, useState } from 'react'
import type { NarrativeDetail } from '../narrative.ts'
import { activeDiscoveries, discoveryKinds, knowledgeLabel, type Discovery, type DiscoveryInput,
  type Knowledge, type Perspective, type PerspectiveUpdate } from '../perspectives.ts'
import { api, ApiError } from './api.ts'
import { claimNarrativeDraft, draftRequest } from './narrative-drafts.ts'

type Target = { id: string; title: string; type: string }
type Draft = {
  key: string; campaignId: string; itemId: string; update: PerspectiveUpdate
  operation?: { key: string; payload: PerspectiveUpdate }
}
const database = 'lorekeeper-perspectives'
const kinds = { heard: 'Ouviu a afirmação', contested: 'Soube da contestação', evidence: 'Conheceu evidência' }
const roles: Record<string,string> = { supports: 'Sustenta', contradicts: 'Contradiz', contextualizes: 'Contextualiza' }

function DiscoveryText({ row, onSession }: { row: Discovery; onSession?: (id: string) => void }) {
  return <>
    <p>{row.kind ? kinds[row.kind] : row.coverage === 'none' ? 'Ausência de personagens declarada' : 'Cobertura ainda não definida'}
      {' · '}{new Date(row.createdAt).toLocaleString('pt-BR')}</p>
    {row.kind && <p>{row.statement}</p>}
    {row.evidence && <p>{roles[row.evidence.role]} · {row.evidence.text}</p>}
    {row.session && (row.session.available && onSession
      ? <button className="quiet" onClick={() => onSession(row.session!.id)}>{row.session.title}</button>
      : <p>{row.session.title}{!row.session.available && ' · Origem temporariamente indisponível'}</p>)}
    {row.fictionalDate && <p>Data ficcional · {row.fictionalDate}</p>}
    {row.note && <p>{row.note}</p>}
  </>
}

export function KnowledgeView({ root, characters, onOpen, onSession, onClose }: {
  root: string; characters: Target[]; onOpen: (id: string) => void; onSession: (id: string) => void; onClose: () => void
}) {
  const [subject, setSubject] = useState('')
  const [data, setData] = useState<{ key: string; rows: Knowledge[] } | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([root, subject, attempt])
  const heading = characters.find(({ id }) => id === subject)?.title
  useEffect(() => {
    let active = true
    const url = root + '/perspectives' + (subject ? '?characterId=' + encodeURIComponent(subject) : '')
    void api<Knowledge[]>(url).then(
      (rows) => { if (active) { setData({ key, rows }); setFailure(null) } },
      () => { if (active) setFailure(key) },
    )
    return () => { active = false }
  }, [root, subject, key])
  const rows = data?.key === key ? data.rows : null
  return <section className="panel" aria-label="Consulta de conhecimento">
    <h2>{heading ? `O que ${heading} sabe` : 'Conhecimento do jogador'}</h2>
    <p>Descobertas atribuídas explicitamente a esta perspectiva.</p>
    <label>Consultar por<select value={subject} onChange={(event) => {
      setData(null)
      setFailure(null)
      setSubject(event.currentTarget.value)
    }}>
      <option value="">Jogador</option>
      {characters.map((actor) => <option key={actor.id} value={actor.id}>{actor.title}</option>)}
    </select></label>
    {failure === key ? <>
      <p role="alert">Não foi possível carregar esta perspectiva.</p>
      <button onClick={() => setAttempt((value) => value + 1)}>Tentar carregar novamente</button>
    </> : !rows ? <p role="status">Carregando perspectiva…</p>
      : rows.length === 0 ? <p role="status">Nenhuma atribuição registrada.</p> :
        rows.map((row) => <article key={row.id} className="panel">
          <h3>{row.discoveries[0].statement}</h3>
          <ol>{row.discoveries.map((entry) => <li key={entry.id}><DiscoveryText row={entry} onSession={onSession} /></li>)}</ol>
          <button onClick={() => onOpen(row.id)}>Abrir informação global</button>
        </article>)}
    <button className="quiet" onClick={onClose}>Fechar consulta</button>
  </section>
}

export function PerspectivePanel({ campaignId, item, targets, archived, onEditing, onSession }: {
  campaignId: string; item: NarrativeDetail; targets: Target[]; archived: boolean
  onEditing: (value: boolean) => void; onSession: (id: string) => void
}) {
  const url = `/api/campaigns/${campaignId}/information/${item.id}/perspectives`
  const [view, setView] = useState<Perspective | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [recoverable, setRecoverable] = useState<Draft[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  usePendingNavigation(busy ? { label: 'Operação de perspectiva em andamento', blocked: true }
    : draft ? { label: 'Perspectiva ainda não confirmada', blocked: Boolean(draft.operation) && !conflict,
      keep: status === 'Rascunho protegido neste navegador',
      discard: status === 'Falha no armazenamento local' && !draft.operation ? true : undefined } : null)

  const current = useRef<Draft | null>(null)
  const release = useRef<(() => void) | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    let active = true
    void api<Perspective>(url).then((data) => { if (active) setView(data) }, () => {
      if (active) setError('Não foi possível carregar as perspectivas.')
    })
    return () => { active = false }
  }, [url, refresh])
  useEffect(() => {
    let active = true
    void draftRequest<Draft[]>('readonly', (store) => store.index('campaign').getAll(campaignId), database).then(
      (rows) => { if (active) setRecoverable(rows.filter((row) => row.itemId === item.id)) }, () => {},
    )
    return () => { active = false }
  }, [campaignId, item.id, refresh])
  useEffect(() => () => {
    void queue.current.finally(() => release.current?.())
    onEditing(false)
  }, [onEditing])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (current.current && status !== 'Rascunho protegido neste navegador') event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  function adopt(next: Draft | null) {
    current.current = next
    setDraft(next)
    onEditing(Boolean(next))
  }
  function persist(next: Draft | null, key: string) {
    const operation = queue.current.then(async () => {
      if (next) await draftRequest('readwrite', (store) => store.put(next), database)
      else await draftRequest('readwrite', (store) => store.delete(key), database)
    })
    queue.current = operation.catch(() => {})
    return operation
  }
  function protect(next: Draft) {
    adopt(next)
    setStatus('Protegendo rascunho…')
    void persist(next, next.key).then(
      () => { if (current.current === next) setStatus('Rascunho protegido neste navegador') },
      () => { if (current.current === next) setStatus('Falha no armazenamento local') },
    )
  }
  async function begin(update: PerspectiveUpdate, saved?: Draft) {
    const key = saved?.key ?? crypto.randomUUID()
    let lock: (() => void) | null = null
    setBusy(true)
    setError('')
    try {
      lock = await claimNarrativeDraft('perspective:' + key)
      if (!lock) throw new Error('O rascunho está em uso em outra aba.')
      const old = saved ? await draftRequest<Draft | undefined>('readonly', (store) => store.get(key), database) : undefined
      if (saved && (!old || old.campaignId !== campaignId || old.itemId !== item.id)) throw new Error('Rascunho indisponível.')
      release.current = lock
      lock = null
      protect(old ?? { key, campaignId, itemId: item.id, update })
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível abrir o rascunho.') }
    finally { lock?.(); setBusy(false) }
  }
  async function save() {
    if (!draft || busy || conflict) return
    const operation = draft.operation ?? { key: crypto.randomUUID(), payload: draft.update }
    const prepared = { ...draft, operation }
    setBusy(true)
    setError('')
    setStatus('Confirmando gravação…')
    try {
      await persist(prepared, draft.key)
      adopt(prepared)
    } catch {
      setStatus('Falha no armazenamento local')
      setBusy(false)
      return
    }
    try {
      const response = await api<Perspective>(url, 'PUT', operation.payload, { 'Idempotency-Key': operation.key })
      await persist(null, draft.key)
      setView(response)
      adopt(null)
      release.current?.()
      release.current = null
      setRecoverable((rows) => rows.filter(({ key }) => key !== draft.key))
      setStatus('Salvo no servidor')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível confirmar.')
      setStatus('Rascunho protegido neste navegador')
      if (failure instanceof ApiError && failure.status >= 400 && failure.status < 500) {
        protect({ ...draft, operation: undefined })
        if (failure.status === 409) {
          const latest = await api<Perspective>(url).catch(() => null)
          if (latest && latest.version !== draft.update.version) {
            setView(latest)
            setConflict(true)
          }
        }
      }
    } finally { setBusy(false) }
  }
  function closeDraft() {
    release.current?.()
    release.current = null
    adopt(null)
    setConflict(false)
    setStatus('')
    setError('')
    setRefresh((value) => value + 1)
  }
  async function cancel() {
    if (!draft || draft.operation) return
    setBusy(true)
    try {
      await persist(null, draft.key)
      closeDraft()
    } catch { setStatus('Falha no armazenamento local') }
    finally { setBusy(false) }
  }
  function edit(next: Partial<DiscoveryInput>) {
    if (draft?.update.discovery && !draft.operation) {
      protect({ ...draft, update: { ...draft.update, discovery: { ...draft.update.discovery, ...next } } })
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type:'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'rascunho-perspectiva.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const characters = targets.filter(({ type }) => type === 'character')
  const sessions = targets.filter(({ type }) => type === 'session')
  const active = view ? activeDiscoveries(view.events) : []
  const characterCount = new Set(active.flatMap((row) => row.characterId ?? [])).size
  const entry = draft?.update.discovery
  return <section className="panel" aria-label="Perspectivas">
    <h3>Perspectivas</h3>
    {error && <p role="alert" className="error">{error}</p>}
    {status && <p role="status">{status}</p>}
    {!view ? <button onClick={() => setRefresh((value) => value + 1)}>Carregar perspectivas</button> : <>
      <p>{knowledgeLabel(view.player, view.coverage, characterCount)}</p>
      {!view.player && view.coverage === 'none' && <p>Ausência de personagens declarada.</p>}
      {!archived && !draft && <div className="actions">
        <button disabled={busy} onClick={() => void begin({ version:view.version, discovery:{ id:crypto.randomUUID(),kind:'heard' } })}>
          Registrar conhecimento do jogador</button>
        <button disabled={busy || !characters.length} onClick={() => void begin({ version:view.version,
          discovery:{ id:crypto.randomUUID(),characterId:'',kind:'heard' } })}>Registrar descoberta</button>
        {characterCount === 0 && <button disabled={busy} onClick={() => void begin({ version:view.version,
          coverage:view.coverage === 'none' ? 'undefined' : 'none' })}>
          {view.coverage === 'none' ? 'Voltar a cobertura para indefinida' : 'Declarar ausência de personagens'}</button>}
        {recoverable.map((saved) => <button key={saved.key} disabled={busy} onClick={() => void begin(saved.update,saved)}>
          Recuperar rascunho de perspectiva</button>)}
      </div>}
      {view.events.length ? <ol>{view.events.map((row) => {
        const replaced = row.kind !== null && !active.some((event) => event.id === row.id)
        return <li key={row.id}>
          {row.kind && <strong>{row.characterName ?? 'Jogador'}{replaced && ' · Substituída'}{row.replacesId && ' · Correção'}</strong>}
          <DiscoveryText row={row} onSession={draft ? undefined : onSession} />
          {!archived && !draft && row.kind && !replaced && <button disabled={busy} onClick={() => void begin({ version:view.version,
            discovery:{ id:crypto.randomUUID(), characterId:row.characterId ?? undefined, kind:row.kind!,
              evidenceId:row.evidence?.id, sessionId:row.session?.id,
              fictionalDate:row.fictionalDate, note:row.note, replacesId:row.id } })}>Corrigir descoberta</button>}
        </li>
      })}</ol> : <p>Nenhuma descoberta atribuída.</p>}
    </>}
    {draft && <form aria-label="Rascunho de perspectiva" onSubmit={(event) => { event.preventDefault(); void save() }}>
      {conflict && view && <>
        <p>Compare o registro confirmado acima com seu rascunho.</p>
        <button type="button" onClick={() => {
          protect({ ...draft, update:{ ...draft.update,version:view.version } })
          setConflict(false)
          setError('')
        }}>Usar perspectiva atual como base</button>
      </>}
      <fieldset className="form-grid" disabled={busy || Boolean(draft.operation)}>
        {entry ? <>
          <label>Personagem<select aria-label="Personagem" required value={entry.characterId ?? 'player'}
            onChange={(event) => edit({ characterId:event.currentTarget.value === 'player' ? undefined : event.currentTarget.value })}>
            <option value="">Selecione um personagem</option>
            <option value="player">Jogador</option>
            {characters.map((actor) => <option key={actor.id} value={actor.id}>{actor.title}</option>)}
          </select></label>
          <label>Tipo de descoberta<select value={entry.kind} onChange={(event) => edit({
            kind:event.currentTarget.value as DiscoveryInput['kind'],evidenceId:undefined,
          })}>{discoveryKinds.map((kind) => <option key={kind} value={kind}>{kinds[kind]}</option>)}</select></label>
          {entry.kind === 'evidence' && <label>Evidência conhecida<select required value={entry.evidenceId ?? ''}
            onChange={(event) => edit({ evidenceId:event.currentTarget.value || undefined })}>
            <option value="">Selecione uma evidência</option>
            {item.evidence.map((row) => <option key={row.id} value={row.id}>{roles[row.role]} · {row.source.text}</option>)}
          </select></label>}
          <label>Sessão da descoberta<select value={entry.sessionId ?? ''}
            onChange={(event) => edit({ sessionId:event.currentTarget.value || undefined })}>
            <option value="">Sem sessão vinculada</option>
            {entry.sessionId && !sessions.some(({ id }) => id === entry.sessionId) &&
              <option value={entry.sessionId}>Manter sessão de origem indisponível</option>}
            {sessions.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
          </select></label>
          <label>Data ficcional<input maxLength={200} value={entry.fictionalDate ?? ''}
            onChange={(event) => edit({ fictionalDate:event.currentTarget.value })} /></label>
          <label>Origem ou observação<textarea maxLength={12000} value={entry.note ?? ''}
            onChange={(event) => edit({ note:event.currentTarget.value })} /></label>
        </> : <p>{draft.update.coverage === 'none' ? 'Declarar que nenhum personagem tem descoberta registrada.' : 'Deixar a cobertura ainda não definida.'}</p>}
      </fieldset>
      <div className="actions">
        <button className="primary" disabled={busy || conflict}>{draft.operation ? 'Reenviar perspectiva' : 'Salvar perspectiva'}</button>
        <button type="button" disabled={busy || Boolean(draft.operation)} onClick={() => void cancel()}>Cancelar perspectiva</button>
        {status === 'Rascunho protegido neste navegador' &&
          <button type="button" disabled={busy} onClick={closeDraft}>Fechar mantendo rascunho</button>}
        {status === 'Falha no armazenamento local' && <>
          <button type="button" onClick={download}>Baixar rascunho de perspectiva</button>
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm('As alterações desta aba podem ser perdidas. Sair da edição?')) closeDraft()
          }}>Sair da edição</button>
        </>}
      </div>
    </form>}
  </section>
}
