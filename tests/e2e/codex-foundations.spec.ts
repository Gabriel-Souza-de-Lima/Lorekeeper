import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('UX61-01/03/04: faixa desktop, contexto da campanha e retomada vazia', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const name = 'Arquivo fictício ' + 'Farol'.repeat(17)
    expect((await request.post(origin + '/api/campaigns', { data: { name } })).status()).toBe(201)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(origin)
    await page.getByRole('button', { name, exact: true }).click()
    const toggle = page.getByRole('button', { name: 'Navegação', exact: true })
    const sidebar = page.locator('.sidebar')
    const sideWidth = () => sidebar.evaluate((node) => node.getBoundingClientRect().width)
    const expanded = await sideWidth()
    await toggle.press('Enter')
    await expect(toggle).toBeFocused()
    expect(await sideWidth()).toBeLessThanOrEqual(80)
    expect(expanded - await sideWidth()).toBeGreaterThanOrEqual(140)
    const control = (await toggle.boundingBox())!
    const rail = (await sidebar.boundingBox())!
    expect(control.width).toBeGreaterThanOrEqual(44)
    expect(control.height).toBeGreaterThanOrEqual(44)
    expect(control.x - rail.x).toBeGreaterThanOrEqual(6)
    expect(rail.x + rail.width - control.x - control.width).toBeGreaterThanOrEqual(6)
    const destinations = page.getByRole('navigation', { name: `Campanha ${name}`, exact: true })
    await expect(destinations.getByRole('button', { name: 'Personagens' })).toBeVisible()
    await toggle.press('Enter')
    await expect(sidebar.getByRole('button', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page')
    await expect(sidebar.getByRole('button', { name: 'Personagens' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Personagens' })).toHaveCount(1)
    const create = page.getByRole('button', { name: 'Nova sessão' })
    const recap = page.getByRole('region', { name: 'Retomar campanha' })
    await expect(recap.getByText('Nenhuma sessão para retomar.')).toBeVisible()
    expect((await create.boundingBox())!.y).toBeLessThan((await recap.boundingBox())!.y)
    await expect(recap.getByText('Nenhum NPC ou localidade nas sessões recentes.')).toHaveCount(0)
    await create.press('Enter')
    await page.getByLabel('Anotações', { exact: true }).fill('Rascunho fictício protegido')
    await expect(page.getByRole('status')).toContainText('rascunho protegido')
    page.once('dialog', (dialog) => void dialog.dismiss())
    await sidebar.getByRole('button', { name: 'Personagens' }).press('Enter')
    await expect(page.getByLabel('Anotações', { exact: true })).toHaveValue('Rascunho fictício protegido')
    page.once('dialog', (dialog) => void dialog.accept())
    await sidebar.getByRole('button', { name: 'Personagens' }).press('Enter')
    await expect(page.getByRole('heading', { name: 'Personagens' })).toBeFocused()
    await page.setViewportSize({ width: 390, height: 800 })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.press('Enter')
    await expect(destinations).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('UX61-01/02/03: aciona o cartão, separa edição e mantém navegação compacta acessível', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    for (const name of ['Costa fictícia', 'Serra fictícia']) {
      expect((await request.post(origin + '/api/campaigns', { data: { name } })).status()).toBe(201)
    }
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(origin)
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Costa fictícia' }) })
    const open = card.getByRole('button', { name: 'Costa fictícia', exact: true })
    await expect(open).toBeVisible()
    const bounds = (await open.boundingBox())!
    expect(bounds.height).toBeGreaterThanOrEqual(44)
    expect(bounds.width).toBeGreaterThanOrEqual((await card.boundingBox())!.width - 2)
    await open.click({ position: { x: bounds.width - 8, y: bounds.height - 8 } })
    await expect(page.getByRole('heading', { name: 'Costa fictícia', level: 1 })).toBeFocused()
    await page.getByRole('navigation', { name: 'Campanha Costa fictícia' }).getByRole('button', { name: 'Personagens' }).press('Enter')
    await expect(page.getByRole('heading', { name: 'Personagens' })).toBeFocused()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Voltar ao painel' }).click()
    await open.press('Enter')
    await expect(page.getByRole('heading', { name: 'Costa fictícia', level: 1 })).toBeFocused()
    await page.getByRole('button', { name: 'Voltar ao painel' }).click()
    await card.getByRole('button', { name: 'Editar Costa fictícia' }).press('Enter')
    await expect(page.getByRole('heading', { name: 'Editar campanha' })).toBeVisible()
    const input = page.getByRole('textbox', { name: 'Nome', exact: true })
    await expect(input).toBeFocused()
    const contrast = await input.evaluate((field) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')!
      const luminance = (color: string) => {
        ctx.fillStyle = color
        ctx.fillRect(0, 0, 1, 1)
        return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)).reduce((sum, value, index) => {
          const s = value / 255
          return sum + [0.2126, 0.7152, 0.0722][index] * (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4)
        }, 0)
      }
      const style = getComputedStyle(field)
      const ratio = (a: string, b: string) => {
        const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
        return (values[0] + 0.05) / (values[1] + 0.05)
      }
      return {
        border: ratio(style.borderTopColor, style.backgroundColor),
        adjacent: ratio(style.borderTopColor, getComputedStyle(field.closest('form')!).backgroundColor),
        text: ratio(style.color, style.backgroundColor),
        focus: ratio(style.outlineColor, style.backgroundColor),
        outline: style.outlineWidth,
      }
    })
    expect(contrast.border).toBeGreaterThanOrEqual(3)
    expect(contrast.adjacent).toBeGreaterThanOrEqual(3)
    expect(contrast.text).toBeGreaterThanOrEqual(4.5)
    expect(contrast.focus).toBeGreaterThanOrEqual(3)
    expect(contrast.outline).toBe('3px')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.getByRole('button', { name: 'Voltar ao painel' }).click()

    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 })
      await page.reload()
      const toggle = page.getByRole('button', { name: 'Navegação', exact: true })
      await expect(toggle).toHaveAttribute('aria-expanded', String(width >= 760))
      if (width < 760) await toggle.press('Enter')
      await expect(page.getByRole('navigation', { name: 'Acervo' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
      await toggle.press('Enter')
      await expect(toggle).toBeFocused()
      await expect(page.getByRole('navigation', { name: 'Acervo' })).toBeHidden()
      await open.press('Enter')
      await expect(page.getByRole('heading', { name: 'Costa fictícia', level: 1 })).toBeFocused()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    }
  } finally { await finishE2EServer(app, [page.context()], request) }
})
