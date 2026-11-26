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
    const sessionUrl = `${url}/sessions/${id}`
    const current = await (await request.get(sessionUrl)).json()
    expect((await request.put(sessionUrl, {
      data: { ...fields, version: current.version, title: 'Travessia revisada', body: current.body },
    })).ok()).toBe(true)
    await page.getByRole('button', { name: 'Voltar à busca' }).press('Enter')
    await expect(page.getByRole('button', { name: 'Travessia revisada', exact: true })).toBeFocused()
    await expect(page.getByLabel('Termos de busca')).toHaveValue('bussola')
    await expect(page.getByLabel('Campanha', { exact: true })).toHaveValue(campaign.id)
    await expect(page.getByLabel('Categoria')).toHaveValue('session')
    await expect(page.getByLabel('Tag', { exact: true })).not.toHaveValue('')
    await page.route(sessionUrl, (route) => route.fulfill({ status: 503 }), { times: 1 })
    await page.getByRole('button', { name: 'Travessia revisada', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Não foi possível abrir o resultado anterior')
    await expect(page.getByRole('heading', { name: 'Resultados da busca' })).toBeFocused()
    await page.getByRole('button', { name: 'Travessia revisada', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Editor de sessão' })).toBeVisible()
    expect((await request.patch(sessionUrl + '/trash', { data: { trashed: true } })).ok()).toBe(true)
    await page.getByRole('button', { name: 'Voltar à busca' }).press('Enter')
    await expect(page.getByRole('heading', { name: 'Resultados da busca' })).toBeFocused()
    await expect(page.getByRole('status')).toContainText('O resultado anterior saiu da busca')
    await expect(page.getByRole('button', { name: 'Travessia revisada' })).toHaveCount(0)

  } finally {
    await finishE2EServer(app, [page.context()], request)
  }
})

test('UX63-01/02: personagem aberto pela busca mantém origem e retorna ao resultado', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Serra fictícia' } })).json()
    expect((await request.post(origin + '/api/campaigns/' + id + '/wiki', {
      data: { id: globalThis.crypto.randomUUID(), type: 'character', title: 'Marina', body: 'Vigia da torre antiga.' },
    })).status()).toBe(201)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Busca', exact: true }).click()
    await page.getByLabel('Termos de busca').fill('Marina')
    await page.getByLabel('Categoria').selectOption('character')
    await page.getByRole('button', { name: 'Buscar', exact: true }).press('Enter')
    const result = page.getByRole('button', { name: 'Marina', exact: true })
    await result.press('Enter')
    await expect(page.getByRole('heading', { name: 'Marina' })).toBeFocused()
    await expect(page.getByText('Serra fictícia · Personagem', { exact: true })).toBeVisible()
    await expect(page.getByRole('article', { name: 'Conteúdo da página' })).toContainText('Vigia da torre antiga.')
    await page.getByRole('button', { name: 'Voltar à busca' }).press('Enter')
    await expect(result).toBeFocused()
    await expect(page.getByLabel('Termos de busca')).toHaveValue('Marina')
  } finally { await finishE2EServer(app, [page.context()], request) }
})
