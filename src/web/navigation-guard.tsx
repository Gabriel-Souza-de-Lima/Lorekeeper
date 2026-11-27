import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type Resolve = () => Promise<boolean>
type Pending = {
  label: string
  blocked?: boolean
  keep?: boolean
  discard?: true | Resolve
  save?: Resolve
}

const Navigation = createContext<{
  register: (pending: Pending) => () => void
  leave: (destination: () => void, origin?: HTMLElement | null) => void
} | null>(null)

export function usePendingNavigation(pending: Pending | null) {
  const navigation = useContext(Navigation)
  useLayoutEffect(() => {
    if (pending) return navigation?.register(pending)
  })
}

export function useLeave() {
  const navigation = useContext(Navigation)
  return navigation?.leave ?? ((destination: () => void) => destination())
}

export function NavigationProtection({ children }: { children: ReactNode }) {
  const pending = useRef(new Set<Pending>())
  const modal = useRef<HTMLDialogElement>(null)
  const previous = useRef<HTMLElement | null>(null)
  const [decision, setDecision] = useState<{ entries: Pending[]; destination: () => void } | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(false)

  useLayoutEffect(() => {
    if (decision) modal.current?.showModal()
  }, [decision])

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if ([...pending.current].some((entry) => entry.blocked || !entry.keep)) {
        event.preventDefault()
        event.returnValue = true
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  function close(restore: boolean) {
    modal.current?.close()
    setDecision(null)
    if (restore) previous.current?.focus()
  }

  async function finish(choice: 'save' | 'discard' | 'keep') {
    if (!decision || running) return
    setRunning(true)
    setError(false)
    try {
      for (const entry of decision.entries) {
        const resolve = choice === 'keep' ? true : entry[choice]
        if (!resolve || (typeof resolve === 'function' && !await resolve())) {
          setError(true)
          return
        }
      }
      close(false)
      decision.destination()
    } catch {
      setError(true)
    } finally {
      setRunning(false)
    }
  }

  const entries = decision?.entries ?? []
  const blocked = entries.some((entry) => entry.blocked)
  return <Navigation.Provider value={{
    register: (entry) => {
      pending.current.add(entry)
      return () => { pending.current.delete(entry) }
    },
    leave: (destination, origin) => {
      if (decision) return
      if (!pending.current.size) return destination()
      previous.current = origin ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
      setError(false)
      setDecision({ entries: [...pending.current], destination })
    },
  }}>
    {children}
    <dialog ref={modal} className="panel navigation-protection" aria-labelledby="leave-heading"
      onCancel={(event) => { event.preventDefault(); if (!running) close(true) }}>
      <h2 id="leave-heading">Alterações pendentes</h2>
      <ul>{entries.map((entry, index) => <li key={index}>{entry.label}</li>)}</ul>
      {blocked && <p>Conclua ou verifique a operação indicada antes de sair.</p>}
      {error && <p role="alert">A operação não pôde ser confirmada. Cancele para verificar a edição atual.</p>}
      <div className="actions">
        <button type="button" autoFocus disabled={running} onClick={() => close(true)}>Cancelar</button>
        {!blocked && entries.length === 1 && entries[0].save && <button className="primary" disabled={running || error}
          onClick={() => void finish('save')}>Salvar e continuar</button>}
        {!blocked && entries.length > 0 && entries.every((entry) => entry.discard) &&
          <button disabled={running || error} onClick={() => void finish('discard')}>Descartar e continuar</button>}
        {!blocked && entries.length > 0 && entries.every((entry) => entry.keep) &&
          <button disabled={running || error} onClick={() => void finish('keep')}>Continuar mantendo o rascunho</button>}
      </div>
    </dialog>
  </Navigation.Provider>
}
