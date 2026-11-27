import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import type { SearchFilters, SearchResult, SearchType } from '../contracts.ts'
import { api } from './api.ts'

export const categories: Record<SearchType, string> = {
  session: 'Sessão', quick_note: 'Anotação rápida', character: 'Personagem',
  npc: 'NPC', location: 'Localidade', quest: 'Missão',
}

export type SearchReturn = { result: SearchResult; unavailable?: boolean }

function resultKey(result: SearchResult) {
  return JSON.stringify([result.campaignId, result.type, result.id])
}

export function Search({ working, onBack, onOpen, returned }: {
  working: boolean
  returned: SearchReturn | null
  onBack: () => void
  onOpen: (result: SearchResult) => void
}) {
  const [filters, setFilters] = useState<SearchFilters | null>(null)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [filterError, setFilterError] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [focusResult, setFocusResult] = useState<string | null>(null)
  const lastQuery = useRef('')
  const [submitted, setSubmitted] = useState<{ query: string; previous?: SearchReturn } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    let active = true
    void api<SearchFilters>('/api/search/filters').then(
      (options) => { if (active) setFilters(options) },
      () => { if (active) setFilterError(true) },
    )
    return () => { active = false }
  }, [attempt])

  useLayoutEffect(() => {
    if (!returned || !lastQuery.current) return
    setPending(true)
    setResults(null)
    setSubmitted({ query: lastQuery.current, previous: returned })
  }, [returned])

  useEffect(() => {
    if (!submitted) return
    let active = true
    const { previous } = submitted
    setPending(true)
    setError('')
    setNotice('')
    setResults(null)
    void api<SearchResult[]>(`/api/search?${submitted.query}`).then(
      (rows) => {
        if (!active) return
        const target = previous ? resultKey(previous.result) : null
        const available = rows.some((row) => resultKey(row) === target)
        setResults(rows)
        if (previous) {
          const opening = previous.unavailable ? 'Não foi possível abrir o resultado anterior.' : ''
          const missing = !available ? 'O resultado anterior saiu da busca.' : ''
          setNotice([opening, missing].filter(Boolean).join(' '))
          setFocusResult(available && !previous.unavailable ? target : '')
        }
      },
      (failure) => {
        if (!active) return
        setError(failure instanceof Error ? failure.message : 'Não foi possível realizar a busca.')
        if (previous?.unavailable) setNotice('Não foi possível abrir o resultado anterior.')
        if (previous) setFocusResult('')
      },
    ).finally(() => { if (active) setPending(false) })
    return () => { active = false }
  }, [submitted])

  useEffect(() => {
    if (focusResult === null || pending || working) return
    const button = Array.from(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      .find((element) => element.dataset.result === focusResult)
    const destination = button ?? heading.current
    destination?.focus()
    setFocusResult(null)
  }, [focusResult, pending, working])

  function submit(event: FormEvent<HTMLFormElement>) {
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
    lastQuery.current = query.toString()
    setSubmitted({ query: lastQuery.current })
  }

  return <>
    <button className="quiet dashboard-shortcut" disabled={working} onClick={onBack}>Voltar ao painel</button>
    <h1>Busca global</h1>
    <form className="panel campaign-form" onSubmit={submit}>
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
    <p role="status">{pending ? 'Buscando…' : notice}</p>
    <h2 ref={heading} tabIndex={-1}>Resultados da busca</h2>
    {results?.length === 0 && <p className="panel empty">Nenhum documento encontrado.</p>}
    {results && results.length > 0 && <ul ref={list} className="session-list">{results.map((result) => <li key={resultKey(result)} className="panel">
      <div>
        <button className="quiet" data-result={resultKey(result)} disabled={working || pending} onClick={() => onOpen(result)}>{result.title}</button>
        <p className="context">{categories[result.type]} · {result.campaignName ?? 'Caixa de entrada'}
          {result.archived ? ' · Campanha arquivada' : ''}</p>
        <p>{result.snippet.map(({ text, match }, index) => match
          ? <mark key={index}>{text}</mark>
          : text)}</p>
      </div>
    </li>)}</ul>}
  </>
}
