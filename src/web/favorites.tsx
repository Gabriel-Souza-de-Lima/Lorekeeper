import { NavigationIcon } from './navigation-icon.tsx'
import { useEffect, useState } from 'react'
import type { SearchResult } from '../contracts.ts'
import { api } from './api.ts'
import { usePendingNavigation } from './navigation-guard.tsx'
import { categories } from './search.tsx'

export function Favorites({ onOpen }: { onOpen: (result: SearchResult) => void }) {
  const [rows, setRows] = useState<SearchResult[] | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    void api<SearchResult[]>('/api/favorites').then((result) => { if (active) setRows(result) },
      () => { if (active) setError('Não foi possível carregar os favoritos.') })
    return () => { active = false }
  }, [attempt])
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
  const visible = rows?.filter(({ title }) => normalize(title).includes(normalize(filter.trim())))
  return <>
    <header className="page-header"><h1>Favoritos</h1></header>
    <section className="panel surface-flow" aria-label="Documentos favoritos">
      <label>Filtrar favoritos<input value={filter} onChange={(event) => setFilter(event.currentTarget.value)} /></label>
      {error ? <><p role="alert">{error}</p><button onClick={() => { setError(''); setAttempt(attempt + 1) }}>Recarregar favoritos</button></>
        : !visible ? <p role="status">Carregando favoritos…</p>
        : !visible.length ? <p>Nenhum favorito encontrado.</p>
        : <ul className="session-list overview-records">{visible.map((result) => <li key={result.id}>
          <button className="overview-record" aria-label={result.title} onClick={() => onOpen(result)}>
            <span className="record-copy"><strong className="campaign-card-title">{result.title}</strong>
              <small>{result.campaignName} · {categories[result.type]}</small></span>
            <span className="record-arrow"><NavigationIcon name="arrow" /></span>
          </button>
        </li>)}</ul>}
    </section>
  </>
}

export function FavoriteButton({ campaignUrl, id }: { campaignUrl: string; id: string }) {
  const [favorite, setFavorite] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  usePendingNavigation(busy ? { label: 'Alteração de favorito em andamento', blocked: true } : null)
  useEffect(() => {
    let active = true
    void api<SearchResult[]>('/api/favorites').then((items) => {
      if (active) setFavorite(items.some((item) => item.id === id))
    }, () => { if (active) setError('Não foi possível carregar a marcação de favorito.') })
    return () => { active = false }
  }, [id])
  async function toggle() {
    if (favorite === null || busy) return
    setBusy(true)
    setError('')
    try {
      await api(`${campaignUrl}/favorites/${id}`, 'PUT', { favorite: !favorite })
      setFavorite(!favorite)
    } catch { setError('Não foi possível confirmar a alteração nos favoritos.') }
    finally { setBusy(false) }
  }
  return <div>
    <button disabled={favorite === null || busy} onClick={() => void toggle()}>
      {favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    </button>
    {error && <p role="alert">{error}</p>}
  </div>
}
