import type { SessionFields } from '../contracts.ts'

export interface DraftOperation {
  key: string
  generation: number
  version: number
  fields: SessionFields
}

export interface LocalDraft {
  id: string
  path: string
  fields: SessionFields
  version: number
  generation: number
  updatedAt: number
  operation: DraftOperation | null
}

const storeName = 'drafts'
const lockName = (id: string) => `lorekeeper-draft:${id}`

export function openDraftStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lorekeeper-session-editor', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' }).createIndex('path', 'path')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transact<T>(db: IDBDatabase, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = work(tx.objectStore(storeName))
    tx.oncomplete = () => resolve(request.result)
    tx.onabort = () => reject(tx.error)
  })
}

export async function writeDraft(db: IDBDatabase, id: string, record: LocalDraft | null) {
  if (record) await transact(db, 'readwrite', (store) => store.put(record))
  else await transact(db, 'readwrite', (store) => store.delete(id))
}

export function readDraft(db: IDBDatabase, id: string): Promise<LocalDraft | undefined> {
  return transact(db, 'readonly', (store) => store.get(id))
}

export async function recoverableDrafts(db: IDBDatabase, path: string): Promise<LocalDraft[]> {
  const drafts: LocalDraft[] = await transact(db, 'readonly', (store) => store.index('path').getAll(path))
  const { held } = await navigator.locks.query()
  const active = new Set(held?.map(({ name }) => name))
  return drafts.filter(({ id }) => !active.has(lockName(id))).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function claimDraft(id: string): Promise<(() => void) | null> {
  return new Promise((resolve, reject) => {
    void navigator.locks.request(lockName(id), { ifAvailable: true }, (lock) => {
      if (!lock) return resolve(null)
      return new Promise<void>((release) => resolve(release))
    }).catch(reject)
  })
}
