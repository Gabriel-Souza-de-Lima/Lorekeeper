import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'

test('P2-01/05/06: abre a pendência pela retomada e preserva o histórico ao resolver', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    expect((await request.post(origin + '/api/campaigns', { data: { name: 'A travessia' } })).status()).toBe(201)
    await page.goto(origin)
    await page.getByRole('button', { name: 'A travessia', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Ver pendências' })).toBeVisible({ timeout: 4000 })
    await page.getByRole('button', { name: 'Ver pendências' }).click()
    await page.getByRole('button', { name: 'Nova pendência' }).click()
    await page.getByLabel('Título').fill('Quem acendeu o farol?')
    await page.getByLabel('Tipo').selectOption('clue')
    await page.getByLabel('Descrição').fill('A luz apareceu de madrugada.')
    await page.getByRole('button', { name: 'Criar pendência' }).click()
    await expect(page.getByRole('heading', { name: 'Quem acendeu o farol?' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await page.getByRole('region', { name: 'Pendências abertas' }).getByRole('button', { name: 'Quem acendeu o farol?' }).click()
    await expect(page.getByText('A luz apareceu de madrugada.')).toBeVisible()
    await page.getByLabel('Alterar estado').selectOption('resolved')
    await page.getByRole('button', { name: 'Salvar estado' }).click()
    await page.getByText('Histórico de estados', { exact: true }).click()
    await expect(page.getByRole('list', { name: 'Histórico de estados' }).getByText(/Concluída/)).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await expect(page.getByText('Nenhuma pendência aberta.')).toBeVisible()
    await page.getByRole('button', { name: 'Ver pendências' }).click()
    await page.getByRole('button', { name: 'Fechadas 1' }).click()
    await expect(page.getByRole('button', { name: 'Quem acendeu o farol?' })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('P6-01/02/03/06/07: mantém a edição no conflito, confirma de novo e atualiza a retomada', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const campaign = (await (await request.post(origin + '/api/campaigns', { data: { name: 'Bruma' } })).json()).id
    const path = origin + '/api/campaigns/' + campaign + '/pending-items'
    const id = crypto.randomUUID()
    await request.post(path, { data: { id, title: 'Luz ao longe' } })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Bruma', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Pendências abertas' })
    await panel.getByRole('button', { name: 'Luz ao longe' }).click()
    const edit = page.getByRole('button', { name: 'Editar pendência' })
    await expect(edit).toBeVisible({ timeout: 4000 })
    await edit.click()
    const form = page.getByRole('form', { name: 'Editar pendência' })
    await form.getByLabel('Título').fill('Título cancelado')
    await form.getByRole('button', { name: 'Cancelar edição' }).click()
    await page.getByRole('button', { name: 'Descartar e continuar' }).click()
    expect((await (await request.get(path + '/' + id)).json()).title).toBe('Luz ao longe')
    await edit.click()
    await form.getByLabel('Título').fill('A luz do farol')
    await form.getByLabel('Descrição').fill('Anotação local')
    const current = (await (await request.get(path + '/' + id)).json())
    expect(current.title).toBe('Luz ao longe')
    const { editVersion, title, type, description, origin: source, sessionId, entityIds } = current
    expect((await request.put(path + '/' + id, { data: { editVersion, title, type, description,
      origin: source, notes: 'Nota remota', sessionId, entityIds } })).status()).toBe(200)
    const save = form.getByRole('button', { name: 'Salvar alterações' })
    await save.click()
    await expect(form.getByLabel('Descrição')).toHaveValue('Anotação local')
    await expect(page.getByText('Observações: Nota remota')).toBeVisible()
    await form.getByRole('button', { name: 'Usar versão atual como base' }).click()
    await form.getByLabel('Observações').fill('Nota remota')
    await save.click()
    await expect(page.getByRole('heading', { name: 'A luz do farol' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à campanha' }).click()
    await expect(panel.getByRole('button', { name: 'A luz do farol' })).toBeVisible()
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('PHV2-06: repete o mesmo cadastro após perda da resposta sem duplicar', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa fictícia' } })).json()
    const path = origin + '/api/campaigns/' + id + '/pending-items'
    const attempts: unknown[] = []
    await page.route(path, async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      attempts.push(route.request().postDataJSON())
      if (attempts.length > 1) return route.continue()
      expect((await route.fetch()).status()).toBe(201)
      await route.abort()
    })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Costa fictícia', exact: true }).click()
    await page.locator('.sidebar').getByRole('button', { name: 'Pendências', exact: true }).click()
    await page.getByRole('button', { name: 'Nova pendência' }).click()
    const title = page.getByLabel('Título', { exact: true })
    await title.fill('Pista fictícia')
    await page.getByRole('button', { name: 'Criar pendência' }).click()
    const retry = page.getByRole('button', { name: 'Confirmar operação pendente', exact: true })
    await expect(retry).toBeVisible()
    await expect(title).toHaveValue('Pista fictícia')
    await expect(title).toBeDisabled()
    await retry.click()
    await expect(page.getByRole('heading', { name: 'Pista fictícia', exact: true })).toBeVisible()
    expect(attempts).toHaveLength(2)
    expect(attempts[0]).toEqual(attempts[1])
    expect(await (await request.get(path)).json()).toHaveLength(1)
  } finally { await finishE2EServer(app, [page.context()], request) }
})
