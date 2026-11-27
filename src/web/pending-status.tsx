import type { PendingState } from '../contracts.ts'

export const pendingStateLabels: Record<PendingState, string> = {
  open: 'Aberta', investigating: 'Em andamento', resolved: 'Concluída', discarded: 'Cancelada',
}

export function PendingStatus({ state }: { state: PendingState }) {
  return <span className="pending-status" data-state={state}>{pendingStateLabels[state]}</span>
}
