import type { NarrativeUpdate } from '../narrative.ts'

export type Mode = 'edit' | 'assessment' | 'evidence' | 'links'
export type Operation = { key: string; generation: number; payload: NarrativeUpdate }
export type NarrativeDraft = {
  key: string
  campaignId: string
  id: string
  tab: string
  mode: Mode
  generation: number
  fields: NarrativeUpdate
  operation: Operation | null
}

export function acknowledge(draft: NarrativeDraft, operation: Operation, version: number): NarrativeDraft | null {
  if (draft.operation?.key !== operation.key) return draft
  if (draft.generation === operation.generation) return null
  return { ...draft, operation: null, fields: { ...draft.fields, version } }
}

export function draftRequest<T>(mode: IDBTransactionMode, job: (store: IDBObjectStore) => IDBRequest<T>, database = 'lorekeeper-narrative') {
  return new Promise<T>((resolve, reject) => {
    const opening = indexedDB.open(database, 1)
    opening.onerror = () => reject(opening.error)
    opening.onupgradeneeded = () => {
      opening.result.createObjectStore('drafts', { keyPath: 'key' }).createIndex('campaign', 'campaignId')
    }
    opening.onsuccess = () => {
      const db = opening.result
      const tx = db.transaction('drafts', mode)
      tx.onabort = () => { db.close(); reject(tx.error) }
      tx.oncomplete = () => { db.close(); resolve(request.result) }
      let request: IDBRequest<T>
      try { request = job(tx.objectStore('drafts')) }
      catch (error) { tx.abort(); reject(error) }
    }
  })
}

export function claimNarrativeDraft(key: string): Promise<(() => void) | null> {
  return new Promise((resolve, reject) => {
    void navigator.locks.request('lorekeeper-narrative:' + key, { ifAvailable: true }, (lock) => {
      if (!lock) return resolve(null)
      return new Promise<void>((release) => resolve(release))
    }).catch(reject)
  })
}
