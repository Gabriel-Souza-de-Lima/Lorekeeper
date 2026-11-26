import { Narrative } from './narrative.tsx'
import { Attachments } from './attachments.tsx'
import { PendingItems } from './pending-items.tsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import type { Campaign, CampaignFields, CampaignStatus, Session, SessionSummary, WikiDetails, SearchResult } from '../contracts.ts'
import { api, displayDate, localDate } from './api.ts'
import { CampaignNotes, NoteList, type Note } from './note-assignment.tsx'
import { QuickNotes } from './quick-notes.tsx'
import { TextImport } from './text-import.tsx'
import { Search, type SearchReturn } from './search.tsx'
import { QuickNavigation, type QuickDestination } from './quick-navigation.tsx'
import { SessionEditor, type SessionNavigation } from './session-editor.tsx'
import { CampaignResume } from './campaign-recap.tsx'
import { Wiki } from './wiki.tsx'
import './style.css'

const campaignPath = '/api/campaigns'
const narrowNavigation = '(width < 760px)'
const statusLabels: Record<CampaignStatus, string> = { active: 'Ativa', paused: 'Pausada', finished: 'Encerrada' }

type View = (
  | { page: 'dashboard' }
  | { page: 'search' }
  | { page: 'text-import' }
  | { page: 'search-note'; note: Note; campaign: Campaign | null }
  | { page: 'quick-notes' }
  | { page: 'new' }
  | { page: 'campaign' | 'edit'; campaign: Campaign }
  | { page: 'information'; campaign: Campaign }
  | { page: 'pending-items'; campaign: Campaign; itemId?: string }
  | { page: 'campaign-notes'; campaign: Campaign; noteId?: string }
  | { page: 'session-trash'; campaign: Campaign; rows: SessionSummary[] }
  | { page: 'wiki'; campaign: Campaign; initialPage?: WikiDetails; charactersOnly?: boolean }
  | { page: 'session'; campaign: Campaign; session: Session }

) & { searchResult?: SearchResult }

const campaignMetadata = [
  ['name', 'Nome'], ['system', 'Sistema'], ['rulesVersion', 'Versão das regras'], ['gameMaster', 'Mestre'],
] as const

function CampaignForm({ initial, busy, onSave, onCancel }: {
  initial?: Campaign
  busy: boolean
  onSave: (fields: CampaignFields) => void
  onCancel: () => void
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    onSave({
      name: String(fields.get('name') ?? ''),
      system: String(fields.get('system') ?? ''),
      rulesVersion: String(fields.get('rulesVersion') ?? ''),
      gameMaster: String(fields.get('gameMaster') ?? ''),
      description: String(fields.get('description') ?? ''),
      notes: String(fields.get('notes') ?? ''),
      status: (fields.get('status') as CampaignStatus | null) ?? 'active',
    })
  }

  return (
    <>
      <h1>{initial ? 'Editar campanha' : 'Nova campanha'}</h1>
      <form className="panel campaign-form" onSubmit={submit}>
        <fieldset className="form-grid" disabled={busy}>
          {campaignMetadata.slice(0, initial ? undefined : 1).map(([field, label]) => (
            <label key={field}>{label}<input name={field} defaultValue={initial?.[field]}
              required={field === 'name'} autoFocus={field === 'name'} /></label>
          ))}
          {initial && <>
            <label>Estado<select name="status" defaultValue={initial.status}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label className="wide">Descrição<textarea name="description" defaultValue={initial.description} /></label>
            <label className="wide">Observações<textarea name="notes" defaultValue={initial.notes} /></label>
          </>}
          <div className="actions wide">
            <button className="primary" type="submit">{initial ? 'Salvar campanha' : 'Criar campanha'}</button>
            <button type="button" onClick={onCancel}>Cancelar</button>
          </div>
        </fieldset>
      </form>
    </>
  )
}

