import { useEffect, useMemo, useRef, useState } from 'react'
import { wikiTypes, type WikiPage, type WikiSummary, type WikiType } from '../contracts.ts'
import { api } from './api.ts'

export type InlineReference = { start: number; end: number; text: string; name: string }

export function inlineReference(field: HTMLTextAreaElement): InlineReference | null {
  const { value, selectionStart: caret, selectionEnd } = field
  if (caret !== selectionEnd) return null
  const lineStart = caret === 0 ? 0 : value.lastIndexOf('\n', caret - 1) + 1
  const prefix = value.slice(lineStart, caret)
  const match = /\[\[([^\[\]\r\n]*)(\]\])?$/.exec(prefix)
  if (!match) return null
  const start = lineStart + match.index
  const tail = match[2] ? null : /^[^\[\]\r\n]*\]\]/.exec(value.slice(caret))
  const end = caret + (tail?.[0].length ?? 0)
  return { start, end, text: value.slice(start, end),
    name: (match[1] + (tail?.[0].slice(0, -2) ?? '')).trim() }
}

const labels: Record<WikiType, string> = {
  character: 'Personagem', npc: 'NPC', location: 'Localidade', quest: 'Missão',
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
}

export function InlineWiki({ campaignUrl, reference, onInsert, onCancel }: {
  campaignUrl: string
  reference: InlineReference | null
  onInsert: (entry: InlineReference, page: WikiSummary) => void
  onCancel: () => void
}) {
  const [pages, setPages] = useState<WikiSummary[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [creation, setCreation] = useState<{ title: string; reference: InlineReference } | null>(null)
  const [category, setCategory] = useState<WikiType>('npc')
  const [busy, setBusy] = useState(false)
  const operation = useRef<{ id: string; title: string; type: WikiType } | null>(null)
  const active = reference !== null
  const path = `${campaignUrl}/wiki`

  useEffect(() => {
    if (!active || pages) return
    let current = true
    void api<WikiSummary[]>(path).then(
      (items) => { if (current) setPages(items) },
      () => { if (current) setError('Não foi possível carregar as páginas da wiki.') },
    )
    return () => { current = false }
  }, [active, attempt, pages, path])

  const catalog = useMemo(() => pages?.map((page) => ({ page, key: normalize(page.title) })) ?? [], [pages])
  if (!reference) return null
  const query = normalize(reference.name)
  const matches = catalog.filter(({ key }) => key.includes(query))
  const visible = matches.slice(0, 12)

  async function create() {
    if (!creation || busy) return
    const { title, reference: original } = creation
    if (operation.current?.title !== title || operation.current?.type !== category) {
      operation.current = { id: crypto.randomUUID(), title, type: category }
    }
    setBusy(true)
    setError('')
    try {
      const saved = await api<WikiPage>(path, 'POST', { ...operation.current, body: '' })
      setPages((items) => [...(items ?? []).filter((page) => page.id !== saved.id), saved])
      setCreation(null)
      operation.current = null
      onInsert(original, saved)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível criar a página.')
    } finally { setBusy(false) }
  }

  function cancel() {
    setCreation(null)
    setError('')
    onCancel()
  }

  const form = creation?.reference.text === reference.text && creation.reference.start === reference.start
  return <section className="inline-wiki" aria-label="Referência da wiki"
    onKeyDown={(event) => { if (event.key === 'Escape' && !busy) { event.preventDefault(); cancel() } }}>
    <h2>Referência da wiki</h2>
    {error && <p className="error">{error}</p>}
    {!pages && (error ? <button type="button" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>
      Recarregar páginas</button> : <p>Carregando páginas…</p>)}
    {pages && (form ? <>
      <p>Criar <strong>{creation.title}</strong></p>
      <label>Categoria da página<select value={category} disabled={busy}
        onChange={(event) => setCategory(event.currentTarget.value as WikiType)}>
        {wikiTypes.map((type) => <option key={type} value={type}>{labels[type]}</option>)}
      </select></label>
      <button type="button" disabled={busy} onClick={() => void create()}>Confirmar criação</button>
    </> : <>
      {visible.length ? <ul className="session-list">{visible.map(({ page, key }) => <li key={page.id}>
        <button type="button" disabled={busy} onClick={() => onInsert(reference, page)}>
          {page.title} · {labels[page.type]}
          {matches.some((other) => other.page.id !== page.id && other.page.type === page.type && other.key === key)
            && ` · ${page.id}`}
        </button>
      </li>)}</ul> : <p>Nenhuma página correspondente.</p>}
      {matches.length > visible.length && <p>Digite mais caracteres para filtrar as páginas.</p>}
      {reference.name && !matches.some(({ key }) => key === query) &&
        <button type="button" disabled={busy} onClick={() => {
          setError('')
          setCreation({ title: reference.name, reference })
        }}>Criar página da wiki</button>}
    </>)}
    <button type="button" className="quiet" disabled={busy} onClick={cancel}>Cancelar referência</button>
  </section>
}
