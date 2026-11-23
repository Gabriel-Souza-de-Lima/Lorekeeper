import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P5-01/04/07: envia o primeiro PDF assim que os anexos da sessão estão disponíveis', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  const sessionResponse = Promise.withResolvers<void>()
  const attachmentsResponse = Promise.withResolvers<void>()
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await request.post(origin + '/api/campaigns', { data: { name: 'Ilhas' } })
    expect(campaign.status()).toBe(201)
    const root = origin + '/api/campaigns/' + (await campaign.json()).id
    const created = await request.post(root + '/sessions', { data: { date: '2026-11-23' } })
    expect(created.status()).toBe(201)
    const { id } = await created.json()
    const session = root + '/sessions/' + id
    const attachments = root + '/attachments?documentId=' + id
    let pdf = '%PDF-1.4\n'
    const offsets = ['<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>'].map((object, index) => {
      const offset = pdf.length
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
      return offset
    })
    const xref = pdf.length
    pdf += 'xref\n0 4\n0000000000 65535 f \n'
    pdf += offsets.map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n').join('')
    pdf += `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
    await page.route(session, async (route) => {
      await sessionResponse.promise
      await route.continue()
    })
    await page.route(attachments, async (route) => {
      if (route.request().method() === 'GET') await attachmentsResponse.promise
      await route.continue()
    })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Ilhas', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Anexos' })
    const file = panel.getByLabel('Arquivo', { exact: true })
    const send = panel.getByRole('button', { name: 'Enviar anexo' })
    await expect(file).toBeEnabled()
    const requested = page.waitForRequest(session)
    await page.getByRole('listitem').getByRole('button', { name: 'Nova sessão', exact: true }).click()
    await requested
    await expect(file).toBeDisabled()
    await expect(send).toBeDisabled()
    sessionResponse.resolve()
    await expect(page.getByRole('heading', { name: 'Editor de sessão' })).toBeVisible()
    await expect(panel.getByText('Carregando anexos…')).toBeVisible()
    await expect(file).toHaveCount(0)
    attachmentsResponse.resolve()
    await expect(file).toBeEnabled()
    await file.setInputFiles({ name: 'ficha.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) })
    const [response] = await Promise.all([
      page.waitForResponse((result) => result.url() === attachments && result.request().method() === 'POST'),
      send.click(),
    ])
    expect(response.status()).toBe(201)
    expect(await (await request.get(root + '/attachments')).json()).toEqual([])
    const link = panel.getByRole('link', { name: 'ficha.pdf' })
    await expect(link).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()])
    expect(download.suggestedFilename()).toBe('ficha.pdf')
  } finally {
    sessionResponse.resolve()
    attachmentsResponse.resolve()
    await finishE2EServer(app, [page.context()], request)
  }
})

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
