import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assessmentError } from '../../src/narrative.ts'
import { acknowledge } from '../../src/web/narrative-drafts.ts'

test('P10-02: confirmação e refutação exigem justificativa e fonte', () => {
  for (const state of ['confirmed', 'refuted'] as const) {
    assert.ok(assessmentError('open', state, '', true))
    assert.ok(assessmentError('open', state, 'Investigação', false))
    assert.equal(assessmentError('open', state, 'Investigação', true), null)
  }
  assert.equal(assessmentError('open', 'open', '', false), null)
})

test('P10-07: resposta antiga mantém os campos de uma geração posterior', () => {
  const operation = { key: 'op', generation: 1, payload: { version: 0, statement: 'Antigo' } }
  const draft = { key: 'draft', campaignId: 'c', id: 'i', tab: 't', mode: 'edit' as const,
    generation: 2, fields: { version: 0, statement: 'Novo' }, operation }
  assert.equal(acknowledge(draft, operation, 1)?.fields.statement, 'Novo')
  assert.equal(acknowledge(draft, operation, 1)?.fields.version, 1)
  assert.equal(acknowledge({ ...draft, generation: 1 }, operation, 1), null)
})
