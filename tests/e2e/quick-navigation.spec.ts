import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P9-01 a P9-10: atalhos, favoritos, homônimos, foco e aviso de rascunho', async ({ page, request }) => {
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
    const open = page.getByRole('button', { name: 'Navegação rápida' })
    await expect(open).toBeVisible({ timeout: 4000 })
    await open.click()
    const picker = page.getByRole('dialog', { name: 'Navegação rápida' })
    const search = picker.getByRole('combobox', { name: 'Localizar campanha ou documento' })
    await expect(search).toBeFocused()
    await search.fill('Faro')
    await expect(picker.getByRole('option', { name: /Farol.*Costa.*NPC/ })).toBeVisible()
    await expect(picker.getByRole('option', { name: /Farol.*Montanha.*Localidade/ })).toBeVisible()
    const options = picker.getByRole('option')
    await search.press('ArrowDown')
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')
    await search.press('ArrowUp')
    await expect(options.first()).toHaveAttribute('aria-selected', 'true')
    await search.press('Escape')
    await expect(picker).toBeHidden()
    await expect(open).toBeFocused()
    await page.keyboard.press('Control+k')
    await expect(search).toBeFocused()
    await search.fill('Partida')
    await expect(picker.getByRole('option', { name: /Partida.*Costa.*Sessão/ })).toBeVisible()
    await picker.getByRole('button', { name: 'Adicionar aos favoritos' }).click()
    await expect(picker.getByRole('button', { name: 'Remover dos favoritos' })).toBeVisible()
    await search.fill('')
    await expect(picker.getByRole('option', { name: /Partida.*Costa.*Sessão/ })).toBeVisible()
    await search.press('Home')
    await search.press('Enter')
    const notes = page.getByLabel('Anotações', { exact: true })
    await notes.fill('Ainda não confirmado')
    await expect(page.getByRole('status')).toContainText('rascunho protegido')
    await expect(notes).toBeFocused()
    await page.keyboard.press('Control+k')
    await search.fill('Montanha')
    await expect(picker.getByRole('option', { name: /Montanha.*Campanha/ })).toBeVisible()
    page.once('dialog', (dialog) => void dialog.dismiss())
    await search.press('Enter')
    await expect(picker).toBeVisible()
    await search.press('Escape')
    await expect(notes).toBeFocused()
    await expect(notes).toHaveValue('Ainda não confirmado')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  } finally { await finishE2EServer(app, [page.context()], request) }
})
