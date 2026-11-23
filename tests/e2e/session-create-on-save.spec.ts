import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('SAVE-13: recupera rascunho novo e confirma a criação somente ao salvar', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const created = await request.post(`${origin}/api/campaigns`, { data: { name: 'Bruma' } })
    expect(created.status()).toBe(201)
    const campaign = await created.json()
    const sessions = `${origin}/api/campaigns/${campaign.id}/sessions`
    await page.goto(origin)
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    const open = page.getByRole('button', { name: 'Nova sessão', exact: true })
    await open.click()
    const notes = page.getByLabel('Anotações', { exact: true })
    await notes.fill('A ponte apareceu na névoa.')
    await expect(page.getByRole('status')).toContainText('rascunho protegido')
    expect(await (await request.get(sessions)).json()).toEqual([])
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await expect(page.getByText('Nenhuma sessão registrada', { exact: true })).toBeVisible()
    await open.click()
    await page.getByRole('button', { name: /Recuperar rascunho/ }).click()
    await expect(notes).toHaveValue('A ponte apareceu na névoa.')
    let id: string | undefined
    await page.route(sessions, async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      id = route.request().postDataJSON().id
      expect((await route.fetch()).status()).toBe(201)
      await route.abort()
    }, { times: 1 })
    const save = page.getByRole('button', { name: 'Salvar', exact: true })
    await save.click()
    await expect(page.getByRole('status')).toContainText('Falha ao salvar')
    expect(id).toBeTruthy()
    await save.click()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    const rows = await (await request.get(sessions)).json()
    expect(rows.map((row: { id: string }) => row.id)).toEqual([id])
    expect((await (await request.get(`${sessions}/${id}`)).json()).body).toBe('A ponte apareceu na névoa.')
  } finally { await finishE2EServer(app, [page.context()], request) }
})
