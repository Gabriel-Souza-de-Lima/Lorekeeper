import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('UX64-01/02: acervo explica exportação e diferencia carga de ação em pendências', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  const release = Promise.withResolvers<void>()
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa fictícia' } })).json()
    await page.setViewportSize({ width: 320, height: 680 })
    await page.goto(origin)
    const exportLink = page.getByRole('link', { name: 'Exportar acervo' })
    await expect(exportLink).toHaveAccessibleDescription('Exportação portátil em ZIP.')
    expect((await exportLink.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await page.getByRole('button', { name: 'Importar texto', exact: true }).press('Enter')
    await expect(page.getByRole('heading', { name: 'Importar texto' })).toBeFocused()
    await expect(page.getByLabel('Arquivo de texto')).toHaveAccessibleDescription('TXT ou Markdown em UTF-8, até 512 KiB.')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
    await page.getByRole('button', { name: 'Voltar ao painel' }).click()
    await page.getByRole('button', { name: 'Costa fictícia', exact: true }).click()
    await page.route(origin + '/api/campaigns/' + id + '/pending-items', async (route) => {
      await release.promise
      await route.continue()
    }, { times: 1 })
    await page.getByRole('button', { name: 'Pendências', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Carregando pendências…')
    await expect(page.getByRole('button', { name: 'Carregando pendências…' })).toHaveCount(0)
    release.resolve()
    await expect(page.getByText('Nenhuma pendência registrada.')).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280)
  } finally {
    release.resolve()
    await finishE2EServer(app, [page.context()], request)
  }
})
