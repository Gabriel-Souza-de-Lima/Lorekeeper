import { useLeave, usePendingNavigation } from './navigation-guard.tsx'
import { Attachments } from './attachments.tsx'
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownLayout } from './markdown-layout.tsx'
import { wikiTypes, type Campaign, type WikiDetails, type WikiPage, type WikiSummary, type WikiType } from '../contracts.ts'
import { WikiBacklinks } from './wiki-links.tsx'
import { DocumentTags } from './document-tags.tsx'
import { api, ApiError } from './api.ts'

const labels: Record<WikiType, string> = {
  character: 'Personagem', npc: 'NPC', location: 'Localidade', quest: 'Missão',
}

export function Wiki({ campaign, initialPage, charactersOnly, onOpenSession, onBack, onSearchBack }: {
  campaign: Campaign
  initialPage?: WikiDetails
  charactersOnly?: boolean
  onOpenSession: (id: string) => void
  onBack: () => void
  onSearchBack?: () => void
}) {
  const url = `/api/campaigns/${campaign.id}/wiki`
  const [pages, setPages] = useState<WikiSummary[] | null>(null)
  const [page, setPage] = useState<WikiDetails | null>(initialPage ?? null)
  const [draft, setDraft] = useState<WikiPage | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [titleConflict, setTitleConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const [featuredId, setFeaturedId] = useState(campaign.featuredCharacterId)
  const [refresh, setRefresh] = useState(0)

  const articleHeading = useRef<HTMLHeadingElement>(null)
  const listHeading = useRef<HTMLHeadingElement>(null)
  const opener = useRef<string>(null)
  const list = useRef<HTMLUListElement>(null)

  const leave = useLeave()
  usePendingNavigation(busy || uncertain ? { label: 'Operação da wiki em andamento ou sem confirmação', blocked: true }
    : draft && (draft.title || draft.body || draft.type !== 'character') ? { label: 'Nova página da wiki ainda não confirmada', discard: true,
      save: draft.title.trim() && !campaign.archivedAt ? createPage : undefined,
      saveLabel: 'Criar página e continuar' }
    : title !== null && title !== page?.title ? { label: 'Renomeação da página ainda não confirmada', discard: true } : null)

  useLayoutEffect(() => {
    if (articleHeading.current) articleHeading.current.focus()
    else if (opener.current) {
      const button = Array.from(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
        .find((element) => element.dataset.wikiPage === opener.current)
      const target = button ?? listHeading.current
      target?.focus()
      opener.current = null
    }
  }, [page?.id])

  useEffect(() => {
    let active = true
    void api<WikiSummary[]>(url).then(
      (items) => { if (active) setPages(items) },
      () => { if (active) setError('Não foi possível carregar a wiki.') },
    )
    return () => { active = false }
  }, [refresh, url])

  async function open(id: string) {
    setBusy(true)
    setError('')
    try {
      setPage(await api<WikiDetails>(`${url}/${id}`))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível abrir a página.')
    } finally {
      setBusy(false)
    }
  }

  async function createPage() {
    if (!draft || busy || campaign.archivedAt) return false
    if (!draft.title.trim()) {
      setError('Informe o título da página.')
      return false
    }
    setBusy(true)
    setError('')
    try {
      const created = await api<WikiDetails>(url, 'POST', draft)
      setPages(null)
      setRefresh((value) => value + 1)
      setPage(created)
      setDraft(null)
      setUncertain(false)
      return true
    } catch (failure) {
      const retry = failure instanceof ApiError && (failure.status === 0 || failure.status >= 500)
      setUncertain(retry)
      setError(retry ? 'Não foi possível confirmar a criação. Repita o envio da mesma página.'
        : failure instanceof Error ? failure.message : 'Não foi possível criar a página.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function updatePage(current: WikiDetails) {
    setBusy(true)
    setError('')
    try {
      if (current.type === 'quest') {
        setPage(await api<WikiDetails>(`${url}/${current.id}/quest-state`, 'PUT', { closed: !current.closed }))
      } else {
        const id = featuredId === current.id ? null : current.id
        const updated = await api<Campaign>(`/api/campaigns/${campaign.id}/featured-character`, 'PUT', { id })
        setFeaturedId(updated.featuredCharacterId)
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível atualizar a página.')
    } finally {
      setBusy(false)
    }
  }

  async function saveTitle(event: FormEvent<HTMLFormElement>, current: WikiDetails) {
    event.preventDefault()
    if (!title?.trim() || busy || titleConflict) return
    setBusy(true)
    setError('')
    try {
      const updated = await api<WikiDetails>(`${url}/${current.id}/title`, 'PUT', {
        title, previousTitle: current.title,
      })
      setPage(updated)
      setPages((items) => items?.map((item) => item.id === updated.id ? { ...item, title: updated.title } : item) ?? null)
      setRefresh((value) => value + 1)
      setTitle(null)
      setUncertain(false)
    } catch (failure) {
      if (failure instanceof ApiError && (failure.status === 0 || failure.status >= 500)) setUncertain(true)
      setTitleConflict(failure instanceof ApiError && failure.status === 409)
      setError(failure instanceof Error ? failure.message : 'Não foi possível renomear a página.')
    } finally {
      setBusy(false)
    }
  }

  async function readCurrentTitle(id: string) {
    setBusy(true)
    setError('')
    try {
      const latest = await api<WikiDetails>(`${url}/${id}`)
      setPage(latest)
      setRefresh((value) => value + 1)
      setTitleConflict(false)
      setUncertain(false)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível consultar o título.')
    } finally {
      setBusy(false)
    }
  }

  const feedback = error && <p className="error" role="alert">{error}</p>
  if (page) return <>
    <button className="quiet" disabled={busy} onClick={() => leave(() => { opener.current = page.id; setError(''); setTitle(null); setTitleConflict(false); setPage(null) })}>Voltar à wiki</button>
    {onSearchBack && <button className="quiet" disabled={busy} onClick={() => leave(onSearchBack)}>Voltar à busca</button>}
    <header className="page-header"><div><p className="context">{campaign.name} · {labels[page.type]}</p>
      <h1 ref={articleHeading} tabIndex={-1}>{page.title}</h1></div></header>
    {!campaign.archivedAt && (title === null
      ? <button type="button" disabled={busy} onClick={() => { setError(''); setTitle(page.title) }}>Renomear página</button>
      : <form className="panel campaign-form" onSubmit={(event) => void saveTitle(event, page)}>
        <label>Novo título<input required disabled={busy} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <div className="actions">
          <button type="submit" disabled={busy || titleConflict || !title.trim()}>Salvar título</button>
          {titleConflict && <button type="button" disabled={busy}
            onClick={() => void readCurrentTitle(page.id)}>Consultar título atual</button>}
          <button type="button" disabled={busy} onClick={() => {
            setError(''); setTitleConflict(false); setTitle(null)
          }}>Cancelar</button>
        </div>
      </form>)}
    {page.type === 'quest' && <p>{page.closed ? 'Missão concluída' : 'Missão aberta'}</p>}
    {!campaign.archivedAt && title === null && (page.type === 'quest' || page.type === 'character') &&
      <button disabled={busy} onClick={() => void updatePage(page)}>
        {page.type === 'quest' ? (page.closed ? 'Reabrir missão' : 'Concluir missão')
          : featuredId === page.id ? 'Remover destaque' : 'Destacar personagem'}
      </button>}
    {feedback}
    {page.body.trim() && <article className="panel preview wiki-reading" aria-label="Conteúdo da página"><Markdown skipHtml remarkPlugins={[remarkGfm]}
      components={{ ...markdownLayout, img: ({ alt }) => <span>{alt}</span> }}>{page.body}</Markdown></article>}
    <Fragment key={page.id}>
      <Attachments campaignUrl={`/api/campaigns/${campaign.id}`} documentId={page.id} archived={Boolean(campaign.archivedAt)} />
      <DocumentTags campaignUrl={`/api/campaigns/${campaign.id}`} documentId={page.id} archived={Boolean(campaign.archivedAt)} />
      <WikiBacklinks url={`${url}/${page.id}/backlinks`} busy={busy || title !== null} onOpen={(id) => leave(() => onOpenSession(id))} />
    </Fragment>
  </>
  if (draft) return <>
    <h1>Nova página da wiki</h1>
    <form className="panel campaign-form" onSubmit={(event) => { event.preventDefault(); void createPage() }}>
      <fieldset className="form-grid" disabled={busy || uncertain}>
        <label>Tipo<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as WikiType })}>
          {wikiTypes.map((type) => <option key={type} value={type}>{labels[type]}</option>)}
        </select></label>
        <label>Título<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label className="wide">Descrição<textarea value={draft.body}
          onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
      </fieldset>
      <div className="actions">
        <button className="primary" disabled={busy}>{uncertain ? 'Repetir envio' : 'Criar página'}</button>
        <button type="button" disabled={busy} onClick={() => leave(() => {
          setDraft(null)
          setPage(null)
          setError('')
          setUncertain(false)
          setRefresh((value) => value + 1)
        })}>Voltar à wiki</button>
      </div>
      {feedback}
    </form>
  </>

  const visiblePages = charactersOnly ? pages?.filter(({ type }) => type === 'character') : pages

  return <>
    <button className="quiet" disabled={busy} onClick={() => leave(onBack)}>Voltar à campanha</button>
    {onSearchBack && <button className="quiet" disabled={busy} onClick={() => leave(onSearchBack)}>Voltar à busca</button>}
    <header className="page-header"><div><p className="context">{campaign.name}</p><h1 ref={listHeading} tabIndex={-1}>{charactersOnly ? 'Personagens' : 'Wiki da campanha'}</h1></div>
      {!campaign.archivedAt && <button className="primary" disabled={busy} onClick={() => {
        setError('')
        setDraft({ id: crypto.randomUUID(), type: 'character', title: '', body: '' })
      }}>Nova página</button>}
    </header>
    {feedback}
    {pages === null ? error ? <button onClick={() => { setError(''); setRefresh((value) => value + 1) }}>Recarregar wiki</button>
      : <p>Carregando páginas…</p>
      : !visiblePages?.length ? <p className="panel empty">{charactersOnly ? 'Nenhum personagem cadastrado.' : 'Nenhuma página cadastrada.'}</p>
        : <ul ref={list} className="session-list">{visiblePages.map((item) => <li key={item.id} className="panel">
          <button className="quiet" data-wiki-page={item.id} disabled={busy} onClick={() => void open(item.id)}>{item.title}</button>
          <span>{labels[item.type]}</span>
        </li>)}</ul>}
  </>
}
