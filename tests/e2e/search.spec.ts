import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('I3-08d: filtra pela tag e abre a sessão encontrada', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await (await request.post(`${origin}/api/campaigns`, { data: { name: 'Bruma' } })).json()
    const url = `${origin}/api/campaigns/${campaign.id}`
    const { id, ...fields } = await (await request.post(`${url}/sessions`, { data: { date: '2026-11-22' } })).json()
    expect((await request.put(`${url}/sessions/${id}`, {
      data: { ...fields, title: 'Travessia', body: 'A bússola apontou para o norte.' },
    })).ok()).toBe(true)
    expect((await request.put(`${url}/documents/${id}/tags`, { data: { name: 'Pista' } })).ok()).toBe(true)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Busca', exact: true }).click({ timeout: 4000 })
    await page.getByLabel('Termos de busca').fill('bussola')
    await page.getByLabel('Campanha', { exact: true }).selectOption({ label: 'Bruma' })
    await page.getByLabel('Categoria').selectOption('session')
    await page.getByLabel('Tag', { exact: true }).selectOption({ label: 'Pista' })
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await expect(page.locator('mark')).toHaveText('bússola')
    await page.getByRole('button', { name: 'Travessia', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Editor de sessão' })).toBeVisible()
    await expect(page.getByLabel('Anotações', { exact: true })).toHaveValue('A bússola apontou para o norte.')
  } finally {
    await finishE2EServer(app, [page.context()], request)
  }
})
