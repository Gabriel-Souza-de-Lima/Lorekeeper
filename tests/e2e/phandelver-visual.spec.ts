import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'
import { seedPhandelver } from '../fixtures/phandelver/seed.ts'

test('FV-01–04/06: geometria e tokens do Phandelver V2 em cinco larguras', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    await seedPhandelver(app, 'complete')
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    await page.goto(origin)
    await page.getByRole('button', { name: 'A Mina Perdida de Phandelver', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pendências abertas 8' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const referencePath = process.env.PHANDELVER_REFERENCE
    const reference = referencePath ? await page.context().newPage() : null
    if (reference && referencePath) {
      const source = readFileSync(referencePath)
      expect(createHash('sha256').update(source).digest('hex')).toBe('6618e8d13feae6d6896ef2ad557de9eefa7b3f2ae0164c9200cb2354c112e18e')
      await reference.route('https://**/*', (route) => route.abort())
      await reference.setContent(source.toString('utf8'))
      await reference.evaluate(() => document.fonts.ready)
    }
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      const metrics = page.getByRole('region', { name: 'Indicadores da campanha' })
      const value = metrics.locator('strong').first()
      await expect(value).toHaveCSS('font-size', width <= 700 ? '27px' : '30px')
      await expect(metrics).toHaveCSS('column-gap', width <= 700 ? '8px' : '10px')
      await expect(metrics.getByRole('button').first()).toHaveCSS('border-radius', '12px')
      const columns = await metrics.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length)
      expect(columns).toBe(width <= 900 ? 2 : 4)
      const recent = page.getByRole('region', { name: 'Sessões recentes' })
      await expect(recent).toHaveCSS('padding', width <= 700 ? '14px' : '18px')
      await expect(recent.locator('.record-number').first()).toHaveCSS('min-width', width <= 700 ? '32px' : '39px')
      await expect(recent.locator('.campaign-card-title').first()).toHaveCSS('text-decoration-line', 'none')
      await expect(recent.getByRole('heading')).toHaveCSS('font-size', width <= 700 ? '21px' : '23px')
      const geometry = await page.evaluate(() => {
        const bounds = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
        return { rail: bounds('.sidebar').width, workspace: bounds('.workspace').width,
          pending: bounds('[aria-label="Pendências abertas"]').height, missions: bounds('[aria-label="Missões abertas"]').height,
          scroll: document.documentElement.scrollWidth }
      })
      expect(geometry.scroll).toBe(width)
      expect(geometry.workspace).toBeLessThanOrEqual(1180)
      if (width > 700) expect(geometry.rail).toBeCloseTo(232, 0)
      if (width > 900) expect(Math.abs(geometry.pending - geometry.missions)).toBeLessThanOrEqual(2)
      if (reference) {
        await page.mouse.move(0, 0)
        await reference.setViewportSize({ width, height: 900 })
        const target = await reference.locator('.workspace').boundingBox()
        const current = await page.locator('.workspace').boundingBox()
        if (width >= 1280) {
          const modelMetrics = await reference.locator('.metrics').boundingBox()
          const actualMetrics = await metrics.boundingBox()
          expect(Math.abs(modelMetrics!.y - actualMetrics!.y)).toBeLessThanOrEqual(2)
          const modelRecent = await reference.locator('.stack > .panel').first().boundingBox()
          const actualRecent = await recent.boundingBox()
          expect(Math.abs(modelRecent!.height - actualRecent!.height)).toBeLessThanOrEqual(2)
        }
        expect(Math.abs(target!.x - current!.x)).toBeLessThanOrEqual(2)
        expect(Math.abs(target!.width - current!.width)).toBeLessThanOrEqual(2)
        for (const [model, actual, property] of [
          ['body', 'body', 'font-size'],
          ['body', 'body', 'background-color'],
          ['.metric', '.campaign-metrics button', 'background-color'],
          ['.metric', '.campaign-metrics button', 'border-color'],
          ['.metric .count', '.campaign-metrics strong', 'color'],
        ]) {
          const original = await reference.locator(model).first().evaluate((element, key) => getComputedStyle(element).getPropertyValue(key), property)
          await expect(page.locator(actual).first()).toHaveCSS(property, original)
        }
      }
    }
    const sidebar = page.locator('.sidebar')
    await sidebar.getByRole('button', { name: 'Navegação', exact: true }).click()
    expect((await sidebar.boundingBox())!.width).toBeCloseTo(68, 0)
    const attachments = page.getByRole('region', { name: 'Anexos' })
    await expect(attachments.getByRole('button', { name: 'Adicionar anexo' })).toBeVisible()
    await expect(attachments.getByText(/6 arquivos vinculados/)).toBeVisible()
    await expect(attachments.getByText(/Último:/)).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 360 })
    await sidebar.getByRole('button', { name: 'Navegação', exact: true }).click()
    const brand = sidebar.getByRole('button', { name: 'Lorekeeper', exact: true })
    const toggle = sidebar.getByRole('button', { name: 'Navegação', exact: true })
    expect(Math.abs((await brand.boundingBox())!.y - (await toggle.boundingBox())!.y)).toBeLessThanOrEqual(2)
    await brand.click()
    await page.getByRole('button', { name: 'Campanha pequena com nome propositalmente extenso para validar a largura', exact: true }).click()
    const about = sidebar.getByRole('button', { name: 'Sobre', exact: true })
    await about.scrollIntoViewIfNeeded()
    expect(await sidebar.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280)

  } finally { await finishE2EServer(app, [page.context()], request) }
})
