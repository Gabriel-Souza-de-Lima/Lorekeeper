import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P10-03: fechar a consulta devolve o foco a Consultar conhecimento', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = await request.post(origin + '/api/campaigns', { data: { name: 'Vale fictício' } })
    expect(campaign.status()).toBe(201)
    const root = origin + '/api/campaigns/' + (await campaign.json()).id
    const actor = randomUUID()
    expect((await request.post(root + '/wiki', { data: { id: actor, type: 'character', title: 'Marina', body: '' } })).status()).toBe(201)
    const item = root + '/information/' + randomUUID()
    const evidence = randomUUID()
    const put = (url: string, data: object) => request.put(url, { data, headers: { 'Idempotency-Key': randomUUID() } })
    expect((await put(item, { version: 0, statement: 'Uma luz surgiu no vale', nature: 'observation',
      evidence: [{ id: evidence, role: 'supports', source: { text: 'Registro fictício da luz' } }],
    })).status()).toBe(201)
    expect((await put(item + '/perspectives', { version: 0,
      discovery: { id: randomUUID(), characterId: actor, kind: 'evidence', evidenceId: evidence },
    })).status()).toBe(200)
    const paths = [item, item + '/perspectives', root + '/perspectives?characterId=' + actor]
    const snapshot = () => Promise.all(paths.map(async (path) => {
      const result = await request.get(path)
      expect(result.status()).toBe(200)
      return result.json()
    }))
    const before = await snapshot()
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Vale fictício', exact: true }).click()
    await page.getByRole('button', { name: 'Informações', exact: true }).click()
    const start = page.getByRole('button', { name: 'Consultar conhecimento' })
    await start.press('Enter')
    const query = page.getByRole('region', { name: 'Consulta de conhecimento' })
    const subject = query.getByLabel('Consultar por')
    await expect(subject.getByRole('option', { name: 'Marina', exact: true })).toHaveCount(1)
    await subject.press('ArrowDown')
    await expect(subject).toHaveValue(actor)
    await expect(query.getByRole('heading', { name: 'O que Marina sabe' })).toBeVisible()
    await expect(query.getByText(/Registro fictício da luz/)).toBeVisible()
    await query.getByRole('button', { name: 'Fechar consulta' }).press('Enter')
    await expect(query).toHaveCount(0)
    await expect(start).toBeFocused()
    expect(await snapshot()).toEqual(before)
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('P10-03/13/15: conhecimento por personagem em 320 px, com reenvio e filtro', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = (await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa' } })).json()).id
    const root = origin + '/api/campaigns/' + campaign
    const marine = randomUUID()
    await request.post(root + '/wiki', { data: { id: marine, type: 'character', title: 'Marina', body: '' } })
    const item = root + '/information/' + randomUUID()
    const hiddenEvidence = randomUUID()
    expect((await request.put(item, { headers: { 'Idempotency-Key': randomUUID() }, data: {
      version: 0, statement: 'O farol anuncia o barco', nature: 'rumor',
      evidence: [{ id: hiddenEvidence, role: 'contradicts', source: { text: 'Evidência só no registro global' } }],
    } })).ok()).toBe(true)
    await page.setViewportSize({ width: 320, height: 700 })
    const enter = async () => {
      await page.getByRole('button', { name: 'Costa', exact: true }).click()
      await page.getByRole('button', { name: 'Informações', exact: true }).click()
      await page.getByRole('button', { name: 'O farol anuncia o barco', exact: true }).click()
    }
    await page.goto(origin)
    await enter()
    const panel = page.getByRole('region', { name: 'Perspectivas' })
    await expect(panel.getByText('Ainda não definido', { exact: true })).toBeVisible({ timeout: 4000 })
    await panel.getByRole('button', { name: 'Registrar conhecimento do jogador' }).press('Enter')
    await panel.getByRole('button', { name: 'Salvar perspectiva' }).click()
    await expect(panel.getByText('Jogador registrado · personagens ainda não definidos')).toBeVisible()
    await panel.getByRole('button', { name: 'Declarar ausência de personagens' }).click()
    await panel.getByRole('button', { name: 'Salvar perspectiva' }).click()
    await expect(panel.getByText('Somente o jogador', { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Registrar descoberta' }).click()
    await panel.getByLabel('Personagem', { exact: true }).selectOption(marine)
    await panel.getByLabel('Origem ou observação').fill('Ouviu da vigia')
    await expect(panel.getByRole('status')).toHaveText('Rascunho protegido neste navegador')
    expect((await (await request.get(item + '/perspectives')).json()).version).toBe(2)
    await page.reload()
    await enter()
    await panel.getByRole('button', { name: 'Recuperar rascunho de perspectiva' }).click()
    await expect(panel.getByLabel('Origem ou observação')).toHaveValue('Ouviu da vigia')
    await page.route(item + '/perspectives', async (route) => {
      expect((await route.fetch()).ok()).toBe(true)
      await route.abort()
    }, { times: 1 })
    await panel.getByRole('button', { name: 'Salvar perspectiva' }).click()
    await expect(panel.getByRole('alert')).toContainText('conexão')
    await panel.getByRole('button', { name: 'Reenviar perspectiva' }).click()
    await expect(panel.getByRole('status')).toHaveText('Salvo no servidor')
    expect((await (await request.get(item + '/perspectives')).json()).version).toBe(3)
    await page.getByRole('button', { name: 'Consultar conhecimento', exact: true }).click()
    const knowledge = page.getByRole('region', { name: 'Consulta de conhecimento' })
    await knowledge.getByLabel('Consultar por').selectOption(marine)
    await expect(knowledge.getByRole('heading', { name: 'O que Marina sabe' })).toBeVisible()
    await expect(knowledge.getByText('Ouviu da vigia')).toBeVisible()
    await expect(knowledge.getByText('Evidência só no registro global')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('P10-15: conflito preserva o rascunho e permite corrigir sem sobrescrever', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Ilhas' } })).json()
    const root = origin + '/api/campaigns/' + id
    const actor = randomUUID()
    await request.post(root + '/wiki', { data: { id: actor, type: 'character', title: 'Marina', body: '' } })
    const item = root + '/information/' + randomUUID()
    const put = (url: string, data: object) => request.put(url, { data, headers: { 'Idempotency-Key': randomUUID() } })
    expect((await put(item, { version: 0, statement: 'Boa maré', nature: 'observation' })).ok()).toBe(true)
    const url = item + '/perspectives'
    expect((await put(url, { version: 0, discovery: { id: randomUUID(), characterId: actor, kind: 'heard', note: 'Nota original' } })).ok()).toBe(true)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Ilhas', exact: true }).click()
    await page.getByRole('button', { name: 'Informações', exact: true }).click()
    await page.getByRole('button', { name: 'Boa maré' }).click()
    const panel = page.getByRole('region', { name: 'Perspectivas' })
    await panel.getByRole('button', { name: 'Corrigir descoberta' }).click()
    await panel.getByLabel('Origem ou observação').fill('Nota corrigida')
    expect((await put(url, { version: 1, discovery: { id: randomUUID(), kind: 'heard', note: 'Mudança remota' } })).ok()).toBe(true)
    const save = panel.getByRole('button', { name: 'Salvar perspectiva' })
    await save.click()
    await expect(panel.getByText('Mudança remota')).toBeVisible()
    await expect(panel.getByLabel('Origem ou observação')).toHaveValue('Nota corrigida')
    await panel.getByRole('button', { name: 'Usar perspectiva atual como base' }).click()
    await save.click()
    await expect(panel.getByText('Nota corrigida')).toBeVisible()
    await expect(panel.getByText('Nota original')).toBeVisible()
    await expect(panel.getByText('Marina · Substituída')).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('P10-15: falha do IndexedDB mantém o formulário e oferece cópia', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Vale' } })).json()
    const item = origin + '/api/campaigns/' + id + '/information/' + randomUUID()
    expect((await request.put(item, { headers: { 'Idempotency-Key': randomUUID() },
      data: { version: 0, statement: 'Marca fictícia', nature: 'rumor' } })).ok()).toBe(true)
    await page.addInitScript(() => {
      const open = IDBFactory.prototype.open
      IDBFactory.prototype.open = function (name: string, version?: number) {
        if (name === 'lorekeeper-perspectives') throw new Error('Falha fictícia')
        return open.call(this, name, version)
      }
    })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Vale', exact: true }).click()
    await page.getByRole('button', { name: 'Informações' }).click()
    await page.getByRole('button', { name: 'Marca fictícia' }).click()
    const panel = page.getByRole('region', { name: 'Perspectivas' })
    await panel.getByRole('button', { name: 'Registrar conhecimento do jogador' }).click()
    await panel.getByLabel('Origem ou observação').fill('Anotação preservada')
    await expect(panel.getByRole('status')).toHaveText('Falha no armazenamento local')
    await panel.getByRole('button', { name: 'Salvar perspectiva' }).click()
    await expect(panel.getByLabel('Origem ou observação')).toHaveValue('Anotação preservada')
    expect((await (await request.get(item + '/perspectives')).json()).version).toBe(0)
    const download = page.waitForEvent('download')
    await panel.getByRole('button', { name: 'Baixar rascunho de perspectiva' }).click()
    expect((await download).suggestedFilename()).toBe('rascunho-perspectiva.json')
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('UX63-03: resposta atrasada não troca a perspectiva ativa nem cruza campanhas homônimas', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  const releases: (() => void)[] = []
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    async function setup(name: string, people: string[]) {
      const campaign = await request.post(origin + '/api/campaigns', { data: { name } })
      expect(campaign.status()).toBe(201)
      const root = origin + '/api/campaigns/' + (await campaign.json()).id
      const actors = []
      for (const title of people) {
        const id = randomUUID()
        expect((await request.post(root + '/wiki', { data: { id, type: 'character', title, body: '' } })).status()).toBe(201)
        const item = root + '/information/' + randomUUID()
        const put = (url: string, data: object) => request.put(url, { data, headers: { 'Idempotency-Key': randomUUID() } })
        expect((await put(item, { version: 0, statement: `${title} em ${name}`, nature: 'observation' })).status()).toBe(201)
        expect((await put(item + '/perspectives', { version: 0, discovery: { id: randomUUID(), characterId: id, kind: 'heard' } })).status()).toBe(200)
        actors.push(id)
      }
      return { root, actors }
    }

    const first = await setup('Costa fictícia', ['Marina', 'Lia'])
    const second = await setup('Serra fictícia', ['Marina'])
    const delayedUrl = first.root + '/perspectives?characterId=' + first.actors[0]
    async function delayMarina() {
      const received = Promise.withResolvers<void>()
      const gate = Promise.withResolvers<void>()
      releases.push(gate.resolve)
      await page.route(delayedUrl, async (route) => {
        const response = await route.fetch()
        received.resolve()
        await gate.promise
        await route.fulfill({ response })
      }, { times: 1 })
      return { received: received.promise, release: gate.resolve }
    }
    const query = page.getByRole('region', { name: 'Consulta de conhecimento' })
    const subject = query.getByLabel('Consultar por')
    async function enter(name: string) {
      await page.getByRole('button', { name, exact: true }).click()
      await page.getByRole('button', { name: 'Informações', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Registro global' })).toBeVisible()
      await page.getByRole('button', { name: 'Consultar conhecimento' }).click()
    }

    await page.goto(origin)
    await enter('Costa fictícia')
    const initial = await delayMarina()
    await subject.selectOption(first.actors[0])
    await initial.received
    await expect(query.getByRole('status')).toHaveText('Carregando perspectiva…')
    await subject.selectOption(first.actors[1])
    await expect(query.getByRole('heading', { name: 'Lia em Costa fictícia' })).toBeVisible()
    const response = page.waitForResponse(delayedUrl)
    initial.release()
    await (await response).finished()
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(query.getByRole('heading', { name: 'O que Lia sabe' })).toBeVisible()
    await expect(query.getByRole('heading', { name: 'Marina em Costa fictícia' })).toHaveCount(0)

    const previousCampaign = await delayMarina()
    await subject.selectOption(first.actors[0])
    await previousCampaign.received
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('button', { name: 'Voltar ao painel' }).click()
    await enter('Serra fictícia')
    await subject.selectOption(second.actors[0])
    await expect(query.getByRole('heading', { name: 'Marina em Serra fictícia' })).toBeVisible()
    const late = page.waitForResponse(delayedUrl)
    previousCampaign.release()
    await (await late).finished()
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(query.getByRole('heading', { name: 'Marina em Costa fictícia' })).toHaveCount(0)
    await expect(query.getByRole('heading', { name: 'Marina em Serra fictícia' })).toBeVisible()
  } finally {
    releases.forEach((release) => release())
    await finishE2EServer(app, [page.context()], request)
  }
})
