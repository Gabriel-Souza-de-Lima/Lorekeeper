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
    expect((await request.post(origin + root + '/sessions', { data: { date: '2026-11-27' } })).ok()).toBe(true)
    await page.getByRole('button', { name: 'Lorekeeper', exact: true }).click()
    await campaign.click()
    await metrics.getByRole('button', { name: 'Sessões ativas 9' }).click()
    const catalog = page.getByRole('region', { name: 'Sessões', exact: true })
    await expect(catalog.getByRole('listitem')).toHaveCount(8)
    await catalog.getByRole('button', { name: 'Próxima' }).click()
    await expect(catalog.getByRole('listitem')).toHaveCount(1)
    await expect(catalog.getByRole('button', { name: rows[7].title, exact: true })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('PHV2-04/05/06/08/09: pagina 28 pendências e mantém os contextos de detalhe e anexos', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    await seedPhandelver(app, 'load')
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    await page.goto(origin)
    await page.getByRole('button', { name: 'A Mina Perdida de Phandelver — carga', exact: true }).click()
    await page.getByRole('button', { name: 'Pendências abertas 28', exact: true }).click()
    const list = page.getByRole('region', { name: 'Lista de pendências' })
    await expect(list.getByRole('listitem')).toHaveCount(8)
    await expect(page.getByText('Página 1 de 4')).toBeVisible()
    await expect(page.getByRole('form', { name: 'Nova pendência' })).toHaveCount(0)
    await list.getByRole('button', { name: 'Próxima' }).click()
    const item = list.getByRole('listitem').first().getByRole('button')
    const name = (await item.getAttribute('aria-label'))!
    await item.click()
    await expect(list).toHaveCount(0)
    await expect(page.getByRole('heading', { name, exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Voltar às pendências' }).click()
    await expect(page.getByText('Página 2 de 4')).toBeVisible()
    await expect(list.getByRole('button', { name, exact: true })).toBeFocused()
    await list.getByRole('button', { name: 'Próxima' }).click()
    await list.getByRole('button', { name: 'Próxima' }).click()
    await expect(list.getByRole('listitem')).toHaveCount(4)
    await page.getByRole('button', { name: 'Fechadas 16' }).click()
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(list.getByRole('listitem')).toHaveCount(8)
    await page.getByRole('button', { name: 'Nova pendência' }).click()
    await page.getByLabel('Título', { exact: true }).fill('Pista fictícia ainda não confirmada')
    await page.getByRole('button', { name: 'Voltar às pendências' }).click()
    const guard = page.getByRole('dialog', { name: 'Alterações pendentes' })
    await guard.getByRole('button', { name: 'Descartar e continuar' }).click()
    await expect(list).toBeVisible()
    const sidebar = page.locator('.sidebar')
    await sidebar.getByRole('button', { name: 'Missões', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Ativas 2' })).toBeVisible()
    await page.getByRole('button', { name: 'Encerradas 10' }).click()
    await expect(page.getByRole('button', { name: 'Encerradas 10' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Entregar os suprimentos de Gundren' }).click()
    await expect(page.getByRole('button', { name: 'Reabrir missão' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar às missões' }).click()
    await expect(page.getByRole('button', { name: 'Entregar os suprimentos de Gundren' })).toBeFocused()
    await sidebar.getByRole('button', { name: 'Visão geral' }).click()
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    }
    await page.setViewportSize({ width: 320, height: 800 })
    await page.getByText('Ver arquivos vinculados', { exact: true }).click()
    const attachments = page.getByRole('region', { name: 'Anexos' })
    await expect(attachments.getByRole('link')).toHaveCount(6)
    await expect(attachments.getByLabel('Arquivo', { exact: true })).toHaveCount(0)
    const nameBox = await attachments.getByRole('link').first().boundingBox()
    expect(nameBox!.width).toBeGreaterThan(160)
    await attachments.getByRole('button', { name: 'Adicionar anexo' }).click()
    await expect(attachments.getByLabel('Arquivo', { exact: true })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('PHV2-08/11: estados legíveis, cartão acionável e anexos com largura útil', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    await seedPhandelver(app, 'complete')
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    await page.goto(origin)
    await page.getByRole('button', { name: 'A Mina Perdida de Phandelver', exact: true }).click()
    const pending = page.getByRole('region', { name: 'Pendências abertas' })
    await expect(pending.locator('.pending-status').first()).toBeVisible()
    const recent = page.getByRole('region', { name: 'Sessões recentes' })
    const files = page.getByRole('region', { name: 'Anexos' })
    await page.getByText('Ver arquivos vinculados', { exact: true }).click()
    await expect(files.getByRole('link')).toHaveCount(6)
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 800 })
      const card = await recent.getByRole('listitem').first().evaluate((item) => {
        const control = item.querySelector('button')!.getBoundingClientRect()
        return { available: item.getBoundingClientRect().width, width: control.width, height: control.height }
      })
      expect(card.width).toBeGreaterThanOrEqual(card.available - 2)
      expect(card.height).toBeGreaterThanOrEqual(44)
      const attachment = await files.getByRole('listitem').first().evaluate((row) => {
        const name = row.querySelector('a')!.getBoundingClientRect()
        const actions = row.querySelector('.actions')!.getBoundingClientRect()
        const parent = row.getBoundingClientRect()
        return { nameWidth: name.width, available: parent.width, nameBottom: name.bottom, actionsTop: actions.top, actionsLeft: actions.left, nameRight: name.right }
      })
      expect(attachment.nameWidth).toBeGreaterThanOrEqual(Math.min(165, attachment.available * 0.7))
      if (width <= 900) expect(attachment.actionsTop).toBeGreaterThanOrEqual(attachment.nameBottom)
      else expect(attachment.actionsLeft).toBeGreaterThanOrEqual(attachment.nameRight)
    }
    await pending.getByRole('button', { name: 'Ver pendências' }).press('Enter')
    const list = page.getByRole('region', { name: 'Lista de pendências' })
    const samples = new Map<string, number>()
    for (const tab of ['Abertas 8', 'Fechadas 16']) {
      await list.getByRole('button', { name: tab, exact: true }).click()
      const hasNext = await list.getByRole('button', { name: 'Próxima' }).count()
      for (let index = 0; index <= hasNext; index++) {
        const entries = await list.locator('.pending-status').evaluateAll((nodes) => {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const context = canvas.getContext('2d')!
          const luminance = (color: string) => {
            context.clearRect(0, 0, 1, 1)
            context.fillStyle = color
            context.fillRect(0, 0, 1, 1)
            const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
            const linear = (byte: number) => {
              const channel = byte / 255
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
            }
            return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
          }
          return nodes.map((node) => {
            const text = luminance(getComputedStyle(node).color)
            const background = luminance(getComputedStyle(node.closest('.panel')!).backgroundColor)
            return [node.textContent!.trim(), (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05)] as const
          })
        })
        for (const [state, ratio] of entries) samples.set(state, Math.min(ratio, samples.get(state) ?? Infinity))
        if (index < hasNext) await list.getByRole('button', { name: 'Próxima' }).click()
      }
    }
    expect([...samples.keys()].sort()).toEqual(['Aberta', 'Cancelada', 'Concluída', 'Em andamento'].sort())
    for (const ratio of samples.values()) expect(ratio).toBeGreaterThanOrEqual(4.5)
  } finally { await finishE2EServer(app, [page.context()], request) }
})
