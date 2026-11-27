import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P10-14: cancelar cadastro devolve o foco à Nova informação', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await request.post(origin + '/api/campaigns', { data: { name: 'Farol fictício' } })
    expect(campaign.status()).toBe(201)
    const path = origin + '/api/campaigns/' + (await campaign.json()).id + '/information'
    await page.setViewportSize({ width: 320, height: 700 })
    const enter = async () => {
      await page.getByRole('button', { name: 'Farol fictício', exact: true }).click()
      await page.getByRole('button', { name: 'Informações', exact: true }).click()
    }
    await page.goto(origin)
    await enter()
    const start = page.getByRole('button', { name: 'Nova informação' })
    await start.press('Enter')
    await page.getByLabel('Enunciado').fill('Rascunho fictício para cancelar')
    await expect(page.getByRole('status')).toHaveText('Rascunho protegido neste navegador')
    const countDrafts = () => page.evaluate(() => new Promise<number>((resolve, reject) => {
      const open = indexedDB.open('lorekeeper-narrative')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('drafts', 'readonly')
        const count = tx.objectStore('drafts').count()
        tx.oncomplete = () => { db.close(); resolve(count.result) }
        tx.onabort = () => { db.close(); reject(tx.error) }
      }
    }))
    expect(await countDrafts()).toBe(1)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).press('Enter')
    await expect(page.getByRole('form', { name: 'Rascunho de informação' })).toHaveCount(0)
    await expect(start).toBeEnabled()
    await expect(start).toBeFocused()
    expect(await countDrafts()).toBe(0)
    expect(await (await request.get(path)).json()).toEqual([])
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('P10-01/07/09/14: rascunho, confirmação explícita e reenvio em 320 px', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = (await (await request.post(origin + '/api/campaigns', { data: { name: 'Bruma' } })).json()).id
    const path = origin + '/api/campaigns/' + campaign + '/information'
    await page.setViewportSize({ width: 320, height: 700 })
    const enter = async () => {
      await page.getByRole('button', { name: 'Bruma', exact: true }).click()
      await page.getByRole('button', { name: 'Informações', exact: true }).click({ timeout: 4000 })
    }
    await page.goto(origin)
    await enter()
    await page.getByRole('button', { name: 'Nova informação' }).press('Enter')
    await page.context().setOffline(true)
    await page.getByLabel('Enunciado').fill('A luz apareceu no farol')
    await page.getByLabel('Natureza', { exact: true }).selectOption('rumor')
    await expect(page.getByRole('status')).toHaveText('Rascunho protegido neste navegador')
    expect(await (await request.get(path)).json()).toEqual([])
    await page.context().setOffline(false)
    await page.reload()
    await enter()
    await page.getByRole('button', { name: /Recuperar rascunho/ }).click()
    await expect(page.getByLabel('Enunciado')).toHaveValue('A luz apareceu no farol')
    await page.route(path + '/*', async (route) => {
      expect((await route.fetch()).status()).toBe(201)
      await route.abort()
    }, { times: 1 })
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('conexão')
    await page.getByRole('button', { name: 'Reenviar gravação' }).click()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    await expect(page.getByRole('heading', { name: 'A luz apareceu no farol' })).toBeVisible()
    expect(await (await request.get(path)).json()).toHaveLength(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('P10-05/07/10/12: preserva texto em conflito e abre a fonte após restauração', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = (await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa' } })).json()).id
    const root = origin + '/api/campaigns/' + campaign
    const session = (await (await request.post(root + '/sessions', { data: { date: '2026-11-25' } })).json()).id
    const id = crypto.randomUUID()
    const write = (data: object) => request.put(root + '/information/' + id, { data, headers: { 'Idempotency-Key': crypto.randomUUID() } })
    expect((await write({ version: 0, statement: 'Rumor inicial', nature: 'rumor', source: { documentId: session } })).status()).toBe(201)
    expect((await request.patch(root + '/sessions/' + session + '/trash', { data: { trashed: true } })).ok()).toBe(true)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Costa', exact: true }).click()
    const enter = () => page.getByRole('button', { name: 'Informações', exact: true }).click()
    await enter()
    await page.getByRole('button', { name: 'Rumor inicial', exact: true }).click()
    await expect(page.getByText(/Origem temporariamente indisponível/)).toBeVisible()
    await page.getByRole('button', { name: 'Editar informação' }).click()
    await page.getByLabel('Enunciado').fill('Rascunho em conflito')
    expect((await write({ version: 1, statement: 'Versão remota' })).ok()).toBe(true)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Versão remota' })).toBeVisible()
    await expect(page.getByLabel('Enunciado')).toHaveValue('Rascunho em conflito')
    await page.getByRole('button', { name: 'Usar versão atual como base' }).click()
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    const confirmed = page.getByRole('region', { name: 'Dados confirmados', exact: true })
    await expect(confirmed.getByRole('heading', { name: 'Rascunho em conflito', exact: true })).toBeVisible()
    const originalRevision = confirmed.getByRole('listitem').filter({
      has: page.getByText(/^Versão 1 ·/),
    })
    await expect(originalRevision.getByText('Rumor inicial', { exact: true })).toBeVisible()

    const list = page.getByRole('region', { name: 'Lista de informações', exact: true })
    const updatedItem = list.getByRole('button', { name: 'Rascunho em conflito', exact: true })
    await expect(updatedItem).toBeVisible()
    await expect(list.getByRole('button', { name: 'Rumor inicial', exact: true })).toHaveCount(0)
    expect((await request.patch(root + '/sessions/' + session + '/trash', { data: { trashed: false } })).ok()).toBe(true)
    await updatedItem.click()
    await page.getByRole('region', { name: 'Origem inicial' }).getByRole('button', { name: 'Nova sessão', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Editor de sessão' })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('P10-07: avisa sobre armazenamento indisponível e oferece download', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    await request.post(origin + '/api/campaigns', { data: { name: 'Ilhas' } })
    await page.addInitScript(() => {
      const open = IDBFactory.prototype.open
      IDBFactory.prototype.open = function (name: string, version?: number) {
        if (name === 'lorekeeper-narrative') throw new Error('Falha fictícia')
        return open.call(this, name, version)
      }
    })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Ilhas', exact: true }).click()
    await page.getByRole('button', { name: 'Informações', exact: true }).click()
    await page.getByRole('button', { name: 'Nova informação' }).click()
    await page.getByLabel('Enunciado').fill('Texto a recuperar')
    await expect(page.getByRole('status')).toHaveText('Falha no armazenamento local')
    await expect(page.getByLabel('Enunciado')).toHaveValue('Texto a recuperar')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar rascunho' }).click()
    expect((await download).suggestedFilename()).toBe('rascunho-informacao.json')
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('P10-02/04/05/11: associa fontes, mantém evidências divergentes e consulta pendência', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = (await (await request.post(origin + '/api/campaigns', { data: { name: 'Farol' } })).json()).id
    const root = origin + '/api/campaigns/' + campaign
    const id = crypto.randomUUID()
    const npc = crypto.randomUUID()
    const pending = crypto.randomUUID()
    expect((await request.post(root + '/wiki', { data: { id: npc, type: 'npc', title: 'Vigia', body: '' } })).ok()).toBe(true)
    expect((await request.post(root + '/pending-items', { data: { id: pending, title: 'Investigar a luz' } })).ok()).toBe(true)
    expect((await request.put(root + '/information/' + id, { headers: { 'Idempotency-Key': crypto.randomUUID() },
      data: { version: 0, statement: 'Uma luz sinaliza o barco', nature: 'report' } })).ok()).toBe(true)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Farol', exact: true }).click()
    await page.getByRole('button', { name: 'Informações', exact: true }).click()
    await page.getByRole('button', { name: 'Uma luz sinaliza o barco', exact: true }).click()
    const form = page.getByRole('form', { name: 'Rascunho de informação' })
    const save = form.getByRole('button', { name: 'Salvar', exact: true })
    await page.getByRole('button', { name: 'Vincular registros' }).click()
    await form.getByLabel('Sessões e páginas da wiki').selectOption(npc)
    await form.getByLabel('Pendências').selectOption(pending)
    await save.click()
    for (const [role, description] of [['supports', 'A luz apareceu à meia-noite'], ['contradicts', 'O mecanismo funciona sozinho']]) {
      await page.getByRole('button', { name: 'Acrescentar evidência' }).click()
      await form.getByLabel('Classificação da evidência').selectOption(role)
      await form.getByLabel('Trecho ou nota de origem').fill(description)
      await save.click()
      await expect(page.getByRole('status')).toHaveText('Salvo no servidor')
    }
    await page.getByRole('button', { name: 'Alterar estado' }).click()
    await form.getByLabel('Estado', { exact: false }).selectOption('refuted')
    await form.getByLabel('Justificativa').fill('O mecanismo explica a luz.')
    await form.getByLabel('Evidência da decisão').selectOption({ label: 'Contradiz · O mecanismo funciona sozinho' })
    await save.click()
    await expect(page.getByText('Relato de NPC · Refutado', { exact: true })).toBeVisible()
    await expect(page.getByText('A luz apareceu à meia-noite', { exact: true })).toBeVisible()
    await page.getByRole('region', { name: 'Dados confirmados' }).getByRole('button', { name: 'Vigia', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Vigia', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à wiki' }).click()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Informações', exact: true }).click()
    await page.getByRole('button', { name: 'Uma luz sinaliza o barco', exact: true }).click()
    await page.getByRole('region', { name: 'Dados confirmados' }).getByRole('button', { name: 'Investigar a luz' }).click()
    await expect(page.getByRole('heading', { name: 'Investigar a luz' })).toBeVisible()
    await page.getByText('Histórico de estados', { exact: true }).click()
    await expect(page.getByRole('list', { name: 'Histórico de estados' }).getByText(/Aberta/)).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})
