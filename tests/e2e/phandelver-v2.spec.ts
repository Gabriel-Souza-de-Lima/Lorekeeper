import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'
import { seedPhandelver } from '../fixtures/phandelver/seed.ts'

test('PHV2-01/02/03/07: compara indicadores integrais e navega pelo catálogo independente', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const { root, ids } = await seedPhandelver(app, 'complete')
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = page.getByRole('button', { name: 'A Mina Perdida de Phandelver', exact: true })
    await page.goto(origin)
    await campaign.click()
    const metrics = page.getByRole('region', { name: 'Indicadores da campanha' })
    for (const label of ['Sessões ativas 8', 'Missões ativas 2', 'Pendências abertas 8', 'Personagens e NPCs 22']) {
      await expect(metrics.getByRole('button', { name: label, exact: true })).toBeVisible()
    }
    const recent = page.getByRole('region', { name: 'Sessões recentes' })
    expect(await recent.getByRole('listitem').count()).toBe(3)
    const rows = (await (await request.get(origin + root + '/sessions')).json()) as { title: string; id: string }[]
    expect(rows.slice(0, 3).map(({ id }) => id)).toEqual(['s8', 's7', 's6'].map(ids))
    await expect(recent.getByRole('listitem').first()).toContainText(rows[0].title)
    await expect(recent.getByRole('button', { name: /Excluir sessão/ })).toHaveCount(0)
    await expect(page.getByText('Momento da campanha', { exact: true })).toHaveCount(0)
    await metrics.getByRole('button', { name: 'Sessões ativas 8' }).click()
    await expect(page.getByRole('heading', { name: 'Sessões', level: 1 })).toBeFocused()
    await expect(page.getByRole('region', { name: 'Sessões', exact: true }).getByRole('listitem')).toHaveCount(8)
    await expect(metrics).toHaveCount(0)
    await page.getByRole('button', { name: rows[7].title, exact: true }).click()
    await page.getByLabel('Anotações', { exact: true }).fill('Rascunho fictício')
    await page.getByRole('button', { name: 'Lorekeeper', exact: true }).click()
    const guard = page.getByRole('dialog', { name: 'Alterações pendentes' })
    await expect(guard).toBeVisible()
    await guard.getByRole('button', { name: 'Continuar mantendo o rascunho' }).click()
    await expect(campaign).toBeVisible()
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog', { name: 'Navegação rápida' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Navegação rápida', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Campanha de controle vazia', exact: true }).click()
    await expect(metrics.getByRole('button', { name: 'Sessões ativas 0' })).toBeVisible()
    await expect(metrics.getByRole('button', { name: 'Personagens e NPCs 0' })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})
