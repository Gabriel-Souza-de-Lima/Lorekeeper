import assert from 'node:assert/strict'
import { test } from 'node:test'
import { authorizedAuthor, authorizedBranch, ordinaryChange, candidateApproved, waitingForCI, strictRules } from '../../.github/scripts/github-app-policy.ts'

const rules = [
  { type: 'pull_request' },
  { type: 'required_status_checks', parameters: {
    strict_required_status_checks_policy: true, required_status_checks: [{ context: 'validar', integration_id: 15368 }],
  } },
]
const file = (filename: string, patch = '@@ -1 +1 @@\n-old\n+new') => ({ filename, patch, additions: patch.split('\n').filter((line) => line.startsWith('+')).length })

test('IA-06/07: aceita escopo interno comum e bloqueia alterações sem prova suficiente', () => {
  for (const prefix of ['codex', 'feat', 'fix', 'chore', 'docs']) {
    assert.equal(authorizedBranch(`${prefix}/teste`), true)
    assert.equal(ordinaryChange(`${prefix}/teste`, [file('src/server/app.ts'), file('Dockerfile')]), true)
  }
  assert.equal(authorizedBranch('main'), false)
  assert.equal(authorizedAuthor('Owner', 'owner', 'bot[bot]', []), true)
  assert.equal(authorizedAuthor('bot[bot]', 'owner', 'bot[bot]', []), true)
  assert.equal(authorizedAuthor('Equipe', 'owner', 'bot[bot]', ['equipe']), true)
  assert.equal(authorizedAuthor('outro', 'owner', 'bot[bot]', ['equipe']), false)
  assert.equal(ordinaryChange('feat/teste', [file('.github/workflows/ci.yml')]), false)
  assert.equal(ordinaryChange('feat/teste', [{ filename: 'binary.bin', additions: 0 }]), false)
  assert.equal(ordinaryChange('feat/teste', [file('src/server/config.ts', '+const key = "-----BEGIN PRIVATE KEY-----"')]), false)
  assert.equal(ordinaryChange('feat/teste', [file('src/server/database.ts')]), false)
  const checks = file('tests/integration/db.test.ts', [
    "+test('migration-integrity: valida relações', checkIntegrity)",
    "+test('migration-preservation: conserva registros', checkData)",
    "+test('migration-rollback: reverte falhas', checkRollback)",
  ].join('\n'))
  assert.equal(ordinaryChange('feat/teste', [file('src/server/database.ts'), checks]), true)
  assert.equal(ordinaryChange('feat/teste', [file('src/server/database.ts'), file('tests/integration/db.test.ts',
    '+// migration-integrity migration-preservation migration-rollback')]), false)
  assert.equal(ordinaryChange('feat/teste', [{ ...file('src/server/app.ts'), additions: 2 }]), false)
  assert.equal(ordinaryChange('feat/teste', [file('src/server/database.ts', '+DROP TABLE sessions;'), checks]), false)
})

test('IA-08: distingue CI pendente de sucesso para o candidato exato', () => {
  const run = { event: 'pull_request', head_sha: 'head', status: 'completed', conclusion: 'success' }
  const step = { name: 'PR 4 candidato exact', status: 'completed', conclusion: 'success' }
  const job = { name: 'validar', status: 'completed', conclusion: 'success', steps: [step] }
  assert.equal(waitingForCI(undefined, 'head'), true)
  assert.equal(waitingForCI({ ...run, status: 'queued', conclusion: null }, 'head'), true)
  assert.equal(waitingForCI(run, 'head'), false)
  assert.equal(candidateApproved({ number: 4, candidate: 'exact', head: 'head' }, run, [job]), true)
  assert.equal(candidateApproved({ number: 4, candidate: 'stale', head: 'head' }, run, [job]), false)
  assert.equal(candidateApproved({ number: 4, candidate: 'exact', head: 'head' }, { ...run, conclusion: 'failure' }, [job]), false)
  assert.equal(strictRules(rules), true)
  assert.equal(strictRules(rules.slice(0, 1)), false)
})
