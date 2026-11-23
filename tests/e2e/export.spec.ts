import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('I4-01a: baixa o ZIP pelo painel', async ({ page }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    await page.goto(await app.listen({ host: '127.0.0.1', port: 0 }))
    const link = page.getByRole('link', { name: 'Exportar acervo' })
    await expect(link).toBeVisible({ timeout: 4000 })
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      link.click(),
    ])
    expect(new URL(download.url()).pathname).toBe('/api/export')
    expect(download.suggestedFilename()).toMatch(/^lorekeeper-export-.*\.zip$/)
  } finally { await finishE2EServer(app, [page.context()]) }
})
