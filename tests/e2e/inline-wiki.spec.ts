import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P3-01 a P3-10: resolve homônimos, cria explicitamente e salva apenas sob comando', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = async (name: string) => (await (await request.post(origin + '/api/campaigns', { data: { name } })).json()).id
    const url = origin + '/api/campaigns/' + await campaign('Ilhas')
    const other = origin + '/api/campaigns/' + await campaign('Serra')
    const npc = randomUUID()
    const list = async () => (await request.get(url + '/wiki')).json()
    for (const [scope, id, type] of [[url, npc, 'npc'], [url, randomUUID(), 'location'], [other, randomUUID(), 'character']]) {
      expect((await request.post(scope + '/wiki', { data: { id, type, title: 'Faról', body: '' } })).status()).toBe(201)
    }
    await page.goto(origin)
    await page.getByRole('button', { name: 'Ilhas', exact: true }).click()
    await page.getByRole('button', { name: 'Nova sessão', exact: true }).click()
    const notes = page.getByLabel('Anotações', { exact: true })
    const picker = page.getByRole('region', { name: 'Referência da wiki' })
    const catalogRequests: string[] = []
    page.on('request', (entry) => {
      if (entry.method() === 'GET' && entry.url() === url + '/wiki') catalogRequests.push(entry.url())
    })
    await notes.fill('Antes [[')
    await expect(picker).toBeVisible({ timeout: 4000 })
    await expect(picker.getByRole('button', { name: /Faról/ })).toHaveCount(2)
    const initial = catalogRequests.length
    await notes.pressSequentially('farol')
    await expect(picker.getByRole('button', { name: /Faról/ })).toHaveCount(2)
    expect(catalogRequests).toHaveLength(initial)
    await notes.press('Escape')
    await expect(picker).toBeHidden()
    await expect(notes).toHaveValue('Antes [[farol')
    await expect(notes).toBeFocused()

    await notes.fill('Antes [[Faról]] depois')
    await notes.press('Home')
    for (let i = 0; i < 11; i++) await notes.press('ArrowRight')
    await picker.getByRole('button', { name: /Faról.*NPC/ }).click()
    const existing = 'Antes [Faról](#wiki-' + npc + ') depois'
    await expect(notes).toHaveValue(existing)

    await notes.fill(existing + '\n[[Mapa *Norte*]]')
    await notes.press('Shift+ArrowLeft')
    await expect(picker).toBeHidden()
    await notes.press('End')
    await expect(picker.getByRole('button', { name: 'Criar página da wiki' })).toBeVisible()
    expect(await list()).toHaveLength(2)
    await picker.getByRole('button', { name: 'Criar página da wiki' }).click()
    await picker.getByLabel('Categoria da página').selectOption('location')
    await page.route(url + '/wiki', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      expect((await route.fetch()).status()).toBe(201)
      await route.abort()
    }, { times: 1 })
    const create = picker.getByRole('button', { name: 'Confirmar criação' })
    await create.click()
    await expect(picker.getByText('Verifique a conexão com o servidor.')).toBeVisible()
    await expect(notes).toHaveValue(existing + '\n[[Mapa *Norte*]]')
    await create.click()
    await expect(notes).toHaveValue(/Mapa .*Norte.*\]\(#wiki-/)
    expect(await list()).toHaveLength(3)
    expect(await (await request.get(url + '/sessions')).json()).toEqual([])
    expect((await request.put(url + '/wiki/' + npc + '/title',
      { data: { previousTitle: 'Faról', title: 'Guardião' } })).status()).toBe(200)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    await page.getByRole('button', { name: 'Faról', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Guardião' })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})
