import { useLeave, usePendingNavigation } from './navigation-guard.tsx'
import { KnowledgeView, PerspectivePanel } from './perspectives.tsx'
import { useEffect, useRef, useState } from 'react'
import type { Campaign, PendingItemSummary, SessionSummary, WikiSummary } from '../contracts.ts'
import { assessments, evidenceRoles, natures, type NarrativeDetail, type NarrativeSummary,
  type NarrativeUpdate, type Source, type SourceInput } from '../narrative.ts'
import { api, ApiError } from './api.ts'
import { acknowledge, claimNarrativeDraft, draftRequest, type Mode, type NarrativeDraft } from './narrative-drafts.ts'

const natureNames = { observation: 'Observação', report: 'Relato de NPC', rumor: 'Rumor', theory: 'Teoria' }
const stateNames = { open: 'Em aberto', confirmed: 'Confirmado', disputed: 'Contestado', refuted: 'Refutado' }
const roleNames = { supports: 'Sustenta', contradicts: 'Contradiz', contextualizes: 'Contextualiza' }
type Target = { id: string; title: string; type: string }
type Props = { campaign: Campaign; onBack: () => void; onDocument: (id: string, type: string) => void; onPending: (id: string) => void }

function SourceFields({ value, targets, label, onChange }: {
  value?: SourceInput; targets: Target[]; label: string; onChange: (value: SourceInput) => void
}) {
  return <>
    <label>{label}<select value={value?.documentId ?? ''} onChange={(event) => onChange({
      ...value, documentId: event.currentTarget.value || undefined,
    })}>
      <option value="">Registro direto ou nota manual</option>
      {targets.map(({ id, title, type }) => <option key={id} value={id}>{title} · {type === 'session' ? 'Sessão' : 'Wiki'}</option>)}
    </select></label>
    <label>Trecho ou nota de origem<textarea maxLength={12000} value={value?.text ?? ''}
      onChange={(event) => onChange({ ...value, text: event.currentTarget.value })} /></label>
  </>
}

function SourceView({ source, onDocument }: { source: Source; onDocument?: Props['onDocument'] }) {
  return <div className="context">
    {source.documentId ? <>
      {source.available && onDocument ? <button className="quiet" onClick={() => onDocument(source.documentId!, source.type!)}>{source.title}</button>
        : <span>{source.title}{!source.available && ' · Origem temporariamente indisponível'}</span>}
      {source.revision !== undefined && <span> · Revisão textual {source.revision}</span>}
    </> : source.kind === 'manual' ? 'Nota manual' : 'Registro direto'}
    <p>Captura em {new Date(source.capturedAt).toLocaleString('pt-BR')}</p>
    {source.text && <blockquote>{source.text}</blockquote>}
  </div>
}

