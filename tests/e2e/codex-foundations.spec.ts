import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

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
