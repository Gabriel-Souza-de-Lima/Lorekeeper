import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createApp } from '../../src/server/app.ts'
import { closeTestServer } from '../support/close-test-server.ts'

test('I3-02d/e: vincula e remove notas no editor, recupera resposta perdida e respeita arquivamento', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = async (name: string) => (await (await request.post(`${base}/api/campaigns`, { data: { name } })).json()).id
    const current = await campaign('Observatório')
    const other = await campaign('Outra campanha')
    const session = await (await request.post(`${base}/api/campaigns/${current}/sessions`, { data: { date: '2026-11-22' } })).json()
    async function note(body: string, campaignId?: string) {
      const id = randomUUID()
      expect((await request.post(`${base}/api/quick-notes`, { data: { id, body } })).status()).toBe(201)
      if (campaignId) {
        expect((await request.put(`${base}/api/quick-notes/${id}/campaign`, { data: { campaignId } })).ok()).toBe(true)
      }
      return id
    }
    const inbox = await note('Bússola\nApontou para a torre.')
    const local = await note('Mapa', current)
    const foreign = await note('Chave', other)
    await page.goto(base)
    await page.getByRole('button', { name: 'Observatório', exact: true }).click()
    await page.getByRole('listitem').getByRole('button', { name: session.title, exact: true }).click()
    const panel = page.getByRole('region', { name: 'Anotações vinculadas' })
    const picker = panel.getByLabel('Anotação para vincular')
    await expect(picker.locator(`option[value="${inbox}"]`)).toHaveCount(1, { timeout: 3000 })
    await expect(picker.locator(`option[value="${local}"]`)).toHaveCount(1)
    await expect(picker.locator(`option[value="${foreign}"]`)).toHaveCount(0)
    await picker.selectOption(inbox)
    await page.route(`${base}/api/campaigns/${current}/sessions/${session.id}/quick-notes/${inbox}`, async (route) => {
      expect((await route.fetch()).status()).toBe(204)
      await route.abort()
    }, { times: 1 })
    await panel.getByRole('button', { name: 'Vincular anotação', exact: true }).click()
    await expect(panel.getByRole('alert')).toContainText('Não foi possível confirmar')
    await expect(picker).toBeDisabled()
    await panel.getByRole('button', { name: 'Repetir operação' }).click()
    const linked = panel.getByRole('listitem').filter({ hasText: 'Apontou para a torre.' })
    await expect(linked).toHaveCount(1)
    await expect(picker.locator(`option[value="${inbox}"]`)).toHaveCount(0)
    await picker.selectOption(local)
    await panel.getByRole('button', { name: 'Vincular anotação', exact: true }).click()
    await expect(panel.getByRole('listitem').filter({ hasText: 'Mapa' })).toBeVisible()
    await linked.getByRole('button', { name: /Remover vínculo/ }).click()
    await expect(linked).toHaveCount(0)
    await expect(picker.locator(`option[value="${inbox}"]`)).toHaveCount(1)
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Arquivar campanha' }).click()
    await expect(page.getByRole('button', { name: 'Reativar campanha' })).toBeVisible()
    await page.getByRole('listitem').getByRole('button', { name: session.title, exact: true }).click()
    await expect(panel.getByRole('listitem')).toHaveText('Mapa')
    await expect(picker).toHaveCount(0)
    await expect(panel.getByRole('button', { name: /Remover vínculo/ })).toHaveCount(0)
  } finally {
    await closeTestServer(app)
  }
})
