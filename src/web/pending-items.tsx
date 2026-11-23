import { useEffect, useState, type FormEvent } from 'react'
import { pendingStates, pendingTypes, type Campaign, type PendingItem, type PendingItemSummary,
  type PendingState, type PendingType, type SessionSummary, type WikiSummary } from '../contracts.ts'
import { api } from './api.ts'

const types: Record<PendingType, string> = {
  clue: 'Pista', question: 'Pergunta', promise: 'Promessa', task: 'Tarefa', other: 'Outro',
}
const states: Record<PendingState, string> = {
  open: 'Aberta', investigating: 'Em investigação', resolved: 'Resolvida', discarded: 'Descartada',
}

function campaignUrl(campaign: Campaign) {
  return `/api/campaigns/${campaign.id}`
}

export function PendingOverview({ campaign, busy, onOpen }: {
  campaign: Campaign; busy: boolean; onOpen: (id?: string) => void
}) {
  const [rows, setRows] = useState<PendingItemSummary[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    void api<PendingItemSummary[]>(`${campaignUrl(campaign)}/pending-items?open=true`).then(
      (items) => { if (active) setRows(items) },
      () => { if (active) setFailed(true) },
    )
    return () => { active = false }
  }, [campaign])
  return <section aria-label="Pendências abertas">
    <h3>Pendências abertas</h3>
    {failed ? <p>Não foi possível carregar as pendências abertas.</p> :
      !rows ? <p>Carregando pendências…</p> : rows.length === 0 ? <p>Nenhuma pendência aberta.</p> :
        <ul className="session-list">{rows.map((row) => <li key={row.id}>
          <button className="quiet" disabled={busy} onClick={() => onOpen(row.id)}>{row.title}</button>
          <span>{states[row.state]}</span>
        </li>)}</ul>}
    <button className="quiet" disabled={busy} onClick={() => onOpen()}>Ver pendências</button>
  </section>
}

export function PendingItems({ campaign, itemId, onBack, onSession, onWiki }: {
  campaign: Campaign; itemId?: string; onBack: () => void
  onSession: (id: string) => void; onWiki: (id: string) => void
}) {
  const base = campaignUrl(campaign)
  const path = `${base}/pending-items`
  const [rows, setRows] = useState<PendingItemSummary[] | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [entities, setEntities] = useState<WikiSummary[]>([])
  const [item, setItem] = useState<PendingItem | null>(null)
  const [next, setNext] = useState<PendingState>('open')
  const [id, setId] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const locked = Boolean(campaign.archivedAt)

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

  async function action(work: () => Promise<void>) {
    setError('')
    setBusy(true)
    try { await work() }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'A operação não pôde ser concluída.') }
    finally { setBusy(false) }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    void action(async () => {
      const saved = await api<PendingItem>(path, 'POST', {
        id, title: data.get('title'), type: data.get('type'), description: data.get('description'),
        origin: data.get('origin'), notes: data.get('notes'), sessionId: data.get('sessionId') || null,
        entityIds: data.getAll('entityIds'),
      })
      select(saved)
      setId(crypto.randomUUID())
      form.reset()
      setRows(await api<PendingItemSummary[]>(path))
    })
  }

  function changeState(current: PendingItem) {
    void action(async () => {
      select(await api<PendingItem>(`${path}/${current.id}/state`, 'PATCH', { previous: current.state, state: next }))
      setRows(await api<PendingItemSummary[]>(path))
    })
  }

  const session = sessions.find((row) => row.id === item?.sessionId)
  return <>
    <button className="quiet" disabled={busy} onClick={onBack}>Voltar à campanha</button>
    <header className="page-header"><div><p className="context">{campaign.name}</p><h1>Pendências</h1></div></header>
    {error && <p className="error" role="alert">{error}</p>}
    {!rows ? <button disabled={!error} onClick={() => { setError(''); setAttempt((value) => value + 1) }}>
      {error ? 'Recarregar pendências' : 'Carregando pendências…'}
    </button> : <>
      {rows.length === 0 ? <p>Nenhuma pendência registrada.</p> :
        <ul className="session-list">{rows.map((row) => <li className="panel" key={row.id}>
          <button className="quiet" disabled={busy} onClick={() => void action(async () => {
            select(await api<PendingItem>(`${path}/${row.id}`))
          })}>{row.title}</button>
          <span>{types[row.type]} · {states[row.state]}</span>
        </li>)}</ul>}
      {item && <section className="panel">
        <h2>{item.title}</h2>
        <p>{types[item.type]} · {states[item.state]}</p>
        {item.description && <p>{item.description}</p>}
        {item.origin && <p>Origem: {item.origin}</p>}
        {item.notes && <p>Observações: {item.notes}</p>}
        {session ? <button disabled={busy} onClick={() => onSession(session.id)}>{session.title}</button> :
          item.sessionId && <p>Sessão de origem indisponível.</p>}
        {entities.filter((row) => item.entityIds.includes(row.id)).map((row) =>
          <button key={row.id} disabled={busy} onClick={() => onWiki(row.id)}>{row.title}</button>)}
        <h3>Histórico de estados</h3>
        <ol aria-label="Histórico de estados">{item.history.map((entry, index) =>
          <li key={index}>{states[entry.state]} · <time dateTime={entry.createdAt}>
            {new Date(entry.createdAt).toLocaleString('pt-BR')}</time></li>)}</ol>
        {!locked && <div className="actions">
          <label>Alterar estado<select value={next} disabled={busy}
            onChange={(event) => setNext(event.currentTarget.value as PendingState)}>
            {pendingStates.map((state) => <option key={state} value={state}>{states[state]}</option>)}
          </select></label>
          <button disabled={busy || next === item.state} onClick={() => changeState(item)}>Salvar estado</button>
        </div>}
      </section>}
      {!locked && <form className="panel form" onSubmit={create}>
        <h2>Nova pendência</h2>
        <label>Título<input name="title" required disabled={busy} /></label>
        <label>Tipo<select name="type" defaultValue="other" disabled={busy}>
          {pendingTypes.map((type) => <option key={type} value={type}>{types[type]}</option>)}
        </select></label>
        <label>Descrição<textarea name="description" disabled={busy} /></label>
        <label>Origem<input name="origin" disabled={busy} /></label>
        <label>Sessão de origem<select name="sessionId" disabled={busy}>
          <option value="">Nenhuma</option>
          {sessions.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
        </select></label>
        {entities.length > 0 && <label>NPCs e localidades<select name="entityIds" multiple disabled={busy}>
          {entities.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
        </select></label>}
        <label>Observações<textarea name="notes" disabled={busy} /></label>
        <button className="primary" disabled={busy}>Criar pendência</button>
      </form>}
    </>}
  </>
}
