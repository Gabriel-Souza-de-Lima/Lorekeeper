import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createApp } from '../../src/server/app.ts'

test('I3-09c: renomeia a página e reencontra o destino pela menção, backlink e busca', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await (await request.post(`${origin}/api/campaigns`, { data: { name: 'Bruma' } })).json()
    const api = `${origin}/api/campaigns/${campaign.id}`
    const wikiId = randomUUID()
    expect((await request.post(`${api}/wiki`, {
      data: { id: wikiId, type: 'npc', title: 'Guia do farol', body: 'Registro fictício.' },
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
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    await page.getByRole('region', { name: 'Prévia Markdown' }).getByRole('button', { name: 'guia' }).click()
    await expect(page.getByRole('heading', { name: 'Guia do farol' })).toBeVisible()
    await page.getByRole('button', { name: 'Renomear página' }).click({ timeout: 4000 })
    await page.getByLabel('Novo título').fill('Cartógrafa da névoa')
    expect((await request.put(`${api}/wiki/${wikiId}/title`, {
      data: { title: 'Guia da costa', previousTitle: 'Guia do farol' },
    })).ok()).toBe(true)
    await page.getByRole('button', { name: 'Salvar título' }).click()
    await expect(page.getByRole('alert')).toContainText('O título foi alterado.')
    await expect(page.getByLabel('Novo título')).toHaveValue('Cartógrafa da névoa')
    await page.getByRole('button', { name: 'Consultar título atual' }).click()
    await expect(page.getByRole('heading', { name: 'Guia da costa' })).toBeVisible()
    await page.getByRole('button', { name: 'Salvar título' }).click()
    await expect(page.getByRole('heading', { name: 'Cartógrafa da névoa' })).toBeVisible()
    await page.getByRole('region', { name: 'Sessões relacionadas' }).getByRole('button', { name: 'Nova sessão' }).click()
    await expect(page.getByRole('heading', { name: 'Editor de sessão' })).toBeVisible()
    await expect(wiki.getByRole('button', { name: 'Cartógrafa da névoa' })).toBeVisible()
    await page.getByRole('region', { name: 'Prévia Markdown' }).getByRole('button', { name: 'guia' }).click()
    await expect(page.getByRole('heading', { name: 'Cartógrafa da névoa' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à wiki' }).click()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Voltar ao painel' }).click()
    await page.getByRole('button', { name: 'Busca', exact: true }).click()
    await page.getByLabel('Termos de busca').fill('cartografa')
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await page.getByRole('button', { name: 'Cartógrafa da névoa', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Cartógrafa da névoa' })).toBeVisible()
  } finally {
    await page.close()
    app.server.closeAllConnections()
    await app.close()
  }
})
