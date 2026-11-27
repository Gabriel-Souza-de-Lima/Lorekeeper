import { PendingStatus } from './pending-status.tsx'
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
      {session.number !== null && <span className="record-number" aria-hidden="true">{String(session.number).padStart(2, '0')}</span>}
      <span className="record-copy">
        <strong className="campaign-card-title">{session.title}</strong>
        <span id={`session-meta-${session.id}`} className="context">
          {session.number !== null && <span className="visually-hidden">Sessão {session.number} · </span>}{displayDate(session.date)}
        </span>
        <span id={`session-summary-${session.id}`} className="session-summary">{session.summary?.trim() || 'Sem resumo'}</span>
      </span>
      <span className="record-arrow"><NavigationIcon name="arrow" /></span>
    </button>
    {onTrash && <div className="campaign-card-actions">
      <button disabled={busy} aria-label={`Excluir sessão ${session.title}`}
        onClick={() => onTrash(session.id, session.title)}>Excluir sessão</button>
    </div>}
  </li>)}</ul>
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null
  return <nav className="pager" aria-label="Paginação">
    <button disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button>
    <span aria-live="polite">Página {page} de {pages}</span>
    <button disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima</button>
  </nav>
}

export function SessionCatalog({ rows, busy, onOpen, onTrash }: Parameters<typeof SessionCards>[0]) {
  const [requested, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / 8))
  const page = Math.min(requested, pages)
  return <section className="panel surface-flow" aria-label="Sessões">
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
        <header className="actions overview-heading"><h2><NavigationIcon name="sessions" />Sessões recentes</h2>
          <button className="quiet" disabled={busy} onClick={() => onNavigate('sessions')}><NavigationIcon name="arrow" />Ver todas</button></header>
        <SessionCards rows={sessions.slice(0, 3)} busy={busy} onOpen={onSession} />
      </section>
      {status === 'loading' && <p role="status">Carregando registros da campanha…</p>}
      {status === 'ready' && <>
        <section aria-label="Missões abertas" className="panel surface-flow">
          <header className="actions overview-heading"><h2><NavigationIcon name="quest" />Missões ativas</h2>
            <button className="quiet" disabled={busy} onClick={() => onNavigate('quests')}><NavigationIcon name="arrow" />Ver missões</button></header>
          {quests.length ? <ul className="session-list overview-records">{quests.slice(0, 3).map((row) => <li key={row.id}>
            <button className="overview-record" disabled={busy} onClick={() => onWiki(row.id, 'quests')}>
              <span className="record-copy"><strong className="campaign-card-title">{row.title}</strong><small>Missão · Ativa</small></span>
              <span className="record-arrow"><NavigationIcon name="arrow" /></span>
            </button>
          </li>)}</ul> : <p>Nenhuma missão ativa.</p>}
          {quests.length > 0 && <p className="overview-total">Exibindo {Math.min(3, quests.length)} de {quests.length}</p>}
        </section>
        <section aria-label="Pendências abertas" className="panel surface-flow">
          <header className="actions overview-heading"><h2><NavigationIcon name="pending" />Pendências abertas</h2>
            <button className="quiet" disabled={busy} onClick={() => onNavigate('pending')}><NavigationIcon name="arrow" />Ver pendências</button></header>
          {pending.length ? <ul className="session-list overview-records">{pending.slice(0, 3).map((row) => <li key={row.id}>
            <button className="overview-record" aria-label={row.title} disabled={busy} onClick={() => onPending(row.id)}>
              <span className="record-copy"><strong className="campaign-card-title">{row.title}</strong><PendingStatus state={row.state} /></span>
              <span className="record-arrow"><NavigationIcon name="arrow" /></span>
            </button>
          </li>)}</ul> : <p>Nenhuma pendência aberta.</p>}
          {pending.length > 0 && <p className="overview-total">Exibindo {Math.min(3, pending.length)} de {pending.length}</p>}
        </section>
        <section aria-label="Personagens em destaque" className="panel overview-people">
          <header className="actions overview-heading"><h2><NavigationIcon name="people" />Personagens em destaque</h2>
            <button className="quiet" disabled={busy} onClick={() => onNavigate('people')}><NavigationIcon name="arrow" />Ver personagens</button></header>
          {featured.length ? <ul className="session-list people-grid">{featured.map((row) => <li key={row.id}>
            <button className="overview-record" aria-label={row.title} disabled={busy} onClick={() => onWiki(row.id, 'people')}>
              <NavigationIcon name="people" /><span className="record-copy"><strong>{row.title}</strong>
                <small>{row.type === 'npc' ? 'NPC' : 'Personagem'}</small></span>
              <span className="record-arrow"><NavigationIcon name="arrow" /></span>
            </button>
          </li>)}</ul> : <p>Nenhum personagem cadastrado.</p>}
        </section>
      </>}
    </div>
  </>
}
