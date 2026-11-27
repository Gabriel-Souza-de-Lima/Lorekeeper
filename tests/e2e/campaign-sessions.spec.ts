import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('UX70-01/02/05: lista resumos confirmados, recebe foco e omite leitura vazia', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa fictícia' } })).json()
    const root = origin + '/api/campaigns/' + id
    for (const number of [1, 2, 3, 4]) {
      const { id: sessionId, ...fields } = await (await request.post(root + '/sessions', { data: { date: '2026-11-27' } })).json()
      expect((await request.put(root + '/sessions/' + sessionId, {
        data: { ...fields, number, title: 'Travessia ' + number, body: '# Modelo fictício', summary: number === 4 ? '' : 'Resumo ' + number },
      })).ok()).toBe(true)
    }
    expect((await request.post(root + '/wiki', {
      data: { id: crypto.randomUUID(), type: 'character', title: 'Vigia fictícia', body: '' },
    })).ok()).toBe(true)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Costa fictícia', exact: true }).click()
    const list = page.getByRole('region', { name: 'Sessões', exact: true })
    await expect(list.getByRole('listitem')).toHaveCount(4)
    const card = list.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Travessia 1', exact: true }) })
    const area = card.getByRole('button', { name: 'Travessia 1', exact: true })
    expect((await area.boundingBox())!.width).toBeGreaterThanOrEqual((await card.boundingBox())!.width - 2)
    await expect(area).toHaveAccessibleDescription('Sessão 1 · 27/11/2026 Resumo 1')
    await expect(list.getByText('Resumo 1')).toBeVisible()
    await expect(list.getByText('Sem resumo', { exact: true })).toHaveCount(1)
    await expect(page.getByText('Modelo fictício')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Retomar campanha' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Wiki da campanha' }).click()
    await page.getByRole('button', { name: 'Vigia fictícia' }).click()
    await expect(page.getByRole('article', { name: 'Conteúdo da página' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Personagens', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Personagens', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Vigia fictícia' }).click()
    await page.getByRole('button', { name: 'Wiki da campanha', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Wiki da campanha', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Sessões', exact: true }).press('Enter')
    await expect(list.getByRole('heading', { name: 'Sessões' })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Sessões', exact: true })).toHaveAttribute('aria-current', 'location')
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 800 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    }
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('UX70-03/04: lateral protege sessão e wiki sem cancelar destino', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa' } })).json()
    const url = origin + '/api/campaigns/' + id
    await page.goto(origin)
    await page.getByRole('button', { name: 'Costa', exact: true }).click()
    await page.getByRole('button', { name: 'Nova sessão', exact: true }).click()
    const notes = page.getByLabel('Anotações', { exact: true })
    await notes.fill('Registro fictício')
    const sidebar = page.locator('.sidebar')
    const wiki = sidebar.getByRole('button', { name: 'Wiki da campanha' })
    const dialog = page.getByRole('dialog', { name: 'Alterações pendentes' })
    await wiki.press('Enter')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar' }).press('Enter')
    await expect(wiki).toBeFocused()
    await expect(notes).toHaveValue('Registro fictício')
    expect(await (await request.get(url + '/sessions')).json()).toEqual([])
    await wiki.press('Enter')
    await dialog.getByRole('button', { name: 'Salvar e continuar' }).press('Enter')
    await expect(page.getByRole('heading', { name: 'Wiki da campanha' })).toBeFocused()
    expect(await (await request.get(url + '/sessions')).json()).toHaveLength(1)
    await page.getByRole('button', { name: 'Nova página' }).click()
    await page.getByLabel('Descrição').fill('Texto ainda local')
    const sessions = sidebar.getByRole('button', { name: 'Sessões', exact: true })
    await sessions.press('Enter')
    await expect(dialog).toContainText('Nova página da wiki')
    await expect(dialog.getByRole('button', { name: 'Salvar e continuar' })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Descartar e continuar' }).press('Enter')
    await expect(page.getByRole('heading', { name: 'Sessões', exact: true })).toBeFocused()
    expect(await (await request.get(url + '/wiki')).json()).toEqual([])
    await sidebar.getByRole('button', { name: 'Navegação', exact: true }).press('Enter')
    await expect(sessions).toBeVisible()
    await sidebar.getByRole('button', { name: 'Favoritos' }).press('Enter')
    await expect(page.getByRole('dialog', { name: 'Favoritos' })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('UX70-03: anexos sem envio e gravação incerta impedem saída silenciosa', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  const gate = Promise.withResolvers<void>()
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa' } })).json()
    const url = origin + '/api/campaigns/' + id
    await page.goto(origin)
    await page.getByRole('button', { name: 'Costa', exact: true }).click()
    await page.getByText('Anexos da campanha', { exact: true }).click()
    await page.getByLabel('Arquivo', { exact: true }).setInputFiles({
      name: 'registro.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4'),
    })
    const dialog = page.getByRole('dialog', { name: 'Alterações pendentes' })
    await page.getByRole('button', { name: 'Nova sessão', exact: true }).click()
    await expect(dialog).toContainText('Arquivo, vínculo ou renomeação')
    await dialog.getByRole('button', { name: 'Descartar e continuar' }).click()
    const notes = page.getByLabel('Anotações', { exact: true })
    await notes.fill('Texto que precisa ser preservado')
    const requested = Promise.withResolvers<void>()
    await page.route(url + '/sessions', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      requested.resolve()
      await gate.promise
      await route.fulfill({ status: 503 })
    })
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await requested.promise
    const wiki = page.locator('.sidebar').getByRole('button', { name: 'Wiki da campanha' })
    await wiki.click()
    await expect(dialog).toContainText('Operação da sessão em andamento ou sem confirmação')
    await expect(dialog.getByRole('button')).toHaveCount(1)
    gate.resolve()
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('status')).toContainText('Falha ao salvar')
    await expect(notes).toHaveValue('Texto que precisa ser preservado')
    await wiki.press('Enter')
    await expect(dialog.getByRole('button')).toHaveCount(1)
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    expect(await (await request.get(url + '/sessions')).json()).toEqual([])
  } finally {
    gate.resolve()
    await finishE2EServer(app, [page.context()], request)
  }
})
