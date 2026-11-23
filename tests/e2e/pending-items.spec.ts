import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P2-01/05/06: abre a pendência pela retomada e preserva o histórico ao resolver', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    expect((await request.post(origin + '/api/campaigns', { data: { name: 'A travessia' } })).status()).toBe(201)
    await page.goto(origin)
    await page.getByRole('button', { name: 'A travessia', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Ver pendências' })).toBeVisible({ timeout: 4000 })
    await page.getByRole('button', { name: 'Ver pendências' }).click()
    await page.getByLabel('Título').fill('Quem acendeu o farol?')
    await page.getByLabel('Tipo').selectOption('clue')
    await page.getByLabel('Descrição').fill('A luz apareceu de madrugada.')
    await page.getByRole('button', { name: 'Criar pendência' }).click()
    await expect(page.getByRole('heading', { name: 'Quem acendeu o farol?' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('region', { name: 'Pendências abertas' }).getByRole('button', { name: 'Quem acendeu o farol?' }).click()
    await expect(page.getByText('A luz apareceu de madrugada.')).toBeVisible()
    await page.getByLabel('Alterar estado').selectOption('resolved')
    await page.getByRole('button', { name: 'Salvar estado' }).click()
    await expect(page.getByRole('list', { name: 'Histórico de estados' }).getByText(/Resolvida/)).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await expect(page.getByText('Nenhuma pendência aberta.')).toBeVisible()
    await page.getByRole('button', { name: 'Ver pendências' }).click()
    await expect(page.getByRole('button', { name: 'Quem acendeu o farol?' })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})
