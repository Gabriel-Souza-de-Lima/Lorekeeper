import { useEffect, useId, useState } from 'react'
import type { SessionSummary, WikiSummary } from '../contracts.ts'
import { api, displayDate } from './api.ts'

export function SessionWikiLinks({ sessionUrl, campaignUrl, archived, draftOnly, navigationBlocked, version, canInsert, onInsert, onOpen }: {
  sessionUrl: string
  campaignUrl: string
  archived: boolean
  draftOnly: boolean
  navigationBlocked: boolean
  version: number
  canInsert: boolean
  onInsert: (page: WikiSummary) => void
  onOpen: (id: string) => void
}) {
  const pickerId = useId()
  const url = `${sessionUrl}/wiki-links`
  const [linked, setLinked] = useState<WikiSummary[] | null>(null)
  const [pages, setPages] = useState<WikiSummary[]>([])
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void (draftOnly ? Promise.resolve<WikiSummary[]>([]) : api<WikiSummary[]>(url)).then(async (rows) => {
      if (!active) return
      setLinked(rows)
      if (!archived) {
        const items = await api<WikiSummary[]>(`${campaignUrl}/wiki`)
        if (active) setPages(items)
      }
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [archived, attempt, campaignUrl, draftOnly, url, version])

  async function link() {
    const page = pages.find((item) => item.id === selected)
    if (!page || busy) return
    setBusy(true)
    setError('')
    try {
      await api<void>(`${url}/${page.id}`, 'PUT')
      setLinked((items) => items?.some((item) => item.id === page.id) ? items : [...(items ?? []), page])
      setSelected('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível vincular a página.')
    } finally {
      setBusy(false)
    }
  }

  const linkedIds = new Set(linked?.map((page) => page.id))
  const selectedPage = pages.find((page) => page.id === selected)
  return <section className="panel" aria-label="Páginas vinculadas">
    <h2>Páginas vinculadas</h2>
    {linked === null ? !failed && <p>Carregando páginas…</p>
      : linked.length === 0 ? <p>Nenhuma página vinculada.</p>
        : <ul className="session-list">{linked.map((page) => <li key={page.id}>
          <button className="quiet" disabled={busy || navigationBlocked} onClick={() => onOpen(page.id)}>{page.title}</button>
        </li>)}</ul>}
    {!archived && pages.length > 0 && <div className="actions">
      <label htmlFor={pickerId}>Página da wiki</label>
      <select id={pickerId} value={selected} disabled={busy} onChange={(e) => setSelected(e.target.value)}>
        <option value="">Escolha uma página</option>
        {pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
      </select>
      {!draftOnly && <button disabled={!selected || busy || linkedIds.has(selected)} onClick={() => void link()}>Vincular página</button>}
      <button disabled={!selectedPage || !canInsert || busy} onClick={() => {
        if (selectedPage) onInsert(selectedPage)
      }}>Inserir no Markdown</button>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
    {failed && <><p className="error" role="alert">Não foi possível carregar as páginas.</p>
      <button onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>Recarregar páginas</button></>}
  </section>
}

export function WikiBacklinks({ url, busy, onOpen }: { url: string; busy: boolean; onOpen: (id: string) => void }) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void api<SessionSummary[]>(url).then(
      (rows) => { if (active) setSessions(rows) },
      () => { if (active) setFailed(true) },
    )
    return () => { active = false }
  }, [attempt, url])

  return <section className="panel" aria-label="Sessões relacionadas">
    <h2>Sessões relacionadas</h2>
    {failed ? <><p className="error" role="alert">Não foi possível carregar as sessões.</p>
      <button onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>Recarregar sessões</button></>
      : sessions === null ? <p>Carregando sessões…</p>
        : sessions.length === 0 ? <p>Nenhuma sessão relacionada.</p>
          : <ul className="session-list">{sessions.map((session) => <li key={session.id}>
            <button className="quiet" disabled={busy} onClick={() => onOpen(session.id)}>{session.title}</button>
            <span>{displayDate(session.date)}</span>
          </li>)}</ul>}
  </section>
}
