import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { createApp } from '../../src/server/app.ts'
import { closeTestServer } from '../support/close-test-server.ts'

async function seed(request: APIRequestContext, base: string) {
  const campaign = await (await request.post(`${base}/api/campaigns`, { data: { name: 'Observatório' } })).json()
  const path = `${base}/api/campaigns/${campaign.id}/sessions`
  const session = await (await request.post(path, { data: { date: '2026-11-21' } })).json()
  return `${path}/${session.id}`
}

test('I2-03: recupera rascunho e reenvia o UUID após o servidor perder a resposta', async ({ page, context, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    const path = await seed(request, base)
    let originalKey: string | undefined
    let originalBody: unknown
    await page.goto(base)
    await page.getByRole('button', { name: 'Observatório' }).click()
    await page.getByRole('button', { name: 'Nova sessão', exact: true }).last().click()
    await page.route(path, async (route) => {
      if (route.request().method() !== 'PUT') return route.continue()
      originalKey = route.request().headers()['idempotency-key']
      originalBody = route.request().postDataJSON()
      await route.fetch()
      await route.abort()
    })
    await page.getByLabel('Anotações', { exact: true }).fill('A bússola aponta para o farol.')
    await expect(page.getByRole('status')).toHaveText(/Falha ao salvar/)
    expect(originalKey).toMatch(/^[0-9a-f-]{36}$/)
    await page.close()

    const next = await context.newPage()
    await next.goto(base)
    await next.getByRole('button', { name: 'Observatório' }).click()
    await next.getByRole('button', { name: 'Nova sessão', exact: true }).last().click()
    const retry = next.waitForRequest((req) => req.url() === path && req.method() === 'PUT')
    await next.getByRole('button', { name: /Recuperar rascunho/ }).click({ timeout: 4000 })
    await expect(next.getByLabel('Anotações', { exact: true })).toHaveValue('A bússola aponta para o farol.')
    const resent = await retry
    expect(resent.headers()['idempotency-key']).toBe(originalKey)
    expect(resent.postDataJSON()).toEqual(originalBody)
    await expect(next.getByRole('status')).toHaveText('Salvo no servidor')
    const revisions = await (await request.get(`${path}/revisions`)).json()
    expect(revisions.map(({ version }: { version: number }) => version)).toEqual([2, 1])
  } finally {
    await closeTestServer(app)
  }
})

test('I2-04: falha de armazenamento é visível e oferece download do texto', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    await seed(request, base)
    await page.addInitScript(() => {
      indexedDB.open = () => { throw new DOMException('Falha simulada', 'QuotaExceededError') }
      const click = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function () {
        if (this.download === 'rascunho-da-sessao.md' && this.href.startsWith('blob:')) {
          void fetch(this.href).then((response) => response.text()).then((text) => {
            document.documentElement.dataset.downloadedDraft = text
          })
        }
        click.call(this)
      }
    })
    await page.goto(base)
    await page.getByRole('button', { name: 'Observatório' }).click()
    await page.getByRole('listitem').getByRole('button', { name: 'Nova sessão', exact: true }).click()
    await page.getByLabel('Anotações', { exact: true }).fill('Registro ainda disponível na aba.')
    await expect(page.getByRole('status')).toHaveText(/Falha no armazenamento local/)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      page.getByRole('button', { name: 'Baixar rascunho', exact: true }).click({ timeout: 5000 }),
    ])
    expect(download.suggestedFilename()).toBe('rascunho-da-sessao.md')
    await expect(page.locator('html')).toHaveAttribute('data-downloaded-draft', 'Registro ainda disponível na aba.')
    await expect(page.getByLabel('Anotações', { exact: true })).toHaveValue('Registro ainda disponível na aba.')
  } finally {
    try {
      await page.close()
    } finally {
      await closeTestServer(app)
    }
  }
})

test('I2-04: confirmação antiga preserva edição nova em outra geração', async ({ page, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  const release = Promise.withResolvers<void>()
  const firstSaved = Promise.withResolvers<void>()
  const attempts: { key: string; body: string; version: number }[] = []
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    const path = await seed(request, base)
    await page.goto(base)
    await page.getByRole('button', { name: 'Observatório' }).click()
    await page.getByRole('button', { name: 'Nova sessão', exact: true }).last().click()
    await page.route(path, async (route) => {
      if (route.request().method() !== 'PUT') return route.continue()
      const { body, version } = route.request().postDataJSON()
      attempts.push({ key: route.request().headers()['idempotency-key'], body, version })
      if (attempts.length > 1) return route.continue()
      const response = await route.fetch()
      firstSaved.resolve()
      await release.promise
      await route.fulfill({ response })
    })
    const notes = page.getByLabel('Anotações', { exact: true })
    await notes.fill('O farol acendeu.')
    await firstSaved.promise
    await notes.fill('O farol acendeu e revelou a ponte.')
    release.resolve()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    const saved = await (await request.get(path)).json()
    expect(saved.body).toBe('O farol acendeu e revelou a ponte.')
    expect(attempts.map(({ body, version }) => [body, version])).toEqual([
      ['O farol acendeu.', 1],
      ['O farol acendeu e revelou a ponte.', 2],
    ])
    expect(new Set(attempts.map(({ key }) => key)).size).toBe(2)
  } finally {
    release.resolve()
    await closeTestServer(app)
  }
})

test('I2-03: duas abas mantêm edições offline independentes e permitem recuperá-las', async ({ page, context, request }) => {
  const app = createApp(':memory:', resolve('dist'))
  try {
    const base = await app.listen({ host: '127.0.0.1', port: 0 })
    await seed(request, base)
    const second = await context.newPage()
    for (const tab of [page, second]) {
      await tab.goto(base)
      await tab.getByRole('button', { name: 'Observatório' }).click()
      await tab.getByRole('listitem').getByRole('button', { name: 'Nova sessão', exact: true }).click()
    }
    await context.setOffline(true)
    const notes = 'Anotações'
    await page.getByLabel(notes, { exact: true }).fill('Primeira aba viu estrelas.')
    await second.getByLabel(notes, { exact: true }).fill('Segunda aba desenhou o mapa.')
    for (const tab of [page, second]) {
      await expect(tab.getByRole('status')).toHaveText(/Falha ao salvar/)
      await tab.close()
    }
    await context.setOffline(false)
    const reopened = await context.newPage()
    await reopened.goto(base)
    await reopened.getByRole('button', { name: 'Observatório' }).click()
    await reopened.getByRole('listitem').getByRole('button', { name: 'Nova sessão', exact: true }).click()
    const alternatives = reopened.getByRole('button', { name: /Recuperar rascunho/ })
    await expect(alternatives).toHaveCount(2)
    await alternatives.filter({ hasText: 'Segunda aba desenhou o mapa.' }).click()
    await expect(reopened.getByLabel(notes, { exact: true })).toHaveValue('Segunda aba desenhou o mapa.')
    await expect(reopened.getByRole('status')).toHaveText('Salvo no servidor')
    await expect(alternatives).toHaveCount(1)
  } finally {
    try {
      await test.step('Encerrar o contexto de abas de teste', () => context.close(), { timeout: 5000 })
    } finally {
      await test.step('Encerrar o servidor de teste', () => closeTestServer(app), { timeout: 5000 })
    }
  }
})
