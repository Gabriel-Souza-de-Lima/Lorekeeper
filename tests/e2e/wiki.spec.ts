import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createApp } from '../../src/server/app.ts'
import { closeTestServer } from '../support/close-test-server.ts'

test('I3-03d: cadastra página da wiki e consulta após arquivar a campanha', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await (await request.post(`${base}/api/campaigns`, { data: { name: 'Bruma' } })).json()
    const wikiUrl = `${base}/api/campaigns/${campaign.id}/wiki`
    await page.goto(base)
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    await page.getByRole('button', { name: 'Wiki da campanha' }).click({ timeout: 3000 })
    await page.getByRole('button', { name: 'Nova página' }).click()
    await page.getByLabel('Tipo').selectOption('npc')
    await page.getByLabel('Título').fill('Guardião')
    await page.getByLabel('Descrição').fill('Protege o **farol**.')
    await page.route(wikiUrl, async (route) => {
      expect(route.request().method()).toBe('POST')
      expect((await route.fetch()).status()).toBe(201)
      await route.abort()
    }, { times: 1 })
    await page.getByRole('button', { name: 'Criar página' }).click()
    await expect(page.getByRole('alert')).toContainText('Não foi possível confirmar')
    await expect(page.getByLabel('Descrição')).toHaveValue('Protege o **farol**.')
    await page.getByRole('button', { name: 'Repetir envio' }).click()
    await expect(page.getByRole('heading', { name: 'Guardião' })).toBeVisible()
    await expect(page.getByText('farol', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à wiki' }).click()
    await expect(page.getByRole('button', { name: 'Guardião' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Arquivar campanha' }).click()
    await expect(page.getByRole('button', { name: 'Reativar campanha' })).toBeVisible()
    await page.getByRole('button', { name: 'Wiki da campanha' }).click()
    await expect(page.getByRole('button', { name: 'Nova página' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Guardião' }).click()
    await expect(page.getByRole('heading', { name: 'Guardião' })).toBeVisible()
  } finally { await closeTestServer(app) }
})
