import { useEffect, useState, type FormEvent } from 'react'
import type { SearchFilters, SearchResult, SearchType } from '../contracts.ts'
import { api } from './api.ts'

export const categories: Record<SearchType, string> = {
  session: 'Sessão', quick_note: 'Anotação rápida', character: 'Personagem',
  npc: 'NPC', location: 'Localidade', quest: 'Missão',
}

export function Search({ working, onBack, onOpen }: {
  working: boolean
  onBack: () => void
  onOpen: (result: SearchResult) => void
}) {
  const [filters, setFilters] = useState<SearchFilters | null>(null)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [filterError, setFilterError] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    void api<SearchFilters>('/api/search/filters').then(
      (options) => { if (active) setFilters(options) },
      () => { if (active) setFilterError(true) },
    )
    return () => { active = false }
  }, [attempt])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = new URLSearchParams()
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === 'string' && value.trim()) query.set(key, value.trim())
    }
    if (!query.has('q')) {
      setError('Informe um termo de busca.')
      setResults(null)
      return
    }
    setPending(true)
    setError('')
    setResults(null)
    try {
      setResults(await api<SearchResult[]>(`/api/search?${query}`))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível realizar a busca.')
    } finally {
      setPending(false)
    }
  }

  return <>
    <button className="quiet" disabled={working} onClick={onBack}>Voltar ao painel</button>
    <h1>Busca global</h1>
    <form className="panel campaign-form" onSubmit={(event) => void submit(event)}>
      <fieldset className="form-grid" disabled={working || pending}>
        <label className="wide">Termos de busca<input name="q" maxLength={200} required /></label>
        <div><label htmlFor="search-campaignId">Campanha</label><select id="search-campaignId" name="campaignId" disabled={!filters}>
          <option value="">Todas</option>
          {filters?.campaigns.map(({ id, name, archived }) => <option key={id} value={id}>
            {name}{archived ? ' (arquivada)' : ''}
          </option>)}
        </select></div>
        <div><label htmlFor="search-type">Categoria</label><select id="search-type" name="type">
          <option value="">Todas</option>
          {Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></div>
        <div><label htmlFor="search-tagId">Tag</label><select id="search-tagId" name="tagId" disabled={!filters}>
          <option value="">Todas</option>
          {filters?.tags.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select></div>
        <div className="actions wide"><button className="primary" type="submit">Buscar</button></div>
      </fieldset>
    </form>
    {filterError && <div className="panel">
      <p className="error" role="alert">Não foi possível carregar os filtros de campanha e tag.</p>
      <button onClick={() => { setFilterError(false); setAttempt((value) => value + 1) }}>Recarregar filtros</button>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
    {pending && <p role="status">Buscando…</p>}
    {results?.length === 0 && <p className="panel empty">Nenhum documento encontrado.</p>}
    {results && results.length > 0 && <ul className="session-list">{results.map((result) => <li key={result.id} className="panel">
      <div>
        <button className="quiet" disabled={working} onClick={() => onOpen(result)}>{result.title}</button>
        <p className="context">{categories[result.type]} · {result.campaignName ?? 'Caixa de entrada'}
          {result.archived ? ' · Campanha arquivada' : ''}</p>
        <p>{result.snippet.map(({ text, match }, index) => match
          ? <mark key={index}>{text}</mark>
          : text)}</p>
      </div>
    </li>)}</ul>}
  </>
}
