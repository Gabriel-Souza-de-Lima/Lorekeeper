import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('SC-04a/b: confirma pelo título, remove da campanha e recupera da lixeira', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(`${origin}/api/campaigns`, { data: { name: 'Bruma' } })).json()
    const path = `${origin}/api/campaigns/${id}/sessions`
    const { id: sessionId, ...fields } = await (await request.post(path, { data: { date: '2026-11-23' } })).json()
    expect((await request.put(`${path}/${sessionId}`, {
      data: { ...fields, title: 'Travessia', body: 'Uma pista.' },
    })).ok()).toBe(true)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    const row = page.getByRole('listitem').filter({ hasText: 'Travessia' })
    const remove = row.getByRole('button', { name: 'Excluir sessão' })
    page.once('dialog', (dialog) => void dialog.dismiss())
    await remove.click({ timeout: 4000 })
    await expect(row).toBeVisible()
    const confirmation = page.waitForEvent('dialog')
    const clicked = remove.click()
    const dialog = await confirmation
    expect(dialog.message()).toContain('Travessia')
    await dialog.accept()
    await clicked
    await expect(row).toHaveCount(0)
    await page.getByRole('button', { name: 'Lixeira de sessões' }).click()
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Restaurar sessão' }).click()
    await expect(row).toHaveCount(0)
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await row.getByRole('button', { name: 'Travessia', exact: true }).click()
    await expect(page.getByLabel('Anotações', { exact: true })).toHaveValue('Uma pista.')
  } finally { await finishE2EServer(app, [page.context()], request) }
})
