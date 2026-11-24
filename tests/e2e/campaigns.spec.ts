import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

async function withServer(browser: Browser, database: string, scenario: (page: Page) => Promise<void>) {
  const app = createE2EServer(database, resolve('dist'))
  let context: BrowserContext | undefined
  try {
    const url = await app.listen({ host: '127.0.0.1', port: 0 })
    context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto(url)
    await scenario(page)
  } finally {
    await finishE2EServer(app, context ? [context] : [])
  }
}

function newSessionButton(page: Page) {
  return page.locator('header')
    .filter({ has: page.getByRole('heading', { name: 'Sessões', exact: true }) })
    .getByRole('button', { name: 'Nova sessão', exact: true })
}

test('C01/C02/C03/S01/S02: gerencia campanha, escreve duas sessões e reabre após reiniciar', async ({ browser }) => {
  const dir = mkdtempSync(join(tmpdir(), 'lorekeeper-browser-'))
  const db = join(dir, 'test.sqlite')
  try {
    await test.step('Registrar e arquivar no primeiro servidor', () => withServer(browser, db, async (page) => {
      await page.getByRole('button', { name: 'Nova campanha' }).click({ timeout: 4000 })
      await page.getByLabel('Nome', { exact: true }).fill('Costa da Bruma')
      await page.getByRole('button', { name: 'Criar campanha' }).click()
      await page.getByRole('button', { name: 'Editar campanha' }).click()
      await page.getByLabel('Sistema', { exact: true }).fill('D&D')
      await page.getByRole('button', { name: 'Salvar campanha' }).click()

      const newSession = newSessionButton(page)
      await newSession.click()
      // Sair de uma sessão ainda local não cria uma entrada.
      await page.getByRole('button', { name: 'Voltar à campanha' }).click()
      await newSession.click()
      await page.getByLabel('Título').fill('O farol')
      await page.getByLabel('Data real').fill('2026-02-01')
      const notes = page.getByLabel('Anotações', { exact: true })
      await notes.fill('# A descoberta\n\n- [x] Farol visto\n\n| Lugar | Estado |\n| --- | --- |\n| Farol | Ativo |')
      await expect(page.getByRole('heading', { name: 'A descoberta' })).toBeVisible()
      await expect(page.getByRole('table')).toBeVisible()
      await page.getByRole('button', { name: 'Salvar', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
      await page.getByRole('button', { name: 'Voltar à campanha' }).click()

      await newSession.click()
      const title = page.getByLabel('Título')
      await title.fill('A ponte')
      await expect(title).toHaveValue('A ponte')
      await page.getByLabel('Data real').fill('2026-02-02')
      await page.route('**/api/campaigns/*/sessions', (route) =>
        route.request().method() === 'POST' ? route.abort() : route.continue())
      await notes.fill('Encontramos a ponte.')
      await page.getByRole('button', { name: 'Salvar', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText(/Falha ao salvar/)
      await expect(notes).toHaveValue('Encontramos a ponte.')
      await page.unroute('**/api/campaigns/*/sessions')
      await page.getByRole('button', { name: 'Salvar', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
      await page.getByRole('button', { name: 'Voltar à campanha' }).click()
      await page.getByRole('button', { name: 'Arquivar campanha' }).click()
      await expect(page.getByRole('button', { name: 'Reativar campanha' })).toBeVisible()

    }))
    await test.step('Consultar o acervo no servidor reiniciado', () => withServer(browser, db, async (page) => {
      const notes = page.getByLabel('Anotações', { exact: true })
      await page.getByRole('button', { name: 'Arquivadas' }).click()
      await page.getByRole('button', { name: 'Costa da Bruma' }).click()
      await expect(page.getByRole('button', { name: /^(A ponte|O farol)$/ })).toHaveText(['A ponte', 'O farol'])
      await page.getByRole('button', { name: 'A ponte', exact: true }).click()
      await expect(notes).toHaveValue('Encontramos a ponte.')
      await page.getByRole('button', { name: 'Voltar à campanha' }).click()
      await page.getByRole('button', { name: 'O farol', exact: true }).click()
      await expect(notes).toHaveValue(/A descoberta/)
      await expect(notes).toBeDisabled()
      await page.getByRole('button', { name: 'Voltar à campanha' }).click()
      await page.getByRole('button', { name: 'Reativar campanha' }).click()
      await expect(newSessionButton(page)).toBeVisible()
      await expect(page.getByRole('listitem').getByRole('button', { name: 'Nova sessão', exact: true })).toHaveCount(0)
    }))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
