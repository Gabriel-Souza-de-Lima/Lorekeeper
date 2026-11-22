import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ordinaryChange, waitingForCI, strictRules } from '../../.github/scripts/github-app-policy.ts'

const rules = [
  { type: 'pull_request', parameters: { required_approving_review_count: 0 } },
  { type: 'required_status_checks', parameters: {
    strict_required_status_checks_policy: true, required_status_checks: [{ context: 'validar', integration_id: 15368 }],
  } },
]

test('IA-01/03: apenas alteração comum e explicitamente selecionada', () => {
  const files = [{ filename: 'docs/specs/ensaio-ci.md' }]
  assert.equal(ordinaryChange('codex/ensaio', files), true)
  assert.equal(ordinaryChange('feat/ensaio', files), false)
  assert.equal(ordinaryChange('codex/ensaio', []), false)
  assert.equal(ordinaryChange('codex/ensaio', [{ filename: 'src/web/a.ts', previous_filename: '.github/workflows/ci.yml' }]), false)
  assert.equal(ordinaryChange('codex/ensaio', [{ filename: 'src/server/database.ts' }]), false)
})

test('IA-02/04: identifica somente CI em espera ou ainda não enfileirado', () => {
  assert.equal(waitingForCI(undefined, 'head'), true)
  for (const status of ['queued', 'in_progress', 'requested', 'waiting', 'pending']) {
    assert.equal(waitingForCI({ head_sha: 'head', event: 'pull_request', status, conclusion: null }, 'head'), true)
  }
  for (const conclusion of ['success', 'failure', 'cancelled', 'neutral', 'skipped']) {
    assert.equal(waitingForCI({ head_sha: 'head', event: 'pull_request', status: 'completed', conclusion }, 'head'), false)
  }
  assert.equal(waitingForCI({ head_sha: 'old', event: 'pull_request', status: 'queued', conclusion: null }, 'head'), false)
})

test('IA-04: confirma a proteção efetiva sem consultar a lista administrativa de bypass', () => {
  assert.equal(strictRules(rules), true)
  assert.equal(strictRules([]), false)
  assert.equal(strictRules(rules.slice(0, 1)), false)
  assert.equal(strictRules([rules[0], { ...rules[1], parameters: {
    strict_required_status_checks_policy: true, required_status_checks: [{ context: 'validar', integration_id: 42 }],
  } }]), false)
  assert.equal(strictRules([rules[0], { ...rules[1], parameters: {
    strict_required_status_checks_policy: false, required_status_checks: [{ context: 'validar', integration_id: 15368 }],
  } }]), false)
})
