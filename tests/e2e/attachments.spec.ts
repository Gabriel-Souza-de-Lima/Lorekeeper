import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P5-01/03/07/11: mostra imagem e remove só o vínculo confirmado', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    expect((await request.post(origin + '/api/campaigns', { data: { name: 'Ilhas' } })).status()).toBe(201)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Ilhas', exact: true }).click()
    const attachments = page.getByRole('region', { name: 'Anexos' })
    await expect(attachments.getByText('Nenhum anexo vinculado.')).toBeVisible({ timeout: 4000 })
    await attachments.getByLabel('Arquivo').setInputFiles({ name: 'mapa.png', mimeType: 'image/png', buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMImMb1HwAEGgHwIgPnSQAAAABJRU5ErkJggg==', 'base64',
    ) })
    await attachments.getByLabel('Origem do anexo').fill('Arquivo fictício')
    await attachments.getByRole('button', { name: 'Enviar anexo' }).click()
    const image = attachments.getByRole('img', { name: 'mapa.png' })
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(1)
    const detach = attachments.getByRole('button', { name: 'Remover vínculo de mapa.png' })
    page.once('dialog', (dialog) => void dialog.dismiss())
    await detach.click()
    await expect(image).toBeVisible()
    page.once('dialog', (dialog) => void dialog.accept())
    await detach.click()
    await expect(attachments.getByText('Nenhum anexo vinculado.')).toBeVisible()
    await attachments.getByLabel('Arquivo existente').selectOption({ label: 'mapa.png' })
    await attachments.getByRole('button', { name: 'Vincular arquivo' }).click()
    await expect(image).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})
