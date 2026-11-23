import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { encryptBackup, restoreEncryptedBackup } from '../../src/server/encrypted-backup.ts'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('I4-04a/b: registra em tela estreita e encontra a sessão em uma instância restaurada', async ({ page, browser }) => {
  const directory = await mkdtemp(join(tmpdir(), 'lorekeeper-pilot-'))
  const database = join(directory, 'origem.sqlite')
  const restored = join(directory, 'restaurado.sqlite')
  const key = join(directory, 'key.bin')
  const backup = join(directory, 'backup.lkb')
  const app = createE2EServer(database, resolve('dist'))
  try {
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto(await app.listen({ host: '127.0.0.1', port: 0 }))
    await page.getByRole('button', { name: 'Nova campanha', exact: true }).click()
    await page.getByLabel('Nome', { exact: true }).fill('Bruma fictícia')
    await page.getByRole('button', { name: 'Criar campanha', exact: true }).click()
    await page.getByRole('button', { name: 'Nova sessão', exact: true }).click()
    await page.getByLabel('Título', { exact: true }).fill('Travessia da bruma')
    const text = [
      'A bússola apontou para o farol.',
      '\n```txt', 'registro-'.repeat(25), '```\n',
      '| Marco | Direção | Distância | Observações | A | B | C | D | E | F | G | H |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      '| Farol vermelho | Sudoeste | Quinze quilômetros | Caminho secundário | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |',
    ].join('\n')
    await page.getByLabel('Anotações', { exact: true }).fill(text)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    const preview = page.getByRole('region', { name: 'Prévia Markdown' })
    const editor = page.getByLabel('Anotações', { exact: true })
    const editorBox = await editor.boundingBox()
    const previewBox = await preview.boundingBox()
    expect(editorBox).not.toBeNull()
    expect(previewBox).not.toBeNull()
    expect(previewBox!.y).toBeGreaterThanOrEqual(editorBox!.y + editorBox!.height)
    await expect(preview.getByText('A bússola apontou para o farol.')).toBeVisible()
    await expect(preview.getByRole('table')).toBeVisible()
    expect(await preview.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(
      await preview.evaluate((element) => element.clientWidth),
    )
    expect(await preview.locator('pre').evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
    expect(await preview.getByRole('table').evaluate((element) => {
      const wrapper = element.parentElement!
      return wrapper.scrollWidth > wrapper.clientWidth
    })).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

    await writeFile(key, randomBytes(32), { mode: 0o600 })
    await encryptBackup(database, backup, key)
    const startedAt = performance.now()
    await restoreEncryptedBackup(backup, restored, key)
    test.info().annotations.push({
      type: 'restauração local fictícia',
      description: `${Math.round(performance.now() - startedAt)} ms`,
    })
    const replica = createE2EServer(restored, resolve('dist'))
    const other = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    try {
      const reopened = await other.newPage()
      await reopened.goto(await replica.listen({ host: '127.0.0.1', port: 0 }))
      await reopened.getByRole('button', { name: 'Busca', exact: true }).click()
      await reopened.getByLabel('Termos de busca').fill('bussola')
      await reopened.getByRole('button', { name: 'Buscar', exact: true }).click()
      await expect(reopened.locator('mark')).toHaveText('bússola')
      await reopened.getByRole('button', { name: 'Travessia da bruma', exact: true }).click()
      await expect(reopened.getByLabel('Anotações', { exact: true })).toHaveValue(text)
    } finally {
      await finishE2EServer(replica, [other])
    }
  } finally {
    await finishE2EServer(app, [page.context()])
    await rm(directory, { recursive: true, force: true })
  }
})
