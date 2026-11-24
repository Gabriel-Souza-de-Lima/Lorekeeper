import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P8-01/02/03/04/07/09/11: prévia inerte, confirmação e reenvio sem duplicação', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa' } })).json()
    const root = origin + '/api/campaigns/' + id
    await page.goto(origin)
    await page.getByRole('button', { name: 'Importar texto' }).click({ timeout: 4000 })
    await page.getByLabel('Campanha de destino').selectOption(id)
    const body = '# Faról\n<script>window.executedImport = true</script>'
    await page.getByLabel('Arquivo de texto').setInputFiles({
      name: 'anotacoes.md', mimeType: 'text/markdown', buffer: Buffer.from(body),
    })
    const preview = page.getByLabel('Prévia do conteúdo')
    await expect(preview).toHaveValue(body)
    await page.getByLabel('Título').fill('Anotações da costa')
    await page.getByLabel('Origem informada').fill('Caderno fictício')
    expect(await (await request.get(root + '/sessions')).json()).toEqual([])
    await page.route(root + '/import-text', async (route) => {
      expect((await route.fetch()).status()).toBe(201)
      await route.abort()
    }, { times: 1 })
    await page.getByRole('button', { name: 'Confirmar importação' }).click()
    await expect(page.getByRole('alert')).toContainText('conexão')
    await page.getByRole('button', { name: 'Reenviar importação' }).click()
    await expect(page.getByRole('heading', { name: 'Editor de sessão' })).toBeVisible()
    await expect(page.getByLabel('Anotações', { exact: true })).toHaveValue(body)
    expect(await page.evaluate(() => 'executedImport' in window)).toBe(false)
    const rows = await (await request.get(root + '/sessions')).json()
    expect(rows).toHaveLength(1)
    await expect(page.getByText(/Caderno fictício/)).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})
