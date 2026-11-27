import { Pagination } from './campaign-overview.tsx'
import { useLeave, usePendingNavigation } from './navigation-guard.tsx'
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { pendingStates, pendingTypes, type Campaign, type PendingItem, type PendingItemSummary,
  type PendingFields, type PendingState, type PendingType, type SessionSummary, type WikiSummary } from '../contracts.ts'
import { api, ApiError } from './api.ts'

const types: Record<PendingType, string> = {
  clue: 'Pista', question: 'Pergunta', promise: 'Promessa', task: 'Tarefa', other: 'Outro',
}
const states: Record<PendingState, string> = {
  open: 'Aberta', investigating: 'Em andamento', resolved: 'Concluída', discarded: 'Cancelada',
}

function PendingStatus({ state }: { state: PendingState }) {
  return <span className="pending-status" data-state={state}>{states[state]}</span>
}

function campaignUrl(campaign: Campaign) {
  return `/api/campaigns/${campaign.id}`
}

function readFields(data: FormData): PendingFields {
  return {
    title: String(data.get('title')), type: data.get('type') as PendingType,
    description: String(data.get('description')), origin: String(data.get('origin')),
    notes: String(data.get('notes')), sessionId: (data.get('sessionId') as string) || null,
    entityIds: data.getAll('entityIds').map(String),
  }
}

