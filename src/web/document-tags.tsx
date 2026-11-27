import { usePendingNavigation } from './navigation-guard.tsx'
import { useEffect, useId, useState, type FormEvent } from 'react'
import type { DocumentTag } from '../contracts.ts'
import { api } from './api.ts'

export function DocumentTags({ campaignUrl, documentId, archived }: {
  campaignUrl: string
  documentId: string
  archived: boolean
}) {
  const label = useId()
  const input = useId()
  const url = `${campaignUrl}/documents/${documentId}/tags`
  const [tags, setTags] = useState<DocumentTag[] | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  usePendingNavigation(busy ? { label: 'Operação de tag em andamento', blocked: true }
    : name.trim() ? { label: 'Tag ainda não vinculada', discard: true } : null)

  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void api<DocumentTag[]>(url).then(
      (items) => { if (active) setTags(items) },
      () => { if (active) setFailed(true) },
    )
    return () => { active = false }
  }, [attempt, url])

  async function change(tag?: DocumentTag) {
    if (busy || archived) return
    setBusy(true)
    setError('')
    try {
      if (tag) {
        await api<void>(`${url}/${tag.id}`, 'DELETE')
        setTags((items) => items?.filter((item) => item.id !== tag.id) ?? null)
      } else {
        const saved = await api<DocumentTag>(url, 'PUT', { name })
        setTags((items) => items?.some((item) => item.id === saved.id) ? items : [...(items ?? []), saved])
        setName('')
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível alterar as tags.')
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim()) void change()
  }

  return <section className="panel" aria-labelledby={label}>
    <h3 id={label}>Tags</h3>
    {failed ? <><p className="error" role="alert">Não foi possível consultar as tags.</p>
      <button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1) }}>Recarregar tags</button></>
      : tags === null ? <p>Carregando tags…</p>
        : tags.length === 0 ? <p>Nenhuma tag.</p>
          : <ul className="session-list">{tags.map((tag) => <li key={tag.id}>
            <span>{tag.name}</span>
            {!archived && <button type="button" disabled={busy} aria-label={`Remover tag ${tag.name}`}
              onClick={() => void change(tag)}>Remover</button>}
          </li>)}</ul>}
    {!archived && tags !== null && <form className="actions" onSubmit={submit}>
      <label htmlFor={input}>Nome da tag</label>
      <input id={input} maxLength={60} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} />
      <button type="submit" disabled={busy || !name.trim()}>Adicionar tag</button>
    </form>}
    {error && <p className="error" role="alert">{error}</p>}
  </section>
}