function App() {
  const [searchReturn, setSearchReturn] = useState<SearchReturn | null>(null)
  const [view, setView] = useState<View>({ page: 'dashboard' })
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [archived, setArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const [navigationOpen, setNavigationOpen] = useState(() => !window.matchMedia(narrowNavigation).matches)
  const pageHeading = useRef<HTMLElement>(null)
  const focusDestination = useRef<string | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const quickOrigin = useRef<HTMLElement | null>(null)
  const sessionNavigation = useRef<SessionNavigation>(null)
  const shortcutAvailable = !['text-import', 'information', 'pending-items', 'edit', 'new', 'quick-notes', 'campaign-notes', 'wiki'].includes(view.page)

  const campaignContext = 'campaign' in view ? view.campaign : null
  // Views with their own pending work use their existing return controls.
  const canNavigate = shortcutAvailable

  useEffect(() => {
    const media = window.matchMedia(narrowNavigation)
    const resetNavigation = (event: MediaQueryListEvent) => setNavigationOpen(!event.matches)
    media.addEventListener('change', resetNavigation)
    return () => media.removeEventListener('change', resetNavigation)
  }, [])

  useEffect(() => {
    if (!focusDestination.current) return
    const target = focusDestination.current
    focusDestination.current = null
    const heading = pageHeading.current?.querySelector<HTMLElement>(target)
    if (heading && (target !== 'h1' || !pageHeading.current?.contains(document.activeElement))) {
      heading.tabIndex = -1
      heading.focus()
    }
  }, [view])

  function navigate(task: () => void, target = 'h1') {
    if (sessionNavigation.current && !sessionNavigation.current.canLeave()) return
    focusDestination.current = target
    setError('')
    if (window.matchMedia(narrowNavigation).matches) setNavigationOpen(false)
    task()
  }

  const openQuick = useCallback(() => {
    quickOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setQuickOpen(true)
  }, [])

  useEffect(() => {
    if (!shortcutAvailable || quickOpen || working) return
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey ||
          !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      openQuick()
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [shortcutAvailable, quickOpen, openQuick, working])

  useEffect(() => {
    if (view.page !== 'dashboard') return
    let ignore = false
    void api<Campaign[]>(`${campaignPath}?archived=${archived}`).then(
      (rows) => { if (!ignore) { setCampaigns(rows); setLoading(false) } },
      () => { if (!ignore) { setError('Não foi possível carregar as campanhas.'); setLoading(false) } },
    )
    return () => { ignore = true }
  }, [archived, view])

  async function action(task: () => Promise<void>) {
    setError('')
    setWorking(true)
    try {
      await task()
    } catch (failure) {
      focusDestination.current = null
      setError(failure instanceof Error ? failure.message : 'A operação falhou.')
    } finally {
      setWorking(false)
    }
  }

  function dashboard() {
    setError('')
    setLoading(true)
    setView({ page: 'dashboard' })
  }

  async function openCampaign(id: string, page: 'campaign' | 'edit' = 'campaign') {
    const url = `${campaignPath}/${id}`
    const [campaign, rows] = await Promise.all([api<Campaign>(url), api<SessionSummary[]>(`${url}/sessions`)])
    setSessions(rows)
    setView({ page, campaign })
  }

  function campaignForm(initial?: Campaign) {
    return <CampaignForm key={initial?.id ?? 'new'} initial={initial} busy={working}
      onCancel={() => initial ? setView({ page: 'campaign', campaign: initial }) : dashboard()}
      onSave={(fields) => void action(async () => {
        if (initial) {
          const campaign = await api<Campaign>(`${campaignPath}/${initial.id}`, 'PUT', fields)
          setView({ page: 'campaign', campaign })
        } else {
          const created = await api<Campaign>(campaignPath, 'POST', { name: fields.name })
          setSessions([])
          setView({ page: 'campaign', campaign: created })
        }
      })} />
  }

  function openWikiPage(campaign: Campaign, id: string) {
    void action(async () => {
      const initialPage = await api<WikiDetails>(`${campaignPath}/${campaign.id}/wiki/${id}`)
      setView({ page: 'wiki', campaign, initialPage })
    })
  }

  function trashSession(campaign: Campaign, id: string, title: string) {
    if (!window.confirm(`Mover a sessão “${title}” para a lixeira? Ela poderá ser restaurada.`)) return
    void action(async () => {
      await api(`${campaignPath}/${campaign.id}/sessions/${id}/trash`, 'PATCH', { trashed: true })
      await openCampaign(campaign.id)
    })
  }

  async function openTrash(campaign: Campaign) {
    const rows = await api<SessionSummary[]>(`${campaignPath}/${campaign.id}/sessions?trashed=true`)
    setView({ page: 'session-trash', campaign, rows })
  }

  function campaignDestinations(campaign: Campaign, lateral: boolean) {
    const disabled = working || !canNavigate
    return <nav className={lateral ? 'sidebar-links' : 'actions campaign-destinations'} aria-label={`Campanha ${campaign.name}`}>
      {lateral && <>
        <p className="context">{campaign.name}</p>
        <button className="quiet" disabled={disabled} aria-current={view.page === 'campaign' ? 'page' : undefined}
          onClick={() => navigate(() => void action(() => openCampaign(campaign.id)))}>Visão geral</button>
      </>}
      <button className="quiet" disabled={disabled} aria-current={view.page === 'session' ? 'page' : undefined}
        onClick={() => {
          if (view.page !== 'campaign') {
            navigate(() => void action(() => openCampaign(campaign.id)), '#campaign-sessions')
            return
          }
          if (window.matchMedia(narrowNavigation).matches) setNavigationOpen(false)
          document.getElementById('campaign-sessions')?.focus()
        }}>Sessões</button>
      <button className="quiet" disabled={disabled}
        aria-current={view.page === 'wiki' && !view.charactersOnly ? 'page' : undefined}
        onClick={() => navigate(() => setView({ page: 'wiki', campaign }))}>Wiki da campanha</button>
      <button className="quiet" disabled={disabled}
        aria-current={view.page === 'wiki' && view.charactersOnly ? 'page' : undefined}
        onClick={() => navigate(() => setView({ page: 'wiki', campaign, charactersOnly: true }))}>Personagens</button>
      <button className="quiet" disabled={disabled} aria-current={view.page === 'pending-items' ? 'page' : undefined}
        onClick={() => navigate(() => setView({ page: 'pending-items', campaign }))}>Pendências</button>
      <button className="quiet" disabled={disabled} aria-current={view.page === 'information' ? 'page' : undefined}
        onClick={() => navigate(() => setView({ page: 'information', campaign }))}>Informações</button>
      <button className="quiet" disabled={disabled} aria-current={view.page === 'campaign-notes' ? 'page' : undefined}
        onClick={() => navigate(() => setView({ page: 'campaign-notes', campaign }))}>Anotações da campanha</button>
    </nav>
  }

  function campaignPage(campaign: Campaign) {
    const url = `${campaignPath}/${campaign.id}`
    const locked = Boolean(campaign.archivedAt)
    const openSession = (id?: string) => void action(async () => {
      const session = id
        ? await api<Session>(`${url}/sessions/${id}`)
        : { id: crypto.randomUUID(), version: 0, title: 'Nova sessão', date: localDate(),
          fictionalDate: '', participants: '', number: null, body: '' }
      setView({ page: 'session', campaign, session })
    })

    return (
      <>
        <button className="quiet" disabled={working} onClick={dashboard}>Voltar ao painel</button>
        <header className="page-header">
          <div><p className="context">{locked ? 'Campanha arquivada' : statusLabels[campaign.status]}</p>
            <h1>{campaign.name}</h1>{campaign.description && <p>{campaign.description}</p>}</div>
          {!locked && <button className="primary" disabled={working} onClick={() => openSession()}>Nova sessão</button>}
        </header>
        {!navigationOpen && campaignDestinations(campaign, false)}
        <div className="campaign-summary">
          <span>{campaign.system || 'Sistema a definir'}{campaign.rulesVersion && ` · ${campaign.rulesVersion}`}</span>
          <span>{campaign.sessionCount} {campaign.sessionCount === 1 ? 'sessão' : 'sessões'}</span>
          {campaign.lastSessionDate && <span>Última sessão em {displayDate(campaign.lastSessionDate)}</span>}
        </div>
        <div className="campaign-columns">
          <div>
            <CampaignResume key={campaign.id} campaign={campaign} busy={working} onSession={openSession}
              onWiki={(id) => openWikiPage(campaign, id)}
              onPending={(itemId) => setView({ page: 'pending-items', campaign, itemId })}
              onNote={(noteId) => setView({ page: 'campaign-notes', campaign, noteId })} />
            <section>
              <header className="page-header"><h2 tabIndex={-1} id="campaign-sessions">Sessões</h2></header>
              {sessions.length === 0 && <p className="empty">Nenhuma sessão registrada</p>}
              <ul className="session-list">
                {sessions.map((session) => <li key={session.id} className="panel">
                  <button className="quiet" disabled={working} onClick={() => openSession(session.id)}>{session.title}</button>
                  <span>{session.number !== null && `Sessão ${session.number} · `}{displayDate(session.date)}</span>
                  {!locked && <button disabled={working} aria-label={`Excluir sessão ${session.title}`}
                    onClick={() => trashSession(campaign, session.id, session.title)}>Excluir sessão</button>}
                </li>)}
              </ul>
            </section>
          </div>
          <div className="campaign-secondary">
            <Attachments key={url} campaignUrl={url} archived={locked} navigationPending={working} />
            <div className="actions" role="group" aria-label="Gerenciar campanha">
              <button disabled={working} onClick={() => void action(() => openTrash(campaign))}>Lixeira de sessões</button>
              {!locked && <button disabled={working} onClick={() => { setError(''); setView({ page: 'edit', campaign }) }}>
                Editar campanha
              </button>}
              <button disabled={working} onClick={() => void action(async () => {
                const updated = await api<Campaign>(url, 'PATCH', { archived: !locked })
                setView({ page: 'campaign', campaign: updated })
              })}>{locked ? 'Reativar campanha' : 'Arquivar campanha'}</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  function startSearch() {
    setSearchReturn(null)
    setView({ page: 'search' })
  }

  function returnToSearch(result: SearchResult) {
    setSearchReturn({ result })
    setView({ page: 'search' })
  }

  function openSearchResult(result: SearchResult, fromSearch = false) {
    void action(async () => {
      const searchResult = fromSearch ? result : undefined
      try {
        const url = `${campaignPath}/${result.campaignId}`
        const campaign = result.campaignId ? await api<Campaign>(url) : null
        if (result.type === 'quick_note') {
          const notes = await api<Note[]>(campaign ? `${url}/quick-notes` : '/api/quick-notes')
          const note = notes.find((item) => item.id === result.id)
          if (!note) throw new Error('Anotação não encontrada. Atualize a busca.')
          setView({ page: 'search-note', note, campaign, searchResult })
        } else if (campaign && result.type === 'session') {
          const session = await api<Session>(`${url}/sessions/${result.id}`)
          setView({ page: 'session', campaign, session, searchResult })
        } else if (campaign) {
          const initialPage = await api<WikiDetails>(`${url}/wiki/${result.id}`)
          setView({ page: 'wiki', campaign, initialPage, searchResult })
        } else {
          throw new Error('Campanha indisponível. Atualize a busca.')
        }
      } catch (failure) {
        if (!fromSearch) throw failure
        setSearchReturn({ result, unavailable: true })
      }
    })
  }

  function navigateQuick(destination: QuickDestination) {
    if (sessionNavigation.current && !sessionNavigation.current.canLeave()) return
    setQuickOpen(false)
    if (destination.kind === 'campaign') void action(() => openCampaign(destination.campaign.id))
    else openSearchResult(destination.result)
  }

  function currentPage() {
    const result = view.searchResult
    const onSearchBack = result ? () => returnToSearch(result) : undefined
    switch (view.page) {
      case 'text-import': return <TextImport onBack={dashboard}
        onOpen={(campaign, session) => setView({ page: 'session', campaign, session })} />
      case 'search': return null
      case 'search-note': return <>
        <button className="quiet" onClick={onSearchBack ?? startSearch}>Voltar à busca</button>
        <header className="page-header"><div>
          <p className="context">{view.campaign?.name ?? 'Caixa de entrada'}</p>
          <h1>Anotação rápida</h1>
        </div></header>
        <NoteList items={[view.note]} />
      </>
      case 'quick-notes': return <QuickNotes onBack={dashboard} />
      case 'new': return campaignForm()
      case 'edit': return campaignForm(view.campaign)
      case 'campaign': return campaignPage(view.campaign)
      case 'wiki': return <Wiki key={view.campaign.id} campaign={view.campaign} initialPage={view.initialPage} charactersOnly={view.charactersOnly} onSearchBack={onSearchBack}
        onOpenSession={(id) => void action(async () => {
          const session = await api<Session>(`${campaignPath}/${view.campaign.id}/sessions/${id}`)
          setView({ page: 'session', campaign: view.campaign, session })
        })}
        onBack={() => void action(() => openCampaign(view.campaign.id))} />
      case 'session-trash': return <>
        <button className="quiet" disabled={working}
          onClick={() => void action(() => openCampaign(view.campaign.id))}>Voltar à campanha</button>
        <header className="page-header"><div>
          <p className="context">{view.campaign.name}</p><h1>Lixeira de sessões</h1>
        </div></header>
        {view.rows.length === 0 && <p className="panel empty">Nenhuma sessão na lixeira.</p>}
        {view.rows.length > 0 && <ul className="session-list">{view.rows.map((row) => <li key={row.id} className="panel">
          <strong>{row.title}</strong><span>{displayDate(row.date)}</span>
          {!view.campaign.archivedAt && <button disabled={working} aria-label={`Restaurar sessão ${row.title}`}
            onClick={() => void action(async () => {
              await api(`${campaignPath}/${view.campaign.id}/sessions/${row.id}/trash`, 'PATCH', { trashed: false })
              await openTrash(view.campaign)
            })}>Restaurar sessão</button>}
        </li>)}</ul>}
      </>
      case 'information': return <Narrative key={view.campaign.id} campaign={view.campaign}
        onBack={() => void action(() => openCampaign(view.campaign.id))}
        onPending={(itemId) => setView({ page: 'pending-items', campaign: view.campaign, itemId })}
        onDocument={(id, type) => {
          if (type !== 'session') return openWikiPage(view.campaign, id)
          void action(async () => {
            const session = await api<Session>(`${campaignPath}/${view.campaign.id}/sessions/${id}`)
            setView({ page: 'session', campaign: view.campaign, session })
          })
        }} />
      case 'pending-items': return <PendingItems campaign={view.campaign} itemId={view.itemId}
        onBack={() => void action(() => openCampaign(view.campaign.id))}
        onSession={(id) => void action(async () => {
          const session = await api<Session>(`${campaignPath}/${view.campaign.id}/sessions/${id}`)
          setView({ page: 'session', campaign: view.campaign, session })
        })}
        onWiki={(id) => openWikiPage(view.campaign, id)} />
      case 'campaign-notes': return <CampaignNotes campaign={view.campaign} noteId={view.noteId}
        onBack={() => setView({ page: 'campaign', campaign: view.campaign })} />
      case 'session': return <SessionEditor key={view.session.id} navigationRef={sessionNavigation} onSearchBack={onSearchBack} campaignName={view.campaign.name}
        campaignUrl={`${campaignPath}/${view.campaign.id}`}
        session={view.session} archived={Boolean(view.campaign.archivedAt)}
        path={`${campaignPath}/${view.campaign.id}/sessions`}
        onOpenWiki={(id) => openWikiPage(view.campaign, id)}
        onTrash={(id, title) => trashSession(view.campaign, id, title)}
        onBack={() => void action(() => openCampaign(view.campaign.id))} />
      case 'dashboard': return (
        <>
          <header className="page-header">
            <h1>Campanhas</h1>
            <div className="actions">
              <button className="dashboard-shortcut" disabled={working}
                onClick={() => navigate(() => setView({ page: 'quick-notes' }))}>Anotações rápidas</button>
              <button className="dashboard-shortcut" disabled={working}
                onClick={() => navigate(startSearch)}>Busca</button>
              <button disabled={working} onClick={() => { setError(''); setView({ page: 'text-import' }) }}>Importar texto</button>
              <a className="quiet" href="/api/export" download>Exportar acervo</a>
              <button className="primary" disabled={working} onClick={() => { setError(''); setView({ page: 'new' }) }}>
                Nova campanha
              </button>
            </div>
          </header>
          <div className="tabs" aria-label="Visualizar campanhas">
            <button disabled={working} aria-pressed={!archived} onClick={() => {
              if (archived) { setLoading(true); setError(''); setArchived(false) }
              else if (error) dashboard()
            }}>Em andamento</button>
            <button disabled={working} aria-pressed={archived} onClick={() => {
              if (!archived) { setLoading(true); setError(''); setArchived(true) }
              else if (error) dashboard()
            }}>Arquivadas</button>
          </div>
          {loading ? <p>Carregando campanhas…</p> : !error && campaigns.length === 0 &&
            <p className="panel empty">{archived ? 'Nenhuma campanha arquivada.' : 'Crie uma campanha para começar seu diário de sessões.'}</p>}
          {!loading && <div className="cards">
            {campaigns.map((campaign) => <article className="panel campaign-card" key={campaign.id}>
              <h2 className="campaign-card-heading">
                <button className="campaign-card-open" aria-label={campaign.name} disabled={working}
                  onClick={() => navigate(() => void action(() => openCampaign(campaign.id)))}>
                  <span className="context">{archived ? 'Arquivada' : statusLabels[campaign.status]}</span>
                  <span className="campaign-card-title">{campaign.name}</span>
                  <span className="campaign-card-meta">
                    {campaign.system && `${campaign.system} · `}
                    {campaign.sessionCount} {campaign.sessionCount === 1 ? 'sessão' : 'sessões'}
                    {campaign.lastSessionDate && ` · ${displayDate(campaign.lastSessionDate)}`}
                  </span>
                </button>
              </h2>
              {!archived && <div className="campaign-card-actions">
                <button className="quiet" aria-label={`Editar ${campaign.name}`} disabled={working}
                  onClick={() => navigate(() => void action(() => openCampaign(campaign.id, 'edit')))}>Editar</button>
              </div>}
            </article>)}
          </div>}
        </>
      )
    }
  }

  return <div className={navigationOpen ? 'app-shell' : 'app-shell navigation-closed'}>
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="brand">Lorekeeper</span>
        <button className="navigation-toggle" type="button" aria-label="Navegação" aria-expanded={navigationOpen} aria-controls="sidebar-destinations"
          title={navigationOpen ? 'Recolher navegação' : 'Expandir navegação'}
          onClick={() => setNavigationOpen((open) => !open)}>
          <span className="navigation-icon" aria-hidden="true" /><span className="navigation-label">Navegação</span>
        </button>
      </div>
      <div id="sidebar-destinations" hidden={!navigationOpen}>
        <nav className="sidebar-links" aria-label="Acervo">
          <p className="context">Acervo</p>
          <button className="quiet" aria-current={view.page === 'dashboard' ? 'page' : undefined}
            disabled={working || !canNavigate} onClick={() => navigate(dashboard)}>Campanhas</button>
          <button className="quiet" disabled={working || !canNavigate} aria-current={view.page === 'search' ? 'page' : undefined}
            onClick={() => navigate(startSearch)}>Busca</button>
          <button className="quiet" disabled={working || !canNavigate} aria-current={view.page === 'quick-notes' ? 'page' : undefined}
            onClick={() => navigate(() => setView({ page: 'quick-notes' }))}>Anotações rápidas</button>
        </nav>
        {campaignContext && campaignDestinations(campaignContext, true)}
      </div>
    </aside>
    <main ref={pageHeading} className={view.page === 'dashboard' || view.page === 'campaign' ? 'main-overview' : undefined}>
      {shortcutAvailable && <button className="quiet" type="button" disabled={working}
        aria-keyshortcuts="Control+K Meta+K" aria-label="Navegação rápida" aria-description="Localizar campanhas e favoritos" onClick={openQuick}>
        Navegação rápida <span className="shortcut-context">· Favoritos</span>
      </button>}
      {quickOpen && <QuickNavigation onNavigate={navigateQuick} onClose={() => {
        setQuickOpen(false)
        window.requestAnimationFrame(() => quickOrigin.current?.focus())
      }} />}
      {error && <p role="alert" className="error panel">{error}</p>}
      {currentPage()}
      {(view.page === 'search' || view.searchResult) && <div hidden={view.page !== 'search'}>
        <Search working={working} onBack={dashboard} onOpen={(result) => openSearchResult(result, true)} returned={searchReturn} />
      </div>}
    </main>
  </div>
}

createRoot(document.getElementById('root')!).render(<App />)
