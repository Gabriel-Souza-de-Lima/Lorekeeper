import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ordinaryChange, candidateApproved, strictRules } from '../../.github/scripts/github-app-policy.ts'

const files = [{ filename: 'docs/specs/ensaio-ci.md' }]
const pr = { number: 7, head: 'branch-sha', candidate: 'candidate-sha' }
const run = { event: 'pull_request', status: 'completed', conclusion: 'success', head_sha: 'branch-sha' }
const job = { name: 'validar', status: 'completed', conclusion: 'success', steps: [
  { name: 'PR 7 candidato candidate-sha', status: 'completed', conclusion: 'success' },
] }
const rules = [{ type: 'pull_request', ruleset_id: 1, parameters: { required_approving_review_count: 0 } },
  { type: 'required_status_checks', ruleset_id: 1, parameters: {
    strict_required_status_checks_policy: true, required_status_checks: [{ context: 'validar', integration_id: 15368 }, { context: 'integracao-lorekeeper', integration_id: 42 }],
  } }]

test('IA-01/03: apenas mudança comum e explicitamente selecionada', () => {
  assert.equal(ordinaryChange('codex/ensaio', files), true)
  assert.equal(ordinaryChange('feat/ensaio', files), false)
  assert.equal(ordinaryChange('codex/ensaio', []), false)
  assert.equal(ordinaryChange('codex/ensaio', [{ filename: 'src/web/a.ts', previous_filename: '.github/workflows/ci.yml' }]), false)
  assert.equal(ordinaryChange('codex/ensaio', [{ filename: 'src/server/database.ts' }]), false)
})

test('IA-02: exige CI e validar aprovados para o candidato corrente', () => {
  assert.equal(candidateApproved(pr, run, [job]), true)
  assert.equal(candidateApproved({ ...pr, candidate: 'outro' }, run, [job]), false)
  assert.equal(candidateApproved({ ...pr, head: 'novo' }, run, [job]), false)
  for (const conclusion of ['pending', 'failure', 'cancelled', 'neutral', 'skipped', '']) {
    assert.equal(candidateApproved(pr, { ...run, conclusion }, [job]), false)
    assert.equal(candidateApproved(pr, run, [{ ...job, conclusion }]), false)
  }
  assert.equal(candidateApproved(pr, run, []), false)
  assert.equal(candidateApproved(pr, run, [job, job]), false)
})

test('IA-04: exige regras efetivas da mesma origem sem permissões de bypass', () => {
  assert.equal(strictRules(rules, [{ id: 1, enforcement: 'active', bypass_actors: [] }], 42), true)
  assert.equal(strictRules(rules, [{ id: 1, enforcement: 'active', bypass_actors: [] }], 43), false)
  assert.equal(strictRules(rules, [{ id: 1, enforcement: 'active' }], 42), false)
  assert.equal(strictRules(rules, [{ id: 1, enforcement: 'active', bypass_actors: [{}] }], 42), false)
  assert.equal(strictRules(rules.slice(0, 1), [{ id: 1, enforcement: 'active', bypass_actors: [] }], 42), false)
})
