import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session, SessionFields } from '../contracts.ts'
import { api, ApiError } from './api.ts'
import { claimDraft, openDraftStore, readDraft, recoverableDrafts, writeDraft } from './draft-store.ts'
import type { LocalDraft } from './draft-store.ts'

interface DraftStorage {
  db: IDBDatabase
  id: string
  release: () => void
}

export function useSessionDraft(path: string, session: Session, archived: boolean) {
  const { id, version: initialVersion, ...initialFields } = session
  const scope = initialVersion === 0 ? `${path}/rascunhos-novos` : `${path}/${id}`
  const [documentId, setDocumentId] = useState(id)
  const [created, setCreated] = useState(initialVersion > 0)
  const url = `${path}/${documentId}`
  const draftPath = created ? url : scope
  const [saved, setSaved] = useState(initialFields)
  const [record, setRecord] = useState<LocalDraft | null>(null)
  const [persisted, setPersisted] = useState<LocalDraft | null>(null)
  const [ready, setReady] = useState(archived)
  const [openAttempt, setOpenAttempt] = useState(0)
  const [recoverable, setRecoverable] = useState<LocalDraft[]>([])
  const [recovering, setRecovering] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<{ message: string; status: number } | null>(null)
  const confirmed = useRef({ fields: initialFields, version: initialVersion })
  const sending = useRef(false)
  const working = useRef<LocalDraft | null>(null)
  const stored = useRef<LocalDraft | null>(null)
  const storage = useRef<DraftStorage | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const locallySaved = record !== null && record === persisted && !storageFailed
  const draft = record?.fields ?? saved

  const persist = useCallback((next: LocalDraft | null, afterCommit = false) => {
    const adopt = () => {
      working.current = next
      setRecord(next)
    }
    if (!afterCommit) adopt()
    const active = storage.current
    if (!active) {
      setStorageFailed(true)
      return Promise.resolve(false)
    }
    const write = queue.current.then(() => writeDraft(active.db, active.id, next)).then(() => {
      if (afterCommit) adopt()
      stored.current = next
      setPersisted(next)
      setStorageFailed(false)
      return true
    }, () => {
      setStorageFailed(true)
      return false
    })
    queue.current = write
    return write
  }, [])

  useEffect(() => {
    if (archived) return
    let cancelled = false

    async function initialize() {
      const db = await openDraftStore()
      let release: (() => void) | null = null
      try {
        const key = initialVersion === 0 ? id : crypto.randomUUID()
        release = await claimDraft(key)
        if (!release) throw new Error('Rascunho indisponível.')
        const drafts = await recoverableDrafts(db, scope)
        if (cancelled) {
          release()
          db.close()
          return
        }
        storage.current = { db, id: key, release }
        setRecoverable(drafts)
        if (working.current) await persist({ ...working.current, id: key })
        else setStorageFailed(false)
      } catch {
        release?.()
        db.close()
        if (!cancelled) setStorageFailed(true)
      }
    }

    void initialize().catch(() => {
      if (!cancelled) setStorageFailed(true)
    }).finally(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
      const active = storage.current
      storage.current = null
      if (active) void queue.current.finally(() => {
        active.release()
        active.db.close()
      })
    }
  }, [archived, id, initialVersion, openAttempt, persist, scope])

  function hasChanges(fields: SessionFields) {
    return (Object.keys(fields) as (keyof SessionFields)[]).some((key) =>
      key === 'title' ? fields.title.trim() !== confirmed.current.fields.title :
        (fields[key] ?? '') !== (confirmed.current.fields[key] ?? ''))
  }

  async function save() {
    const current = working.current
    if (!ready || archived || !current || sending.current || recovering || discarding ||
        storageFailed || (created && failure?.status === 409) || (!current.operation && !hasChanges(current.fields))) return
    sending.current = true
    setSaving(true)
    setFailure(null)
    try {
      const operation = current.operation ?? {
        key: crypto.randomUUID(), version: current.version, generation: current.generation, fields: current.fields,
      }
      if (!await persist({ ...current, operation })) return
      const creating = operation.version === 0
      const headers = { 'Idempotency-Key': operation.key }
      const result = creating
        ? await api<Session>(path, 'POST', { ...operation.fields, id: current.id }, headers)
        : await api<Session>(url, 'PUT', { ...operation.fields, version: operation.version }, headers)
      if (creating) {
        setDocumentId(result.id)
        setCreated(true)
        setRecoverable([])
      }
      const { id: savedId, version, ...fields } = result
      confirmed.current = { fields, version }
      setSaved(fields)
      const latest = working.current
      if (!latest || latest.generation === operation.generation || !hasChanges(latest.fields)) {
        await persist(null)
      } else {
        await persist({ ...latest, path: `${path}/${savedId}`, version, operation: null })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tente novamente.'
      const status = error instanceof ApiError ? error.status : 0
      setFailure({ message, status })
    } finally {
      sending.current = false
      setSaving(false)
    }
  }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (working.current === null || working.current === stored.current) return
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  function replaceDraft(fields: SessionFields, baseVersion?: number) {
    const current = working.current
    const invalid = failure?.status === 400 || failure?.status === 413
    const replaceOperation = invalid || baseVersion !== undefined
    if (replaceOperation) setFailure(null)
    if (baseVersion === undefined && !current?.operation && !sending.current && !hasChanges(fields)) return persist(null)
    return persist({
      id: current?.id ?? storage.current?.id ?? '',
      path: draftPath,
      fields,
      version: baseVersion ?? current?.version ?? confirmed.current.version,
      generation: (current?.generation ?? 0) + 1,
      updatedAt: Date.now(),
      operation: replaceOperation ? null : current?.operation ?? null,
    })
  }

  function update<K extends keyof SessionFields>(key: K, value: SessionFields[K]) {
    void replaceDraft({ ...(working.current?.fields ?? confirmed.current.fields), [key]: value })
  }

  function resolveConflict(server: Session) {
    const current = working.current
    const { id: serverId, version, ...fields } = server
    if (failure?.status !== 409 || !current || serverId !== documentId || version <= current.version) return
    confirmed.current = { fields, version }
    setSaved(fields)
    void replaceDraft(current.fields, version)
  }

  async function discardConflict(server: Session) {
    const current = working.current
    const { id: serverId, version, ...fields } = server
    if (failure?.status !== 409 || !current || serverId !== documentId || version <= current.version || discarding) return
    setDiscarding(true)
    try {
      if (!await persist(null, true)) return
      confirmed.current = { fields, version }
      setSaved(fields)
      setFailure(null)
    } finally {
      setDiscarding(false)
    }
  }

  async function discard() {
    const current = working.current
    if (!current || sending.current || discarding) return
    setDiscarding(true)
    try {
      const server = current.operation ? await api<Session>(`${path}/${created ? documentId : current.id}`).catch((error) => {
        if (!created && error instanceof ApiError && error.status === 404) return null
        throw error
      }) : null
      if (!await persist(null, true)) return
      if (server) {
        const { id: savedId, version, ...fields } = server
        setDocumentId(savedId)
        setCreated(true)
        setRecoverable([])
        confirmed.current = { version, fields }
        setSaved(fields)
      }
      setFailure(null)
    } catch (error) {
      setFailure({ status: error instanceof ApiError ? error.status : 0,
        message: error instanceof Error ? error.message : 'Não foi possível descartar as alterações.' })
    } finally {
      setDiscarding(false)
    }
  }

  function restoreRevision(text: Pick<SessionFields, 'title' | 'body'>) {
    if (archived || !ready || working.current) return
    void replaceDraft({ ...confirmed.current.fields, title: text.title, body: text.body })
  }

  async function recover(candidate: LocalDraft) {
    const active = storage.current
    if (!active || working.current || recovering) return
    setRecovering(true)
    let release: (() => void) | null = null
    try {
      release = await claimDraft(candidate.id)
      if (!release) {
        setRecoverable(await recoverableDrafts(active.db, draftPath))
        return
      }
      const latest = await readDraft(active.db, candidate.id)
      if (!latest || storage.current !== active) {
        setRecoverable((items) => items.filter(({ id }) => id !== candidate.id))
        return
      }
      active.release()
      storage.current = { db: active.db, id: latest.id, release }
      release = null
      working.current = latest
      setRecord(latest)
      stored.current = latest
      setPersisted(latest)
      setRecoverable((items) => items.filter(({ id }) => id !== latest.id))
    } catch {
      setStorageFailed(true)
    } finally {
      release?.()
      setRecovering(false)
    }
  }

  function retry() {
    if (created && failure?.status === 409) return
    if (storageFailed && working.current) {
      if (storage.current) void persist(working.current)
      else {
        setReady(false)
        setOpenAttempt((attempt) => attempt + 1)
      }
    }
    setFailure(null)
  }

  return {
    draft, documentId, created, ready: ready && !recovering && !discarding, dirty: record !== null, locallySaved, storageFailed, saving,
    canSave: ready && !archived && !saving && !recovering && !discarding && !storageFailed &&
      (!created || failure?.status !== 409) && record !== null && (record.operation !== null || hasChanges(record.fields)),
    failure, recoverable, recover, update, save, discard, retry, resolveConflict, discardConflict, restoreRevision,
    baseVersion: record?.version ?? confirmed.current.version,
  }
}
