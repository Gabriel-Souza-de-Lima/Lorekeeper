import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assess } from '../../.github/scripts/integration-policy.ts'

const supported = {
  event: 'pull_request', conclusion: 'success', status: 'completed',
  jobs: [{ name: 'validar', status: 'completed', conclusion: 'success' }],
  repository: 'owner/lorekeeper', headRepository: 'owner/lorekeeper', baseRepository: 'owner/lorekeeper',
  headBranch: 'feat/example', baseBranch: 'main', prState: 'open', draft: false, mergeable: true,
  validatedHead: 'head-a', currentHead: 'head-a', validatedBase: 'base-a', currentBase: 'base-a',
  testedCandidate: 'candidate-a', currentCandidate: 'candidate-a',
  paths: ['src/web/main.tsx'],
}

test('IE-01: candidato autorizado com evidência exata é elegível apenas na auditoria', () => {
  assert.equal(assess(supported), 'eligible')
})

const rejected: [string, Partial<typeof supported>][] = [
  ['pendente', { status: 'in_progress' }],
  ['reprovado', { conclusion: 'failure' }],
  ['cancelado', { conclusion: 'cancelled' }],
  ['indisponível', { conclusion: '' }],
  ['job ausente', { jobs: [] }],
  ['job duplicado', { jobs: [...supported.jobs, ...supported.jobs] }],
  ...['queued', 'failure', 'cancelled', 'skipped', 'neutral'].map((conclusion): [string, Partial<typeof supported>] =>
    [`job ${conclusion}`, { jobs: [{ name: 'validar', status: 'completed', conclusion }] }]),
  ['head mudou', { currentHead: 'head-b' }],
  ['base mudou', { currentBase: 'base-b' }],
  ['candidato diferente', { testedCandidate: 'candidate-b' }],
  ['SHA sem evidência', { testedCandidate: '' }],
  ['conflito', { mergeable: false }],
  ['mergeabilidade indeterminada', { mergeable: undefined }],
  ['fork', { headRepository: 'fork/lorekeeper' }],
  ['branch fora da lista', { headBranch: 'unknown/example' }],
  ['destino incorreto', { baseBranch: 'dev' }],
  ['rascunho', { draft: true }],
  ['PR fechado', { prState: 'closed' }],
  ['push da main', { event: 'push' }],
  ['CI privilegiado', { paths: ['.github/workflows/ci.yml'] }],
  ['migração', { paths: ['src/server/database.ts'] }],
  ['arquivos desconhecidos', { paths: [] }],
]

for (const [scenario, changes] of rejected) {
  test(`IE-02–04: bloqueia ${scenario}`, () => {
    assert.notEqual(assess({ ...supported, ...changes }), 'eligible')
  })
}
