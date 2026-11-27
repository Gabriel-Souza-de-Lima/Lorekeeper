import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('UX62-01/02/03: escreve em uma coluna e alterna detalhes sem salvar implicitamente', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa fictícia' } })).json()
    const sessions = origin + '/api/campaigns/' + id + '/sessions'
    const session = await (await request.post(sessions, { data: { date: '2026-11-26' } })).json()
    const path = sessions + '/' + session.id
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Costa fictícia', exact: true }).click()
    await page.getByRole('region', { name: 'Sessões', exact: true }).getByRole('button', { name: 'Nova sessão', exact: true }).click()
    const notes = page.getByLabel('Anotações', { exact: true })
    const save = page.getByRole('button', { name: 'Salvar', exact: true })
    const preview = page.getByRole('region', { name: 'Prévia Markdown' })
    await expect(notes).toBeEditable()
    await expect(notes).toBeInViewport()
    await expect(save).toBeInViewport()
    const metadata = page.locator('summary').filter({ hasText: 'Dados da sessão' })
    const title = page.getByLabel('Título', { exact: true })
    await expect(title).toBeHidden()
    await notes.fill('A luz voltou à torre.')
    await notes.evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(2, 6))
    const toggle = page.getByRole('button', { name: 'Ocultar prévia' })
    await toggle.press('Enter')
    await expect(preview).toBeHidden()
    await expect(page.getByRole('button', { name: 'Mostrar prévia' })).toBeFocused()
    expect(await notes.evaluate((field: HTMLTextAreaElement) => [field.selectionStart, field.selectionEnd])).toEqual([2, 6])
    await page.getByRole('button', { name: 'Mostrar prévia' }).press('Enter')
    await expect(preview).toContainText('A luz voltou à torre.')
    await metadata.press('Enter')
    await title.fill('Luz na maré')
    await metadata.press('Enter')
    await expect(title).toBeHidden()
    await expect(notes).toHaveValue('A luz voltou à torre.')
    expect((await (await request.get(path)).json()).version).toBe(session.version)

    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 640 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await expect(page.getByRole('button', { name: 'Navegação', exact: true }))
        .toHaveAttribute('aria-expanded', String(width >= 760))
      // Measure both elements in one browser frame after the sidebar reacts to matchMedia.
      const geometry = await notes.evaluate((field) => {
        const writing = field.getBoundingClientRect()
        const preview = document.getElementById('session-preview')!.getBoundingClientRect()
        return {
          below: preview.top > writing.bottom,
          coversWidth: preview.left <= writing.left && preview.right >= writing.right,
        }
      })
      expect(geometry).toEqual({ below: true, coversWidth: true })
    }

    await save.press('Enter')
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    expect(await (await request.get(path)).json()).toMatchObject({
      title: 'Luz na maré', body: 'A luz voltou à torre.', version: session.version + 1,
    })
  } finally { await finishE2EServer(app, [page.context()], request) }
})
