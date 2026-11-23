import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P1-01/02/03/06/07: retoma a campanha em tela estreita e mostra apenas o texto salvo', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(`${origin}/api/campaigns`, { data: { name: 'Bruma' } })).json()
    const url = `${origin}/api/campaigns/${id}`
    const npc = randomUUID()
    for (const [type, title, itemId] of [['npc', 'Guia do farol', npc], ['quest', 'Investigar a costa', randomUUID()]]) {
      expect((await request.post(`${url}/wiki`, { data: { id: itemId, type, title, body: '' } })).status()).toBe(201)
    }
    await page.route(`${url}/recap`, (route) => route.abort(), { times: 1 })
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Retomar campanha' })
    await expect(panel.getByRole('alert')).toContainText('Não foi possível carregar a retomada.')
    await panel.getByRole('button', { name: 'Recarregar retomada' }).click()
    await expect(panel.getByText('Nenhuma sessão para retomar.')).toBeVisible({ timeout: 4000 })
    const { id: session, ...fields } = await (await request.post(`${url}/sessions`, { data: { date: '2026-11-23' } })).json()
    expect((await request.put(`${url}/sessions/${session}`, { data: {
      ...fields, title: 'Travessia', body: `Vimos o [guia](#wiki-${npc}).`,
    } })).ok()).toBe(true)
    await page.reload()
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    await expect(panel.getByText(/Vimos o/)).toBeVisible()
    await panel.getByRole('button', { name: 'Guia do farol', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Guia do farol' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à wiki' }).click()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await panel.getByRole('button', { name: 'Investigar a costa' }).click()
    await expect(page.getByRole('heading', { name: 'Investigar a costa' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à wiki' }).click()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await panel.getByRole('button', { name: 'Abrir última sessão' }).click()
    await page.getByLabel('Anotações', { exact: true }).fill('Ainda em rascunho')
    await expect(page.getByRole('status')).toContainText('rascunho protegido')
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await expect(panel.getByText(/Vimos o/)).toBeVisible()
    await expect(panel.getByText('Ainda em rascunho')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  } finally { await finishE2EServer(app, [page.context()], request) }
})