function PendingInputs({ initial, sessions, entities, busy }: {
  initial?: PendingFields; sessions: SessionSummary[]; entities: WikiSummary[]; busy: boolean
}) {
  return <fieldset disabled={busy} className="form-grid pending-fields">
    <label>Título<input name="title" defaultValue={initial?.title} required /></label>
    <label>Tipo<select name="type" defaultValue={initial?.type ?? 'other'}>
      {pendingTypes.map((type) => <option key={type} value={type}>{types[type]}</option>)}
    </select></label>
    <label>Descrição<textarea name="description" defaultValue={initial?.description} /></label>
    <label>Origem<input className="paired-text-entry" name="origin" defaultValue={initial?.origin} /></label>
    <label className="wide">Observações<textarea name="notes" defaultValue={initial?.notes} /></label>
    <label>Sessão de origem<select name="sessionId" defaultValue={initial?.sessionId ?? ''}>
      <option value="">Nenhuma</option>
      {initial?.sessionId && !sessions.some((row) => row.id === initial.sessionId) &&
        <option value={initial.sessionId}>Sessão vinculada indisponível</option>}
      {sessions.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
    </select></label>
    {entities.length > 0 && <label>NPCs e localidades<select name="entityIds" multiple defaultValue={initial?.entityIds}>
      {entities.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
    </select></label>}
  </fieldset>
}

export function PendingItems({ campaign, itemId, onBack, onSession, onWiki }: {
  campaign: Campaign; itemId?: string; onBack: () => void
  onSession: (id: string) => void; onWiki: (id: string) => void
}) {
  const base = campaignUrl(campaign)
  const path = `${base}/pending-items`
  const [tab, setTab] = useState<'open' | 'closed'>('open')
  const [requestedPage, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const opener = useRef<string | null>(null)
  const listRegion = useRef<HTMLElement>(null)
  const listHeading = useRef<HTMLHeadingElement>(null)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const formHeading = useRef<HTMLHeadingElement>(null)
  const focusList = useRef(false)
  const [rows, setRows] = useState<PendingItemSummary[] | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [entities, setEntities] = useState<WikiSummary[]>([])
  const [item, setItem] = useState<PendingItem | null>(null)
  const [next, setNext] = useState<PendingState>('open')
  const [id, setId] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState<PendingItem | null>(null)
  const [editVersion, setEditVersion] = useState(0)
  const conflict = Boolean(editing && item && item.editVersion !== editVersion)
  const locked = Boolean(campaign.archivedAt)

  const [createDirty, setCreateDirty] = useState(false)
  const [retry, setRetry] = useState<(() => Promise<void>) | null>(null)
  const [editDirty, setEditDirty] = useState(false)
  const leave = useLeave()
  usePendingNavigation(busy || retry ? { label: 'Operação de pendência em andamento ou sem confirmação', blocked: true }
    : editDirty || createDirty || item && next !== item.state
      ? { label: 'Campos ou estado da pendência ainda não confirmados', discard: true } : null)

  useLayoutEffect(() => {
    if (creating) formHeading.current?.focus()
    else if (item) detailHeading.current?.focus()
    else if (focusList.current) {
      const button = Array.from(listRegion.current?.querySelectorAll<HTMLButtonElement>('[data-pending]') ?? [])
        .find((element) => element.dataset.pending === opener.current)
      const target = button ?? listHeading.current
      target?.focus()
      focusList.current = false
    }
  }, [creating, item?.id])

  function backToList() {
    leave(() => {
      setCreating(false)
      setEditing(null)
      setItem(null)
      setCreateDirty(false)
      setEditDirty(false)
      setError('')
      focusList.current = true
    })
  }

  function select(current: PendingItem) {
    setItem(current)
    setNext(current.state)
  }

  useEffect(() => {
    let active = true
    void Promise.all([
      api<PendingItemSummary[]>(path),
      api<SessionSummary[]>(`${base}/sessions`),
      api<WikiSummary[]>(`${base}/wiki`),
      itemId ? api<PendingItem>(`${path}/${itemId}`) : null,
    ]).then(([items, sessionRows, wikiRows, current]) => {
      if (!active) return
      setRows(items)
      setSessions(sessionRows)
      setEntities(wikiRows.filter((row) => row.type === 'npc' || row.type === 'location'))
      if (current) select(current)
    }, () => { if (active) setError('Não foi possível carregar as pendências.') })
    return () => { active = false }
  }, [attempt, base, itemId, path])

  async function action(work: () => Promise<void>, mutation = true) {
    setError('')
    setBusy(true)
    try { await work(); setRetry(null) }
    catch (failure) {
      setRetry(mutation && failure instanceof ApiError && (failure.status === 0 || failure.status >= 500) ? () => work : null)
      setError(failure instanceof Error ? failure.message : 'A operação não pôde ser concluída.')
    }
    finally { setBusy(false) }
  }

  function updateRows(saved: PendingItem) {
    setRows((current) => [saved, ...(current ?? []).filter((row) => row.id !== saved.id)])
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    void action(async () => {
      const saved = await api<PendingItem>(path, 'POST', { id, ...readFields(data) })
      select(saved)
      updateRows(saved)
      setCreating(false)
      setId(crypto.randomUUID())
      form.reset()
      setCreateDirty(false)
    })
  }

  function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || conflict || busy) return
    const input = readFields(new FormData(event.currentTarget))
    const url = `${path}/${editing.id}`
    void action(async () => {
      try {
        const saved = await api<PendingItem>(url, 'PUT', { ...input, editVersion })
        select(saved)
        updateRows(saved)
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) select(await api<PendingItem>(url))
        throw error
      }
      setEditing(null)
      setEditDirty(false)
    })
  }

  function changeState(current: PendingItem) {
    void action(async () => {
      const saved = await api<PendingItem>(`${path}/${current.id}/state`, 'PATCH', { previous: current.state, state: next })
      select(saved)
      updateRows(saved)
    })
  }

  const session = sessions.find((row) => row.id === item?.sessionId)
  const opened = rows?.filter(({ state }) => state === 'open' || state === 'investigating') ?? []
  const closed = rows?.filter(({ state }) => state === 'resolved' || state === 'discarded') ?? []
  const filtered = tab === 'open' ? opened : closed
  const pages = Math.max(1, Math.ceil(filtered.length / 8))
  const page = Math.min(requestedPage, pages)
  return <>
    <button className="quiet" disabled={busy} onClick={() => leave(onBack)}>Voltar à campanha</button>
    {(item || creating) && <button className="quiet" disabled={busy} onClick={backToList}>Voltar às pendências</button>}
    {!item && !creating && <header className="page-header">
      <div><p className="context">{campaign.name}</p><h1 ref={listHeading} tabIndex={-1}>Pendências</h1></div>
      {!locked && rows && <button className="primary" onClick={() => { opener.current = null; setCreating(true) }}>Nova pendência</button>}
    </header>}
    {error && <p className="error" role="alert">{error}</p>}
    {retry && <button disabled={busy} onClick={() => void action(retry)}>Confirmar operação pendente</button>}
    {!rows ? (error
      ? <button onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Recarregar pendências</button>
      : <p className="context" role="status">Carregando pendências…</p>) : <div className="surface-flow">
      {!item && !creating && <section ref={listRegion} aria-label="Lista de pendências" className="surface-flow">
        <div className="tabs" role="group" aria-label="Estado da lista">
          <button aria-pressed={tab === 'open'} onClick={() => { setTab('open'); setPage(1) }}>Abertas {opened.length}</button>
          <button aria-pressed={tab === 'closed'} onClick={() => { setTab('closed'); setPage(1) }}>Fechadas {closed.length}</button>
        </div>
        {filtered.length === 0 ? <p className="panel empty">Nenhuma pendência {tab === 'open' ? 'aberta' : 'fechada'}.</p> :
          <ul className="session-list">{filtered.slice((page - 1) * 8, page * 8).map((row) => <li className="panel" key={row.id}>
            <button className="quiet" data-pending={row.id} disabled={busy} onClick={() => void action(async () => {
              opener.current = row.id
              select(await api<PendingItem>(`${path}/${row.id}`))
            }, false)}>{row.title}</button>
            <span>{types[row.type]} · <PendingStatus state={row.state} /></span>
          </li>)}</ul>}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </section>}
      {item && <section className="panel surface-flow" aria-label="Detalhe da pendência">
        <header className="actions pending-identification">
          <div><h1 ref={detailHeading} tabIndex={-1}>{item.title}</h1>
            <p className="context">{types[item.type]} · <PendingStatus state={item.state} /></p></div>
          {!locked && !editing && <button disabled={busy || Boolean(retry)} onClick={() => {
            setError('')
            setEditDirty(false)
            setEditing(item)
            setEditVersion(item.editVersion)
          }}>Editar pendência</button>}
        </header>
        {item.description && <p>{item.description}</p>}
        {item.origin && <p>Origem: {item.origin}</p>}
        {item.notes && <p>Observações: {item.notes}</p>}
        {session ? <button disabled={busy || Boolean(editing)} onClick={() => leave(() => onSession(session.id))}>{session.title}</button> :
          item.sessionId && <p>Sessão de origem indisponível.</p>}
        {entities.filter((row) => item.entityIds.includes(row.id)).map((row) =>
          <button key={row.id} disabled={busy || Boolean(editing)} onClick={() => leave(() => onWiki(row.id))}>{row.title}</button>)}
        {!locked && !editing && <div className="actions field-actions pending-state-actions" role="group" aria-label="Atualizar estado">
          <label>Alterar estado<select value={next} disabled={busy || Boolean(retry)}
            onChange={(event) => setNext(event.currentTarget.value as PendingState)}>
            {pendingStates.map((state) => <option key={state} value={state}>{states[state]}</option>)}
          </select></label>
          <button disabled={busy || Boolean(retry) || next === item.state} onClick={() => changeState(item)}>Salvar estado</button>
        </div>}
        <details className="pending-history">
          <summary>Histórico de estados</summary>
          <ol aria-label="Histórico de estados">{item.history.map((entry, index) =>
            <li key={index}>{states[entry.state]} · <time dateTime={entry.createdAt}>
              {new Date(entry.createdAt).toLocaleString('pt-BR')}</time></li>)}</ol>
        </details>
      </section>}
      {editing && <form className="panel surface-flow" aria-label="Editar pendência" onSubmit={edit} onChange={() => setEditDirty(true)}>
        <h2>Editar pendência</h2>
        {conflict && <p>Compare seu rascunho com os dados confirmados acima antes de salvar novamente.</p>}
        <PendingInputs initial={editing} sessions={sessions} entities={entities} busy={busy || Boolean(retry)} />
        <div className="actions">
          {conflict && item && <button type="button" disabled={busy} onClick={() => {
            setEditVersion(item.editVersion)
            setError('')
          }}>Usar versão atual como base</button>}
          <button className="primary" disabled={busy || Boolean(retry) || conflict}>Salvar alterações</button>
          <button type="button" disabled={busy || Boolean(retry)} onClick={() => leave(() => { setEditing(null); setEditDirty(false); setError('') })}>Cancelar edição</button>
        </div>
      </form>}
      {!locked && creating && <form className="panel surface-flow" aria-label="Nova pendência" onSubmit={create} onChange={() => setCreateDirty(true)}>
        <h1 ref={formHeading} tabIndex={-1}>Nova pendência</h1>
        <PendingInputs sessions={sessions} entities={entities} busy={busy || Boolean(retry)} />
        <div className="actions"><button className="primary" disabled={busy || Boolean(retry)}>Criar pendência</button></div>
      </form>}
    </div>}
  </>
}
