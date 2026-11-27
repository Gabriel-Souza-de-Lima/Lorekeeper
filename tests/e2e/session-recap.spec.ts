import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P7-01 a P7-06: só a confirmação atualiza o resumo e os destaques da sessão', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Ilhas' } })).json()
    const path = origin + '/api/campaigns/' + id
    const session = await (await request.post(path + '/sessions', { data: { date: '2026-11-24' } })).json()
    expect((await request.put(path + '/sessions/' + session.id, { data: { ...session, id: undefined, body: 'Trecho literal' } })).status()).toBe(200)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Ilhas', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Sessões', exact: true })
    await expect(panel.getByText('Sem resumo')).toBeVisible()
    await panel.getByRole('button', { name: 'Nova sessão', exact: true }).click()
    await page.getByText('Dados da sessão', { exact: true }).click()
    const summary = page.getByLabel('Resumo da sessão')
    await expect(summary).toBeVisible({ timeout: 4000 })
    await summary.fill('O mapa foi recuperado.')
    await page.getByLabel('Destaques da sessão').fill('Encontraram o mapa\nAvistaram o farol')
    await expect(page.getByRole('status')).toContainText('rascunho protegido')
    expect((await (await request.get(path + '/recap')).json()).sessions[0].summary || '').toBe('')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await expect(panel.getByText('O mapa foi recuperado.')).toBeVisible()
    await panel.getByRole('button', { name: 'Nova sessão', exact: true }).click()
    await page.getByText('Dados da sessão', { exact: true }).click()
    await expect(page.getByLabel('Destaques da sessão')).toHaveValue('Encontraram o mapa\nAvistaram o farol')
    await expect(panel.getByText('Trecho literal')).toHaveCount(0)
  } finally { await finishE2EServer(app, [page.context()], request) }
})
