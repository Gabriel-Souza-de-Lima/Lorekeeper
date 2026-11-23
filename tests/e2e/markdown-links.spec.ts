import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('I3-06c: vincula trecho no Markdown e retorna pelo backlink', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await (await request.post(`${origin}/api/campaigns`, { data: { name: 'Bruma' } })).json()
    const api = `${origin}/api/campaigns/${campaign.id}`
    expect((await request.post(`${api}/wiki`, {
      data: { id: randomUUID(), type: 'npc', title: 'Guia do farol', body: 'Registro fictício.' },
    })).status()).toBe(201)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    await page.getByRole('button', { name: 'Nova sessão' }).click()
    const wiki = page.getByRole('region', { name: 'Páginas vinculadas' })
    await wiki.getByLabel('Página da wiki').selectOption({ label: 'Guia do farol' }, { timeout: 3500 })
    const notes = page.getByLabel('Anotações', { exact: true })
    await notes.fill('O guia chegou.')
    await notes.evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(2, 6))
    await wiki.getByRole('button', { name: 'Inserir no Markdown' }).click()
    await expect(notes).toHaveValue(/O \[guia\]\(#wiki-[^)]*\) chegou\./)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    await page.getByRole('region', { name: 'Prévia Markdown' }).getByRole('button', { name: 'guia' }).click()
    await expect(page.getByRole('heading', { name: 'Guia do farol' })).toBeVisible()
    await page.getByRole('region', { name: 'Sessões relacionadas' }).getByRole('button', { name: 'Nova sessão' }).click()
    await expect(page.getByRole('heading', { name: 'Editor de sessão' })).toBeVisible()
    await expect(wiki.getByRole('button', { name: 'Guia do farol' })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})
