import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createApp } from '../../src/server/app.ts'
import { closeTestServer } from '../support/close-test-server.ts'

test('I3-04a/b: opera missão e acessa destaque na visão geral', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await (await request.post(`${base}/api/campaigns`, { data: { name: 'Bruma' } })).json()
    for (const [type, title] of [['quest', 'Explorar o farol'], ['character', 'Guia da Bruma']]) {
      expect((await request.post(`${base}/api/campaigns/${campaign.id}/wiki`, {
        data: { id: randomUUID(), type, title, body: 'Registro fictício.' },
      })).status()).toBe(201)
    }
    await page.goto(base)
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    const missions = page.getByRole('region', { name: 'Missões abertas' })
    await missions.getByRole('button', { name: 'Explorar o farol' }).click({ timeout: 3500 })
    await page.getByRole('button', { name: 'Concluir missão' }).click()
    await expect(page.getByRole('button', { name: 'Reabrir missão' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à wiki' }).click()
    await page.getByRole('button', { name: 'Guia da Bruma' }).click()
    await page.getByRole('button', { name: 'Destacar personagem' }).click()
    await expect(page.getByRole('button', { name: 'Remover destaque' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à wiki' }).click()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await expect(missions.getByText('Nenhuma missão aberta.')).toBeVisible()
    const featured = page.getByRole('region', { name: 'Personagem em destaque' })
    await featured.getByRole('button', { name: 'Guia da Bruma' }).click()
    await expect(page.getByRole('heading', { name: 'Guia da Bruma' })).toBeVisible()
  } finally { await closeTestServer(app) }
})
