import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createApp } from '../../src/server/app.ts'

test('I3-02a/b: reenvia o mesmo UUID ao reabrir a caixa após perder a resposta', async ({ page, context }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    const api = `${base}/api/quick-notes`
    const body = 'O farol apareceu na névoa.'
    let originalId: string | undefined
    await page.goto(base)
    await page.getByRole('button', { name: 'Anotações rápidas', exact: true }).click({ timeout: 3000 })
    await page.getByLabel('Anotação', { exact: true }).fill(body)
    await page.route(api, async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      originalId = route.request().postDataJSON().id
      await route.fetch()
      await route.abort()
    })
    await page.getByRole('button', { name: 'Guardar anotação' }).click()
    await expect(page.getByRole('alert')).toContainText('Anotação pendente')
    expect(originalId).toBeTruthy()

    const reopened = await context.newPage()
    await reopened.goto(base)
    await reopened.getByRole('button', { name: 'Anotações rápidas', exact: true }).click()
    await expect(reopened.getByText(/Outra aba está com o editor aberto/)).toBeVisible()
    await expect(reopened.getByRole('listitem')).toContainText(body)
    await page.close()
    await reopened.getByRole('button', { name: 'Tentar abrir editor' }).click()
    await expect(reopened.getByLabel('Anotação', { exact: true })).toHaveValue(body)
    const retry = reopened.waitForRequest((request) => request.url() === api && request.method() === 'POST')
    await reopened.getByRole('button', { name: 'Tentar novamente' }).click()
    expect((await retry).postDataJSON()).toEqual({ id: originalId, body })
    await expect(reopened.getByRole('status')).toHaveText('Anotação guardada')
    await expect(reopened.getByRole('listitem')).toHaveCount(1)
    await expect(reopened.getByRole('listitem')).toContainText(body)
  } finally {
    await app.close()
  }
})

test('I3-02c: preserva o texto editável e oferece download quando o armazenamento falha', async ({ page }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => { throw new DOMException('Falha simulada', 'QuotaExceededError') }
    })
    await page.goto(base)
    await page.getByRole('button', { name: 'Anotações rápidas', exact: true }).click({ timeout: 3000 })
    await page.getByLabel('Anotação', { exact: true }).fill('Texto disponível para exportação.')
    await expect(page.getByRole('alert')).toContainText('armazenamento local')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar rascunho' }).click()
    expect((await download).suggestedFilename()).toBe('anotacao-rapida.md')
  } finally {
    await app.close()
  }
})

test('I3-04: encaminha para campanha e reconcilia a perda de resposta', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    const active = await (await request.post(`${base}/api/campaigns`, { data: { name: 'Observatório' } })).json()
    const retired = await (await request.post(`${base}/api/campaigns`, { data: { name: 'Campanha arquivada' } })).json()
    await request.patch(`${base}/api/campaigns/${retired.id}`, { data: { archived: true } })
    const id = 'c5076f15-8612-4ece-bc96-03b205d4d82c'
    const text = 'A bússola apontou para a torre.'
    await request.post(`${base}/api/quick-notes`, { data: { id, body: text } })
    const assignment = `${base}/api/quick-notes/${id}/campaign`
    await page.goto(base)
    await page.getByRole('button', { name: 'Anotações rápidas', exact: true }).click()
    const card = page.getByRole('listitem').filter({ hasText: text })
    const destination = card.getByLabel('Campanha de destino')
    await expect(destination).toHaveCount(1, { timeout: 3000 })
    await expect(destination.locator('option')).toHaveText(['Escolha uma campanha', 'Observatório'])
    await destination.selectOption(active.id)
    await page.route(assignment, async (route) => {
      await route.fetch()
      await route.abort()
    }, { times: 1 })
    await card.getByRole('button', { name: 'Encaminhar' }).click()
    await expect(card.getByRole('alert')).toContainText('Ainda não foi possível confirmar')
    await expect(destination).toBeDisabled()
    await card.getByRole('button', { name: 'Repetir encaminhamento' }).click()
    await expect(card).toHaveCount(0)
    await page.getByRole('button', { name: 'Voltar ao painel' }).click()
    await page.getByRole('button', { name: 'Observatório', exact: true }).click()
    await page.getByRole('button', { name: 'Anotações da campanha' }).click()
    await expect(page.getByRole('listitem')).toHaveCount(1)
    await expect(page.getByRole('listitem')).toContainText(text)
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Arquivar campanha' }).click()
    await expect(page.getByRole('button', { name: 'Reativar campanha' })).toBeVisible()
    await page.getByRole('button', { name: 'Anotações da campanha' }).click()
    await expect(page.getByRole('listitem')).toContainText(text)
  } finally {
    await app.close()
  }
})
