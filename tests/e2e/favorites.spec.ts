import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P9-07/08/09/10 e PHV2-07: busca, favoritos, homônimos e guard', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    for (const name of ['Costa', 'Montanha']) {
      const { id } = await (await request.post(origin + '/api/campaigns', { data: { name } })).json()
      const root = origin + '/api/campaigns/' + id
      expect((await request.post(root + '/wiki', { data: {
        id: randomUUID(), title: 'Farol', type: name === 'Costa' ? 'npc' : 'location', body: '',
      } })).status()).toBe(201)
      if (name === 'Costa') {
        const { id: document, ...fields } = await (await request.post(root + '/sessions', { data: { date: '2026-11-24' } })).json()
        expect((await request.put(root + '/sessions/' + document, { data: { ...fields, title: 'Partida' } })).status()).toBe(200)
      }
    }
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Navegação', exact: true }).click()
    const sidebar = page.locator('.sidebar')
    const toggle = sidebar.getByRole('button', { name: 'Navegação', exact: true })
    await sidebar.getByRole('button', { name: 'Busca', exact: true }).click()
    const search = page.getByLabel('Termos de busca')
    const submit = page.getByRole('button', { name: 'Buscar', exact: true })
    await search.fill('Farol')
    await submit.click()
    await expect(page.getByText('NPC · Costa', { exact: true })).toBeVisible()
    await expect(page.getByText('Localidade · Montanha', { exact: true })).toBeVisible()
    await search.fill('Partida')
    await submit.click()
    await page.getByRole('button', { name: 'Partida', exact: true }).click()
    await page.getByRole('button', { name: 'Adicionar aos favoritos' }).click()
    await expect(page.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
    await toggle.click()
    await sidebar.getByRole('button', { name: 'Favoritos', exact: true }).click()
    await page.getByLabel('Filtrar favoritos').fill('partida')
    await page.getByRole('button', { name: 'Partida', exact: true }).click()
    const notes = page.getByLabel('Anotações', { exact: true })
    await notes.fill('Ainda não confirmado')
    await expect(page.getByRole('status')).toContainText('rascunho protegido')
    const brand = sidebar.getByRole('button', { name: 'Lorekeeper', exact: true })
    await brand.click()
    await page.getByRole('dialog', { name: 'Alterações pendentes' }).getByRole('button', { name: 'Cancelar' }).click()
    await expect(brand).toBeFocused()
    await expect(notes).toHaveValue('Ainda não confirmado')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  } finally { await finishE2EServer(app, [page.context()], request) }
})
