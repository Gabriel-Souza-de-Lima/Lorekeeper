import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'
import type { Session } from '../../src/contracts.ts'
import { createApp } from '../../src/server/app.ts'
import { closeTestServer } from '../support/close-test-server.ts'

async function seed(request: APIRequestContext, base: string) {
  const campaign = await (await request.post(`${base}/api/campaigns`, { data: { name: 'Farol' } })).json()
  const path = `${base}/api/campaigns/${campaign.id}/sessions`
  const session = await (await request.post(path, { data: { date: '2026-11-21' } })).json()
  return `${path}/${session.id}`
}

async function openEditor(page: Page, base: string, sessionTitle = 'Nova sessão') {
  await page.goto(base)
  await page.getByRole('button', { name: 'Farol', exact: true }).click()
  await page.getByRole('listitem').getByRole('button', { name: sessionTitle, exact: true }).click()
  const notes = page.getByLabel('Anotações', { exact: true })
  await expect(notes).toBeEnabled()
  return notes
}

test('I2-05: mantém o rascunho em conflito e exige nova comparação se o servidor mudar', async ({ page, browser, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  const other = await browser.newContext()
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    const path = await seed(request, base)
    const remote = await other.newPage()
    const localNotes = await openEditor(page, base)
    const remoteNotes = await openEditor(remote, base)
    await remoteNotes.fill('O mapa está na torre.')
    await expect(remote.getByRole('status')).toHaveText('Salvo no servidor')
    await localNotes.fill('A ponte passa sob a torre.')
    await expect(page.getByRole('status')).toHaveText(/Falha ao salvar/)
    await page.getByRole('button', { name: 'Comparar versões' }).click({ timeout: 3000 })
    const server = page.getByRole('region', { name: 'Versão do servidor' })
    await expect(server).toContainText('O mapa está na torre.')
    await expect(localNotes).toHaveValue('A ponte passa sob a torre.')

    await remoteNotes.fill('O mapa foi levado para a praça.')
    await expect(remote.getByRole('status')).toHaveText('Salvo no servidor')
    await localNotes.fill('A ponte leva à praça.')
    await page.getByRole('button', { name: 'Salvar combinação' }).click()
    await expect(page.getByRole('button', { name: 'Comparar versões' })).toBeVisible()
    await expect(localNotes).toHaveValue('A ponte leva à praça.')
    await page.getByRole('button', { name: 'Comparar versões' }).click()
    await expect(server).toContainText('O mapa foi levado para a praça.')
    await localNotes.fill('A ponte leva à praça, onde está o mapa.')
    await page.getByRole('button', { name: 'Salvar combinação' }).click()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    expect((await (await request.get(path)).json()).body).toBe('A ponte leva à praça, onde está o mapa.')

    await remoteNotes.fill('Anotação separada sobre a torre.')
    await expect(remote.getByRole('button', { name: 'Comparar versões' })).toBeVisible()
    await remote.getByRole('button', { name: 'Manter rascunho e voltar' }).click()
    const recovered = await openEditor(remote, base)
    await remote.getByRole('button', { name: /Recuperar rascunho/ }).click()
    await expect(recovered).toHaveValue('Anotação separada sobre a torre.')
    await remote.getByRole('button', { name: 'Comparar versões' }).click()
    const discard = remote.getByRole('button', { name: 'Descartar rascunho' })
    remote.once('dialog', (dialog) => void dialog.dismiss())
    await discard.click()
    await expect(recovered).toHaveValue('Anotação separada sobre a torre.')

    await remote.evaluate(() => {
      const original = IDBObjectStore.prototype.delete
      IDBObjectStore.prototype.delete = function (key) {
        IDBObjectStore.prototype.delete = original
        throw new DOMException(`Falha simulada: ${key}`)
      }
    })
    remote.once('dialog', (dialog) => void dialog.accept())
    await discard.click()
    await expect(remote.getByRole('status')).toHaveText(/Falha no armazenamento local/)
    await expect(recovered).toHaveValue('Anotação separada sobre a torre.')
    remote.once('dialog', (dialog) => void dialog.accept())
    await discard.click()
    await expect(remote.getByRole('status')).toHaveText('Salvo no servidor')
    await expect(recovered).toHaveValue('A ponte leva à praça, onde está o mapa.')
    expect((await (await request.get(path)).json()).version).toBe(4)
  } finally {
    try {
      await test.step('Fechar os contextos do teste de conflito', async () => {
        await Promise.all([page.context().close(), other.close()])
      }, { timeout: 5000 })
    } finally {
      await test.step('Fechar o servidor do teste de conflito', () => closeTestServer(app), { timeout: 5000 })
    }
  }
})

test('I2-06: restaura título e texto em nova revisão, mantendo os metadados', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    const path = await seed(request, base)
    const session = await request.get(path)
    expect(session.ok()).toBe(true)
    const { id, ...initial }: Session = await session.json()
    expect(path.endsWith(id)).toBe(true)
    const original = await request.put(path, {
      data: { ...initial, title: 'Avistamos o farol', body: 'O farol apareceu na névoa.' },
    })
    expect(original.ok()).toBe(true)
    const latest = await request.put(path, {
      data: { ...initial, version: (await original.json()).version,
        title: 'Chegamos ao farol', body: 'A lanterna apagou.', participants: 'Lia' },
    })
    expect(latest.ok()).toBe(true)

    const notes = await openEditor(page, base, 'Chegamos ao farol')
    const title = page.getByLabel('Título', { exact: true })
    await expect(notes).toHaveValue('A lanterna apagou.')
    await page.getByRole('button', { name: 'Histórico de revisões' }).click({ timeout: 3000 })
    await page.getByRole('button', { name: 'Inspecionar versão 2' }).click()
    await expect(page.getByRole('region', { name: 'Conteúdo da revisão' })).toContainText('O farol apareceu na névoa.')
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Restaurar como nova revisão' }).click()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    await expect(title).toHaveValue('Avistamos o farol')
    await expect(notes).toHaveValue('O farol apareceu na névoa.')
    await expect(page.getByLabel('Participantes')).toHaveValue('Lia')
    const revisions = await (await request.get(`${path}/revisions`)).json()
    expect(revisions.map(({ version }: { version: number }) => version)).toEqual([4, 3, 2, 1])
  } finally {
    await test.step('Drenar conexões HTTP do teste de restauração', () => closeTestServer(app), { timeout: 5000 })
  }
})
