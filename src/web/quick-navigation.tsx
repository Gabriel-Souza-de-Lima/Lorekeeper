import { useEffect, useId, useRef, useState } from 'react'
import type { SearchFilters, SearchResult } from '../contracts.ts'
import { api } from './api.ts'
import { categories } from './search.tsx'

export type QuickDestination =
  | { kind: 'document'; result: SearchResult }
  | { kind: 'campaign'; campaign: SearchFilters['campaigns'][number] }

const keyOf = (entry: QuickDestination) =>
  entry.kind === 'document' ? entry.result.id : entry.campaign.id

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
}

export function QuickNavigation({ onClose, onNavigate, favoritesOnly }: {
  favoritesOnly: boolean; onClose: () => void; onNavigate: (destination: QuickDestination) => void
}) {
  const labelId = useId()
  const listId = useId()
  const modal = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [matched, setMatched] = useState<{ query: string; docs: SearchResult[] } | null>(null)
  const [campaigns, setCampaigns] = useState<SearchFilters['campaigns']>([])
  const [favorites, setFavorites] = useState<SearchResult[]>([])
  const [loadingError, setLoadingError] = useState('')
  const [searchError, setSearchError] = useState('')
  const [favoriteError, setFavoriteError] = useState('')
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [busy, setBusy] = useState(false)
  const [cursor, setCursor] = useState(0)
  const term = query.trim()

  useEffect(() => {
    const dialog = modal.current
    dialog?.showModal()
    input.current?.focus()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    let active = true
    void api<SearchFilters>('/api/search/filters').then(
      (filters) => { if (active) setCampaigns(filters.campaigns) },
      () => { if (active) setLoadingError('Não foi possível carregar as campanhas.') },
    )
    void api<SearchResult[]>('/api/favorites').then(
      (items) => { if (active) setFavorites(items) },
      () => { if (active) setFavoriteError('Não foi possível carregar os favoritos.') },
    ).finally(() => { if (active) setLoadingFavorites(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (favoritesOnly || !term || !/[\p{L}\p{N}]/u.test(term)) return
    let active = true
    const timer = window.setTimeout(() => {
      void api<SearchResult[]>('/api/search?' + new URLSearchParams({ q: term, prefix: 'true' })).then(
        (items) => { if (active) setMatched({ query: term, docs: items.filter(({ type }) => type !== 'quick_note') }) },
        () => { if (active) setSearchError('Não foi possível consultar os documentos.') },
      )
    }, 180)
    return () => { active = false; window.clearTimeout(timer) }
  }, [term, favoritesOnly])

  const docs = favoritesOnly ? favorites.filter(({ title }) => normalize(title).includes(normalize(term)))
    : term ? matched?.query === term ? matched.docs : [] : favorites
  const entries: QuickDestination[] = [
    ...docs.map((result): QuickDestination => ({ kind: 'document', result })),
    ...(favoritesOnly ? [] : campaigns).filter(({ name }) => normalize(name).includes(normalize(term))).slice(0, 20)
      .map((campaign): QuickDestination => ({ kind: 'campaign', campaign })),
  ]
  const activeIndex = Math.min(cursor, entries.length - 1)
  const current = entries[activeIndex]
  const selected = current?.kind === 'document' ? current.result : null
  const favorite = selected && favorites.some(({ id }) => id === selected.id)

  useEffect(() => {
    if (activeIndex >= 0) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, listId])

  async function toggleFavorite() {
    if (!selected?.campaignId || busy) return
    setBusy(true)
    setFavoriteError('')
    try {
      await api(`/api/campaigns/${selected.campaignId}/favorites/${selected.id}`, 'PUT', { favorite: !favorite })
      setFavorites((items) => favorite ? items.filter(({ id }) => id !== selected.id) : [...items, selected])
      input.current?.focus()
    } catch { setFavoriteError('Não foi possível confirmar a alteração nos favoritos.') }
    finally { setBusy(false) }
  }

  const waiting = !favoritesOnly && term && /[\p{L}\p{N}]/u.test(term) && matched?.query !== term && !searchError
  return <dialog ref={modal} className="panel quick-navigation" aria-labelledby={labelId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
    <h2 id={labelId}>{favoritesOnly ? 'Favoritos' : 'Navegação rápida'}</h2>
    <label>{favoritesOnly ? 'Filtrar favoritos' : 'Localizar campanha ou documento'}<input ref={input} role="combobox" aria-autocomplete="list"
      aria-expanded="true" aria-controls={listId} aria-activedescendant={current ? `${listId}-${activeIndex}` : undefined}
      value={query} maxLength={200} onChange={(event) => {
        setQuery(event.currentTarget.value)
        setCursor(0)
        setSearchError('')
      }}
      onKeyDown={(event) => {
        if (!entries.length || event.nativeEvent.isComposing) return
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          setCursor(Math.max(0, Math.min(entries.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1))))
        }
        if (event.key === 'Enter' && current && !busy) { event.preventDefault(); onNavigate(current) }
      }} /></label>
    {loadingError && <p className="error">{loadingError}</p>}
    {favoriteError && <p className="error">{favoriteError}</p>}
    {searchError && <p className="error">{searchError}</p>}
    {waiting && <p>Buscando documentos…</p>}
    {!waiting && !entries.length && <p>Nenhum resultado.</p>}
    <ul role="listbox" id={listId} aria-label={favoritesOnly ? 'Documentos favoritos' : term ? 'Resultados' : 'Favoritos e campanhas'}>
      {entries.map((entry, index) => <li role="option" id={`${listId}-${index}`} key={`${entry.kind}-${keyOf(entry)}`}
        aria-selected={activeIndex === index} onClick={() => setCursor(index)}>
        {entry.kind === 'document' ? <>
          <strong>{entry.result.title}</strong>
          <span>{entry.result.campaignName} · {categories[entry.result.type]}{entry.result.archived && ' · Arquivada'}</span>
        </> : <>
          <strong>{entry.campaign.name}</strong>
          <span>Campanha{Boolean(entry.campaign.archived) && ' · Arquivada'}</span>
        </>}
      </li>)}
    </ul>
    <div className="actions">
      <button type="button" className="primary" disabled={!current || busy} onClick={() => current && onNavigate(current)}>Abrir selecionado</button>
      {selected && <button type="button" disabled={busy || loadingFavorites} onClick={() => void toggleFavorite()}>
        {favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      </button>}
      <button type="button" disabled={busy} onClick={onClose}>Fechar navegação</button>
    </div>
  </dialog>
}
