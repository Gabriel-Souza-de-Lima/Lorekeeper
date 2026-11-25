import { test } from 'node:test'
import assert from 'node:assert/strict'
import { knowledgeLabel } from '../../src/perspectives.ts'

test('P10-13: somente jogador exige as duas marcações', () => {
  assert.equal(knowledgeLabel(false, 'undefined', 0), 'Ainda não definido')
  assert.equal(knowledgeLabel(true, 'undefined', 0), 'Jogador registrado · personagens ainda não definidos')
  assert.equal(knowledgeLabel(false, 'none', 0), 'Ainda não definido')
  assert.equal(knowledgeLabel(true, 'none', 0), 'Somente o jogador')
  assert.notEqual(knowledgeLabel(true, 'none', 2), 'Somente o jogador')
})
