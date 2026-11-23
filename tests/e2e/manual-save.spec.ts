import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('SAVE-01/02/03/05/09/10: protege localmente, salva uma vez e descarta sem gravar', async ({ page, context, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await (await request.post(`${origin}/api/campaigns`, { data: { name: 'Bruma' } })).json()
    const sessions = `${origin}/api/campaigns/${campaign.id}/sessions`
    const session = await (await request.post(sessions, { data: { date: '2026-11-23' } })).json()
    const path = `${sessions}/${session.id}`
    let writes = 0
    context.on('request', (item) => { if (item.method() === 'PUT' && item.url() === path) writes++ })
    async function open(tab: typeof page) {
      await tab.goto(origin)
      await tab.getByRole('button', { name: 'Bruma', exact: true }).click()
      await tab.getByRole('listitem').getByRole('button', { name: 'Nova sessão', exact: true }).click()
      await expect(tab.getByLabel('Anotações', { exact: true })).toBeEnabled()
    }
    await open(page)
    const save = page.getByRole('button', { name: 'Salvar', exact: true })
    await expect(save).toBeDisabled({ timeout: 4000 })
    await page.clock.install()
    await page.getByLabel('Título', { exact: true }).fill('Farol')
    await page.getByLabel('Data real').fill('2026-11-24')
    await page.getByLabel('Número', { exact: true }).fill('3')
    await page.getByLabel('Participantes').fill('Lia')
    await page.getByLabel('Anotações', { exact: true }).fill('A bússola girou.')
    await expect(page.getByRole('status')).toContainText('rascunho protegido')
    await page.clock.fastForward(30_000)
    expect(writes).toBe(0)
    expect((await (await request.get(path)).json()).version).toBe(1)
    await page.close()
    const next = await context.newPage()
    await open(next)
    await next.getByRole('button', { name: /Recuperar rascunho/ }).click()
    await expect(next.getByLabel('Anotações', { exact: true })).toHaveValue('A bússola girou.')
    await next.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(next.getByRole('status')).toHaveText('Salvo no servidor')
    expect(writes).toBe(1)
    expect(await (await request.get(path)).json()).toMatchObject({
      title: 'Farol', date: '2026-11-24', number: 3, participants: 'Lia', body: 'A bússola girou.', version: 2,
    })
    await next.getByLabel('Anotações', { exact: true }).fill('Outra ideia.')
    next.once('dialog', (dialog) => void dialog.accept())
    await next.getByRole('button', { name: 'Descartar alterações' }).click()
    await expect(next.getByLabel('Anotações', { exact: true })).toHaveValue('A bússola girou.')
    expect(writes).toBe(1)
  } finally { await finishE2EServer(app, [context], request) }
})
