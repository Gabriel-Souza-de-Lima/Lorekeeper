import { useEffect, useState } from 'react'
import type { Campaign, CampaignSessionSummary, PendingItemSummary, WikiSummary } from '../contracts.ts'
import { api, displayDate } from './api.ts'
import { NavigationIcon } from './navigation-icon.tsx'

export function SessionCards({ rows, busy, onOpen, onTrash }: {
  rows: CampaignSessionSummary[]; busy: boolean; onOpen: (id: string) => void
  onTrash?: (id: string, title: string) => void
}) {
  if (!rows.length) return <p className="empty">Nenhuma sessão registrada</p>
  return <ul className="session-list">{rows.map((session) => <li key={session.id} className="panel campaign-session-card">
    <button className="campaign-session-open" disabled={busy} aria-label={session.title}
      aria-describedby={`session-meta-${session.id} session-summary-${session.id}`} onClick={() => onOpen(session.id)}>
      <span className="campaign-card-title">{session.title}</span>
      <span id={`session-meta-${session.id}`} className="context">
        {session.number !== null && `Sessão ${session.number} · `}{displayDate(session.date)}
      </span>
      <span id={`session-summary-${session.id}`} className="session-summary">{session.summary?.trim() || 'Sem resumo'}</span>
    </button>
    {onTrash && <div className="campaign-card-actions">
      <button disabled={busy} aria-label={`Excluir sessão ${session.title}`}
        onClick={() => onTrash(session.id, session.title)}>Excluir sessão</button>
    </div>}
  </li>)}</ul>
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  return <nav className="actions" aria-label="Paginação">
    <button disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button>
    <span aria-live="polite">Página {page} de {pages}</span>
    <button disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima</button>
  </nav>
}

export function SessionCatalog({ rows, busy, onOpen, onTrash }: Parameters<typeof SessionCards>[0]) {
  const [requested, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / 8))
  const page = Math.min(requested, pages)
  return <section className="surface-flow" aria-label="Sessões">
    <SessionCards rows={rows.slice((page - 1) * 8, page * 8)} busy={busy} onOpen={onOpen} onTrash={onTrash} />
    <Pagination page={page} pages={pages} onChange={setPage} />
  </section>
}

type Collection = 'sessions' | 'quests' | 'pending' | 'people'

export function CampaignOverview({ campaign, sessions, busy, onNavigate, onSession, onWiki, onPending }: {
  campaign: Campaign; sessions: CampaignSessionSummary[]; busy: boolean
  onNavigate: (collection: Collection) => void; onSession: (id: string) => void
  onWiki: (id: string, collection: 'quests' | 'people') => void; onPending: (id: string) => void
}) {
  const [pending, setPending] = useState<PendingItemSummary[]>([])
  const [quests, setQuests] = useState<WikiSummary[]>([])
  const [people, setPeople] = useState<WikiSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const root = '/api/campaigns/' + campaign.id
  useEffect(() => {
    let active = true
    void Promise.all([
      api<PendingItemSummary[]>(root + '/pending-items?open=true'),
      api<WikiSummary[]>(root + '/wiki?openQuests=true'),
      api<WikiSummary[]>(root + '/wiki'),
    ]).then(([open, missions, pages]) => {
      if (!active) return
      setPending(open)
      setQuests(missions)
      setPeople(pages.filter(({ type }) => type === 'character' || type === 'npc'))
      setStatus('ready')
    }, () => { if (active) setStatus('error') })
    return () => { active = false }
  }, [root, attempt])
  const featured = [...people].sort((a, b) =>
    Number(b.id === campaign.featuredCharacterId) - Number(a.id === campaign.featuredCharacterId) ||
    Number(b.type === 'character') - Number(a.type === 'character')).slice(0, 4)
  const collections = [
    ['sessions', 'Sessões ativas', sessions.length, 'sessions'],
    ['quests', 'Missões ativas', quests.length, 'quest'],
    ['pending', 'Pendências abertas', pending.length, 'pending'],
    ['people', 'Personagens e NPCs', people.length, 'people'],
  ] as const
  return <>
    <section className="campaign-metrics" aria-label="Indicadores da campanha">
      {collections.map(([key, label, count, icon]) => <button className="panel" key={key} disabled={busy} onClick={() => onNavigate(key)}>
        <span><NavigationIcon name={icon} /> {label}</span><strong>{key === 'sessions' || status === 'ready' ? count : '—'}</strong>
      </button>)}
    </section>
    {status === 'error' && <div className="actions">
      <p role="alert">Não foi possível carregar os indicadores complementares.</p>
      <button onClick={() => { setStatus('loading'); setAttempt(attempt + 1) }}>Recarregar indicadores</button>
    </div>}
    <div className="overview-collections">
      <section className="panel surface-flow" aria-label="Sessões recentes">
        <header className="actions overview-heading"><h2>Sessões recentes</h2>
          <button className="quiet" disabled={busy} onClick={() => onNavigate('sessions')}>Ver todas</button></header>
        <SessionCards rows={sessions.slice(0, 3)} busy={busy} onOpen={onSession} />
      </section>
      {status === 'loading' && <p role="status">Carregando registros da campanha…</p>}
      {status === 'ready' && <>
        <section aria-label="Missões abertas" className="panel surface-flow">
          <header className="actions overview-heading"><h2>Missões ativas</h2>
            <button className="quiet" disabled={busy} onClick={() => onNavigate('quests')}>Ver missões</button></header>
          {quests.length ? <ul className="session-list">{quests.slice(0, 3).map((row) => <li key={row.id}>
            <button className="quiet" disabled={busy} onClick={() => onWiki(row.id, 'quests')}>{row.title}</button>
          </li>)}</ul> : <p>Nenhuma missão ativa.</p>}
        </section>
        <section aria-label="Pendências abertas" className="panel surface-flow">
          <header className="actions overview-heading"><h2>Pendências abertas</h2>
            <button className="quiet" disabled={busy} onClick={() => onNavigate('pending')}>Ver pendências</button></header>
          {pending.length ? <ul className="session-list">{pending.slice(0, 3).map((row) => <li key={row.id}>
            <button className="quiet" disabled={busy} onClick={() => onPending(row.id)}>{row.title}</button>
          </li>)}</ul> : <p>Nenhuma pendência aberta.</p>}
        </section>
        <section aria-label="Personagens em destaque" className="panel surface-flow">
          <header className="actions overview-heading"><h2>Personagens em destaque</h2>
            <button className="quiet" disabled={busy} onClick={() => onNavigate('people')}>Ver personagens</button></header>
          {featured.length ? <ul className="session-list">{featured.map((row) => <li key={row.id}>
            <button className="quiet" disabled={busy} onClick={() => onWiki(row.id, 'people')}>{row.title}</button>
          </li>)}</ul> : <p>Nenhum personagem cadastrado.</p>}
        </section>
      </>}
    </div>
  </>
}
