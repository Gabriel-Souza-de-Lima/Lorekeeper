import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createApp } from '../../src/server/app.ts'

test('I3-07d: adiciona uma tag, reabre a sessão e remove a associação', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const response = await request.post(`${origin}/api/campaigns`, { data: { name: 'Bruma' } })
    expect(response.status()).toBe(201)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    await page.getByRole('button', { name: 'Nova sessão', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Tags' })
    await expect(page.getByLabel('Anotações', { exact: true })).toBeEnabled()
    await panel.getByLabel('Nome da tag').fill('Pista náutica', { timeout: 4000 })
    await panel.getByRole('button', { name: 'Adicionar tag' }).click()
    await expect(panel.getByText('Pista náutica', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('listitem').getByRole('button', { name: 'Nova sessão', exact: true }).click()
    await panel.getByRole('button', { name: 'Remover tag Pista náutica' }).click()
    await expect(panel.getByText('Nenhuma tag.')).toBeVisible()
  } finally {
    await page.close()
    app.server.closeAllConnections()
    await app.close()
  }
})

test('I3-07d: anotações e páginas da wiki compartilham tags e arquivamento preserva consulta', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await (await request.post(`${origin}/api/campaigns`, { data: { name: 'Bruma' } })).json()
    const url = `${origin}/api/campaigns/${campaign.id}`
    const wikiId = randomUUID()
    const noteId = randomUUID()
    const inbox = `${origin}/api/quick-notes`
    expect((await request.post(`${url}/wiki`, { data: { id: wikiId, type: 'npc', title: 'Guia', body: '' } })).status()).toBe(201)
    expect((await request.post(inbox, { data: { id: noteId, body: 'Uma pista.' } })).status()).toBe(201)
    expect((await request.put(`${inbox}/${noteId}/campaign`, { data: { campaignId: campaign.id } })).ok()).toBe(true)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Tags' })
    async function attach(name: string) {
      await panel.getByLabel('Nome da tag').fill(name)
      await panel.getByRole('button', { name: 'Adicionar tag' }).click()
      await expect(panel.getByText('Pista', { exact: true })).toBeVisible()
    }
    await page.getByRole('button', { name: 'Anotações da campanha' }).click()
    await attach('Pista')
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Wiki da campanha' }).click()
    await page.getByRole('button', { name: 'Guia', exact: true }).click()
    await attach('pista')
    await page.getByRole('button', { name: 'Voltar à wiki' }).click()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Arquivar campanha' }).click()
    await expect(page.getByRole('button', { name: 'Reativar campanha' })).toBeVisible()
    await page.getByRole('button', { name: 'Anotações da campanha' }).click()
    await expect(panel.getByText('Pista', { exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: /Remover/ })).toHaveCount(0)
    await expect(panel.getByLabel('Nome da tag')).toHaveCount(0)
  } finally {
    await page.close()
    app.server.closeAllConnections()
    await app.close()
  }
})