export function Narrative({ campaign, onBack, onDocument, onPending }: Props) {
  const root = '/api/campaigns/' + campaign.id
  const path = root + '/information'
  const archived = Boolean(campaign.archivedAt)
  const [items, setItems] = useState<NarrativeSummary[]>([])
  const [targets, setTargets] = useState<Target[]>([])
  const [pending, setPending] = useState<PendingItemSummary[]>([])
  const [drafts, setDrafts] = useState<NarrativeDraft[]>([])
  const [consulting, setConsulting] = useState(false)
  const [perspectiveEditing, setPerspectiveEditing] = useState(false)
  const [item, setItem] = useState<NarrativeDetail | null>(null)
  const [draft, setDraft] = useState<NarrativeDraft | null>(null)
  const [conflict, setConflict] = useState<NarrativeDetail | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [nature, setNature] = useState('')
  const [state, setState] = useState('')
  const [refresh, setRefresh] = useState(0)
  const live = useRef<NarrativeDraft | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const release = useRef<(() => void) | null>(null)
  const tab = useRef(crypto.randomUUID())
  const newInformationButton = useRef<HTMLButtonElement>(null)
  const knowledgeButton = useRef<HTMLButtonElement>(null)
  const restoreNewInformationFocus = useRef(false)
  const leave = useLeave()
  usePendingNavigation(busy ? { label: 'Operação de informações em andamento', blocked: true }
    : draft ? { label: 'Alteração do registro global ainda não confirmada',
      blocked: Boolean(draft.operation) && !conflict,
      keep: status === 'Rascunho protegido neste navegador',
      discard: status === 'Falha no armazenamento local' && !draft.operation ? true : undefined } : null)

  const canStartInformation = !archived && !consulting && !busy && !draft && !perspectiveEditing

  useEffect(() => {
    if (!canStartInformation || !restoreNewInformationFocus.current) return
    restoreNewInformationFocus.current = false
    newInformationButton.current?.focus()
  }, [canStartInformation])

  useEffect(() => {
    let active = true
    void Promise.all([
      api<NarrativeSummary[]>(path + '?' + new URLSearchParams({ ...(nature ? { nature } : {}), ...(state ? { state } : {}) })),
      api<SessionSummary[]>(root + '/sessions'), api<WikiSummary[]>(root + '/wiki'), api<PendingItemSummary[]>(root + '/pending-items'),
    ]).then(([rows, sessions, wiki, pendingRows]) => {
      if (!active) return
      setItems(rows)
      setTargets([...sessions.map((row) => ({ ...row, type: 'session' })), ...wiki])
      setPending(pendingRows)
    }, () => { if (active) setError('Não foi possível carregar as informações.') })
    return () => { active = false }
  }, [root, path, nature, state, refresh])

  useEffect(() => {
    let active = true
    void draftRequest<NarrativeDraft[]>('readonly', (store) => store.index('campaign').getAll(campaign.id)).then(
      (records) => { if (active) setDrafts(records) }, () => {},
    )
    return () => { active = false }
  }, [campaign.id, refresh])

  useEffect(() => () => { void queue.current.finally(() => release.current?.()) }, [])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (live.current && status !== 'Rascunho protegido neste navegador') event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  function adopt(next: NarrativeDraft | null) {
    live.current = next
    setDraft(next)
  }

  function persist(next: NarrativeDraft | null, key: string) {
    const queued = queue.current.then(async () => {
      if (next) await draftRequest('readwrite', (store) => store.put(next))
      else await draftRequest('readwrite', (store) => store.delete(key))
    })
    queue.current = queued.catch(() => {})
    return queued
  }

  function protect(next: NarrativeDraft) {
    adopt(next)
    setStatus('Protegendo rascunho…')
    void persist(next, next.key).then(() => {
      if (live.current === next) setStatus('Rascunho protegido neste navegador')
    }, () => {
      if (live.current === next) setStatus('Falha no armazenamento local')
    })
  }

  async function begin(mode: Mode, current?: NarrativeDetail, replacesId?: string) {
    const fields: NarrativeUpdate = { version: current?.version ?? 0 }
    if (mode === 'edit') {
      fields.statement = current?.statement ?? ''
      fields.nature = current?.nature ?? 'observation'
    }
    if (mode === 'assessment') fields.state = current?.state
    if (mode === 'evidence') {
      const original = current?.evidence.find((entry) => entry.id === replacesId)
      fields.evidence = [{ id: crypto.randomUUID(), role: original?.role ?? 'supports',
        source: { text: original?.source.text ?? '' }, replacesId }]
    }
    const id = current?.id ?? crypto.randomUUID()
    const key = crypto.randomUUID()
    setBusy(true)
    try {
      release.current = await claimNarrativeDraft(key)
      if (!release.current) throw new Error('O rascunho está aberto em outra aba.')
      setError('')
      setStatus('')
      adopt({ key, id, mode, campaignId: campaign.id, tab: tab.current, generation: 0, fields, operation: null })
    } catch { setError('Não foi possível abrir o rascunho.') }
    finally { setBusy(false) }
  }

  async function recover(saved: NarrativeDraft) {
    setBusy(true)
    setError('')
    let lock: (() => void) | null = null
    try {
      lock = await claimNarrativeDraft(saved.key)
      if (!lock) throw new Error('O rascunho está em uso em outra aba.')
      const latest = await draftRequest<NarrativeDraft | undefined>('readonly', (store) => store.get(saved.key))
      if (!latest || latest.campaignId !== campaign.id) throw new Error('O rascunho está indisponível.')
      const confirmed = latest.fields.version > 0 ? await api<NarrativeDetail>(path + '/' + latest.id) : null
      setItem(confirmed)
      release.current = lock
      lock = null
      protect({ ...latest, tab: tab.current })
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível recuperar o rascunho.') }
    finally { lock?.(); setBusy(false) }
  }

  function change(patch: Partial<NarrativeUpdate>) {
    const current = live.current
    if (current) protect({ ...current, generation: current.generation + 1, fields: { ...current.fields, ...patch } })
  }

  async function save() {
    const current = live.current
    if (!current || busy || conflict) return
    const payload = JSON.parse(JSON.stringify(current.fields)) as NarrativeUpdate
    if (payload.decisionSource && !payload.decisionSource.text?.trim() && !payload.decisionSource.documentId) {
      delete payload.decisionSource
    }
    const operation = current.operation ?? { key: crypto.randomUUID(), generation: current.generation, payload }
    const pending = { ...current, operation }
    adopt(pending)
    setBusy(true)
    setError('')
    setStatus('Confirmando gravação…')
    try {
      await persist(pending, current.key)
    } catch {
      adopt(current)
      setStatus('Falha no armazenamento local')
      setBusy(false)
      return
    }
    try {
      const saved = await api<NarrativeDetail>(path + '/' + current.id, 'PUT', operation.payload, { 'Idempotency-Key': operation.key })
      setItem(saved)
      const next = acknowledge(live.current ?? pending, operation, saved.version)
      await persist(next, current.key)
      adopt(next)
      if (!next) { release.current?.(); release.current = null }
      setStatus(next ? 'Rascunho protegido neste navegador' : 'Salvo no servidor')
      setRefresh((value) => value + 1)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.')
      setStatus('Rascunho protegido neste navegador')
      if (failure instanceof ApiError && failure.status >= 400 && failure.status < 500) {
        const next = { ...(live.current ?? pending), operation: null }
        protect(next)
        if (failure.status === 409) {
          const confirmed = await api<NarrativeDetail>(path + '/' + current.id).catch(() => null)
          if (confirmed && confirmed.version !== current.fields.version) { setConflict(confirmed); setItem(confirmed) }
        }
      }
    } finally { setBusy(false) }
  }

  async function cancel() {
    if (!draft || draft.operation) return
    setBusy(true)
    try {
      await persist(null, draft.key)
      release.current?.()
      release.current = null
      restoreNewInformationFocus.current = draft.mode === 'edit' && draft.fields.version === 0
      adopt(null)
      setConflict(null)
      setStatus('')
      setError('')
      setRefresh((value) => value + 1)
    } catch { setStatus('Falha no armazenamento local') }
    finally { setBusy(false) }
  }

  function open(id: string) {
    setBusy(true)
    setError('')
    void api<NarrativeDetail>(path + '/' + id).then(setItem, () => setError('Não foi possível abrir a informação.'))
      .finally(() => setBusy(false))
  }

  function download() {
    if (!draft) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'rascunho-informacao.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const navigable = draft || perspectiveEditing ? undefined : onDocument
  const fields = draft?.fields
  const entry = fields?.evidence?.[0]
  return <div className="narrative-area">
    <button className="quiet" disabled={busy} onClick={() => leave(onBack)}>Voltar à campanha</button>
    <header className="page-header"><div><p className="context">{campaign.name}</p><h1>Informações</h1></div>
      <div className="actions">
        <button ref={knowledgeButton} aria-expanded={consulting} aria-controls={consulting ? 'knowledge-view' : undefined} disabled={busy || !!draft || perspectiveEditing}
          onClick={() => setConsulting((value) => !value)}>Consultar conhecimento</button>
        {!archived && !consulting && <button ref={newInformationButton} disabled={!canStartInformation}
          onClick={() => void begin('edit')}>Nova informação</button>}
      </div></header>
    {consulting && <div id="knowledge-view"><KnowledgeView key={root} root={root} characters={targets.filter(({ type }) => type === 'character')}
      onOpen={(id) => { setConsulting(false); open(id) }} onSession={(id) => leave(() => onDocument(id, 'session'))}
      onClose={() => {
        setConsulting(false)
        knowledgeButton.current?.focus()
      }} /></div>}
    {error && <p role="alert" className="error">{error}</p>}
    {status && <p role="status">{status}</p>}
    {!consulting && !perspectiveEditing && !draft && !archived && drafts.map((saved) => <button key={saved.key} disabled={busy} onClick={() => void recover(saved)}>
      Recuperar rascunho {saved.fields.statement || saved.id.slice(0, 8)}
    </button>)}
    {!consulting && !draft && <section aria-label="Lista de informações" className="panel">
      <h2>Registro global</h2>
      <p className="context">Informações registradas na campanha. Use Consultar conhecimento para filtrar por sujeito.</p>
      <div className="actions">
        <label>Filtrar natureza<select value={nature} onChange={(event) => setNature(event.currentTarget.value)}>
          <option value="">Todas</option>{natures.map((value) => <option key={value} value={value}>{natureNames[value]}</option>)}
        </select></label>
        <label>Filtrar estado<select value={state} onChange={(event) => setState(event.currentTarget.value)}>
          <option value="">Todos</option>{assessments.map((value) => <option key={value} value={value}>{stateNames[value]}</option>)}
        </select></label>
      </div>
      {items.length ? <ul className="session-list">{items.map((row) => <li key={row.id}>
        <button className="quiet" disabled={busy || perspectiveEditing} onClick={() => open(row.id)}>{row.statement.split('\n')[0]}</button>
        <span>{natureNames[row.nature]} · {stateNames[row.state]} · {row.source.title ?? (row.source.kind === 'manual' ? 'Nota manual' : 'Registro direto')} · {new Date(row.updatedAt).toLocaleDateString('pt-BR')}</span>
      </li>)}</ul> : <p>Nenhuma informação nesta consulta.</p>}
    </section>}
    {!consulting && item && (!draft || draft.fields.version > 0 || conflict) && <section className="panel" aria-label="Dados confirmados">
      <h2>{item.statement}</h2>
      <p>{natureNames[item.nature]} · {stateNames[item.state]}</p>
      <section aria-label="Origem inicial"><SourceView source={item.source} onDocument={navigable} /></section>
      {!archived && !perspectiveEditing && !draft && <div className="actions">
        <button disabled={busy} onClick={() => void begin('edit', item)}>Editar informação</button>
        <button disabled={busy} onClick={() => void begin('assessment', item)}>Alterar estado</button>
        <button disabled={busy} onClick={() => void begin('evidence', item)}>Acrescentar evidência</button>
        <button disabled={busy} onClick={() => void begin('links', item)}>Vincular registros</button>
      </div>}
      <h3>Evidências</h3>
      {item.evidence.map((evidence) => {
        const replaced = item.evidence.some((row) => row.replacesId === evidence.id)
        return <section key={evidence.id} className="panel">
          <p>{roleNames[evidence.role]}{replaced && ' · Substituída'}{evidence.replacesId && ' · Correção'}</p>
          <SourceView source={evidence.source} onDocument={navigable} />
          {!archived && !perspectiveEditing && !draft && !replaced && <button disabled={busy} onClick={() => void begin('evidence', item, evidence.id)}>Corrigir evidência</button>}
        </section>
      })}
      <h3>Vínculos</h3>
      {item.documents.map((doc) => <button key={doc.id} disabled={!!draft || perspectiveEditing || !doc.available}
        onClick={() => onDocument(doc.id, doc.type)}>{doc.title}{!doc.available && ' · Indisponível'}</button>)}
      {item.pending.map((row) => <button key={row.id} disabled={!!draft || perspectiveEditing} onClick={() => onPending(row.id)}>{row.title}</button>)}
      <h3>Histórico</h3>
      <ol>{item.history.map((row) => <li key={row.version}>
        <p>Versão {row.version} · {natureNames[row.nature]} · {stateNames[row.state]}</p>
        <p>{row.statement}</p>
        {row.justification && <p>{row.justification}</p>}
        {row.version > 1 && <SourceView source={row.source} onDocument={navigable} />}
      </li>)}</ol>
      {!draft && <PerspectivePanel key={item.id} campaignId={campaign.id} item={item} targets={targets}
        archived={archived} onEditing={setPerspectiveEditing} onSession={(id) => onDocument(id, 'session')} />}
    </section>}
    {draft && fields && <form className="panel form" aria-label="Rascunho de informação" onSubmit={(event) => { event.preventDefault(); void save() }}>
      <h2>{fields.version ? 'Editar informação' : 'Nova informação'}</h2>
      {conflict && <>
        <p>Compare os dados confirmados acima com o rascunho abaixo. Use a versão atual como base para preparar uma nova confirmação.</p>
        <button type="button" onClick={() => { change({ version: conflict.version }); setConflict(null); setError('') }}>Usar versão atual como base</button>
      </>}
      <fieldset className="form-grid" disabled={busy || !!draft.operation}>
        {draft.mode === 'edit' && <>
          <label className="wide">Enunciado<textarea required maxLength={12000} value={fields.statement}
            onChange={(event) => change({ statement: event.currentTarget.value })} /></label>
          <label>Natureza<select aria-label="Natureza" value={fields.nature} onChange={(event) => change({ nature: event.currentTarget.value as NarrativeUpdate['nature'] })}>
            {natures.map((value) => <option key={value} value={value}>{natureNames[value]}</option>)}
          </select></label>
          {fields.version === 0 && <SourceFields value={fields.source} targets={targets.filter(({ type }) => type === 'session')} label="Origem opcional" onChange={(source) => change({ source })} />}
        </>}
        {draft.mode === 'assessment' && <>
          <label>Estado<select value={fields.state} onChange={(event) => change({ state: event.currentTarget.value as NarrativeUpdate['state'] })}>
            {assessments.map((value) => <option key={value} value={value}>{stateNames[value]}</option>)}
          </select></label>
          <label>Justificativa<textarea required maxLength={12000} value={fields.justification ?? ''}
            onChange={(event) => change({ justification: event.currentTarget.value })} /></label>
          {(fields.state === 'confirmed' || fields.state === 'refuted') && <>
            <label>Evidência da decisão<select value={fields.decisionEvidenceId ?? ''}
              onChange={(event) => change({ decisionEvidenceId: event.currentTarget.value || undefined, decisionSource: undefined })}>
              <option value="">Origem inicial ou nota manual</option>
              {item?.evidence.map((row) => <option key={row.id} value={row.id}>{roleNames[row.role]} · {row.source.text}</option>)}
            </select></label>
            {!fields.decisionEvidenceId && <SourceFields value={fields.decisionSource} targets={targets} label="Origem da decisão"
              onChange={(decisionSource) => change({ decisionSource })} />}
          </>}
        </>}
        {draft.mode === 'evidence' && entry && <>
          <label>Classificação da evidência<select value={entry.role}
            onChange={(event) => change({ evidence: [{ ...entry, role: event.currentTarget.value as typeof entry.role }] })}>
            {evidenceRoles.map((value) => <option key={value} value={value}>{roleNames[value]}</option>)}
          </select></label>
          <SourceFields value={entry.source} targets={targets} label="Origem da evidência" onChange={(source) => change({ evidence: [{ ...entry, source }] })} />
        </>}
        {draft.mode === 'links' && <>
          <label>Sessões e páginas da wiki<select multiple value={fields.documents ?? []}
            onChange={(event) => change({ documents: Array.from(event.currentTarget.selectedOptions, ({ value }) => value) })}>
            {targets.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
          </select></label>
          <label>Pendências<select multiple value={fields.pending ?? []}
            onChange={(event) => change({ pending: Array.from(event.currentTarget.selectedOptions, ({ value }) => value) })}>
            {pending.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
          </select></label>
        </>}
      </fieldset>
      <div className="actions">
        <button className="primary" disabled={busy || !!conflict}>{draft.operation ? 'Reenviar gravação' : 'Salvar'}</button>
        <button type="button" disabled={busy || !!draft.operation} onClick={() => void cancel()}>Cancelar</button>
        {status === 'Falha no armazenamento local' && <button type="button" onClick={download}>Baixar rascunho</button>}
      </div>
    </form>}
  </div>
}
