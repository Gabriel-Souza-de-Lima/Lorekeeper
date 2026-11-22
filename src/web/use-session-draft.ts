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
  const url = `${path}/${id}`
  const [saved, setSaved] = useState(initialFields)
  const [record, setRecord] = useState<LocalDraft | null>(null)
  const [persisted, setPersisted] = useState<LocalDraft | null>(null)
  const [ready, setReady] = useState(archived)
  const [openAttempt, setOpenAttempt] = useState(0)
  const [recoverable, setRecoverable] = useState<LocalDraft[]>([])
  const [recovering, setRecovering] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<{ message: string; status: number; attempts: number } | null>(null)
  const confirmed = useRef({ fields: initialFields, version: initialVersion })
  const retryCount = useRef(0)
  const working = useRef<LocalDraft | null>(null)
  const stored = useRef<LocalDraft | null>(null)
  const storage = useRef<DraftStorage | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const locallySaved = record !== null && record === persisted && !storageFailed
  const draft = record?.fields ?? saved

  const persist = useCallback((next: LocalDraft | null) => {
    working.current = next
    setRecord(next)
    const active = storage.current
    if (!active) {
      setStorageFailed(true)
      return Promise.resolve(false)
    }
    const write = queue.current.then(() => writeDraft(active.db, active.id, next)).then(() => {
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
        const key = crypto.randomUUID()
        release = await claimDraft(key)
        if (!release) throw new Error('Rascunho indisponível.')
        const drafts = await recoverableDrafts(db, url)
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
  }, [archived, openAttempt, persist, url])

  useEffect(() => {
    if (!ready || archived || !record || saving || failure || storageFailed || recovering) return
    const timeout = window.setTimeout(async () => {
      if (working.current !== record) return
      setSaving(true)
      try {
        const operation = record.operation ?? {
          key: crypto.randomUUID(), version: record.version, generation: record.generation, fields: record.fields,
        }
        if (!await persist({ ...record, operation })) return
        const result = await api<Session>(url, 'PUT', { ...operation.fields, version: operation.version },
          { 'Idempotency-Key': operation.key })
        const fields = { ...operation.fields, title: result.title }
        confirmed.current = { fields, version: result.version }
        setSaved(fields)
        retryCount.current = 0
        const latest = working.current
        if (!latest || latest.generation === operation.generation) {
          await persist(null)
        } else {
          await persist({ ...latest, version: result.version, operation: null })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Tente novamente.'
        const status = error instanceof ApiError ? error.status : 0
        setFailure({ message, status, attempts: retryCount.current++ })
      } finally {
        setSaving(false)
      }
    }, 450)
    return () => window.clearTimeout(timeout)
  }, [archived, failure, persist, ready, record, recovering, saving, storageFailed, url])

  useEffect(() => {
    if (!failure || (failure.status !== 0 && failure.status < 500)) return
    const retry = () => setFailure(null)
    window.addEventListener('online', retry)
    const timer = window.setTimeout(retry, Math.min(2000 * 2 ** failure.attempts, 30000))
    return () => {
      window.removeEventListener('online', retry)
      window.clearTimeout(timer)
    }
  }, [failure])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (working.current === null || working.current === stored.current) return
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  function update<K extends keyof SessionFields>(key: K, value: SessionFields[K]) {
    const current = working.current
    const invalid = failure?.status === 400 || failure?.status === 413
    if (invalid) setFailure(null)
    void persist({
      id: current?.id ?? storage.current?.id ?? '',
      path: url,
      fields: { ...(current?.fields ?? confirmed.current.fields), [key]: value },
      version: current?.version ?? confirmed.current.version,
      generation: (current?.generation ?? 0) + 1,
      updatedAt: Date.now(),
      operation: invalid ? null : current?.operation ?? null,
    })
  }

  async function recover(candidate: LocalDraft) {
    const active = storage.current
    if (!active || working.current || recovering) return
    setRecovering(true)
    let release: (() => void) | null = null
    try {
      release = await claimDraft(candidate.id)
      if (!release) {
        setRecoverable(await recoverableDrafts(active.db, url))
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
    draft, ready: ready && !recovering, dirty: record !== null, locallySaved, storageFailed, saving,
    failure, recoverable, recover, update, retry,
  }
}
