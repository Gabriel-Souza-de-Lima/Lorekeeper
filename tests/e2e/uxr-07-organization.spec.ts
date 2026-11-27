import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createE2EServer, finishE2EServer } from '../support/e2e-server.ts'
import manifest from '../../package.json' with { type: 'json' }

test('UX70-02/06/09: ordena os destinos e protege o acesso à página Sobre', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    await request.post(origin + '/api/campaigns', { data: { name: 'Costa fictícia' } })
    await page.goto(origin)
    const sidebar = page.locator('.sidebar')
    const acervo = sidebar.getByRole('navigation', { name: 'Acervo' })
    const toggle = sidebar.getByRole('button', { name: 'Navegação', exact: true })
    const about = sidebar.getByRole('button', { name: 'Sobre', exact: true })
    const expected = ['Busca', 'Campanhas', 'Anotações rápidas', 'Favoritos']
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 800 })
      const expanded = width > 700
      await expect(toggle).toHaveAttribute('aria-expanded', String(expanded))
      if (!expanded) await toggle.click()
      await expect(acervo.getByRole('button')).toHaveCount(expected.length)
      for (const [index, name] of expected.entries()) {
        await expect(acervo.getByRole('button').nth(index)).toHaveAccessibleName(name)
      }
      await expect(sidebar.getByRole('button').last()).toHaveAccessibleName('Sobre')
      if (expanded) {
        await toggle.click()
        for (const [index, name] of expected.entries()) {
          await expect(acervo.getByRole('button').nth(index)).toHaveAccessibleName(name)
        }
        await expect(about).toBeVisible()
        await toggle.click()
      } else await toggle.click()
    }
    await page.getByRole('button', { name: 'Costa fictícia', exact: true }).click()
    await expect(sidebar.getByRole('button', { name: 'Sessões', exact: true })).toHaveCount(1)
    await expect(sidebar.getByRole('button', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('button', { name: 'Nova sessão', exact: true }).click()
    await page.getByLabel('Anotações', { exact: true }).fill('Memória fictícia')
    await about.click()
    await page.getByRole('dialog', { name: 'Alterações pendentes' }).getByRole('button', { name: 'Cancelar' }).click()
    await expect(about).toBeFocused()
    await expect(page.getByLabel('Anotações', { exact: true })).toHaveValue('Memória fictícia')
    await about.click()
    await page.getByRole('button', { name: 'Salvar e continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Sobre', exact: true })).toBeFocused()
    await expect(page.getByText('Versão ' + manifest.version, { exact: true })).toBeVisible()
    await expect(page.getByText('Arquivo Narrativo Vivo', { exact: true })).toBeVisible()
    await expect(about).toHaveAttribute('aria-current', 'page')
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('UX70-07/08: mede os campos e as ações de estado nas larguras suportadas', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa fictícia' } })).json()
    const root = origin + '/api/campaigns/' + id
    const long = 'Referência fictícia '.repeat(12)
    expect((await request.post(root + '/wiki', { data: { id: crypto.randomUUID(), type: 'npc', title: long, body: '' } })).ok()).toBe(true)
    await page.goto(origin)
    await page.getByRole('button', { name: 'Costa fictícia', exact: true }).click()
    await page.getByRole('button', { name: 'Pendências', exact: true }).click()
    await page.getByRole('button', { name: 'Nova pendência' }).click()
    const form = page.getByRole('form', { name: 'Nova pendência' })
    const field = (name: string) => form.getByLabel(name, { exact: name !== 'Tipo' && name !== 'Sessão de origem' && name !== 'NPCs e localidades' })
    await field('Título').fill('Pista fictícia')
    await field('Descrição').fill(long)
    await field('Origem').fill('Relato da vigia')
    await field('Observações').fill(long)
    await field('NPCs e localidades').selectOption({ index: 0 })
    const measure = async (name: string) => (await field(name).boundingBox())!
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 800 })
      const [title, type, description, source, notes, session, entities] = await Promise.all(
        ['Título', 'Tipo', 'Descrição', 'Origem', 'Observações', 'Sessão de origem', 'NPCs e localidades'].map(measure))
      expect(notes.y).toBeGreaterThan(source.y)
      expect(session.y).toBeGreaterThan(notes.y)
      if (width > 700) {
        for (const [left, right] of [[title, type], [description, source]]) {
          expect(Math.abs(left.y - right.y)).toBeLessThan(1)
          expect(Math.abs(left.width - right.width)).toBeLessThan(1)
          expect(Math.abs(left.height - right.height)).toBeLessThan(1)
        }
        expect(notes.width).toBeCloseTo(type.x + type.width - title.x, 0)
      } else {
        for (const [previous, next] of [[title, type], [type, description], [description, source], [session, entities]]) {
          expect(next.y).toBeGreaterThan(previous.y)
          expect(Math.abs(previous.x - next.x)).toBeLessThan(1)
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    }
    await page.route(root + '/pending-items', async (route) => {
      if (route.request().method() === 'POST') return route.fulfill({ status: 400, json: { message: long.trim() } })
      return route.continue()
    }, { times: 1 })
    await form.getByRole('button', { name: 'Criar pendência' }).click()
    await expect(page.getByRole('alert')).toHaveText(long.trim())
    await expect(field('Descrição')).toHaveValue(long)
    await form.getByRole('button', { name: 'Criar pendência' }).click()
    const detail = page.getByRole('region', { name: 'Detalhe da pendência' })
    const state = detail.getByLabel('Alterar estado')
    const save = detail.getByRole('button', { name: 'Salvar estado' })
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 800 })
      const { heightDifference, bottomDifference } = await detail.getByRole('group', { name: 'Atualizar estado' }).evaluate((group) => {
        const select = group.querySelector('select')!.getBoundingClientRect()
        const button = group.querySelector('button')!.getBoundingClientRect()
        return { heightDifference: Math.abs(select.height - button.height), bottomDifference: Math.abs(select.bottom - button.bottom) }
      })
      expect(heightDifference).toBeLessThan(1)
      expect(bottomDifference).toBeLessThan(1)
    }
    await state.selectOption('resolved')
    await save.click()
    await detail.getByText('Histórico de estados', { exact: true }).click()
    await expect(detail.getByRole('list', { name: 'Histórico de estados' }).getByRole('listitem')).toHaveCount(2)
    await detail.getByRole('button', { name: 'Editar pendência' }).click()
    const edit = page.getByRole('form', { name: 'Editar pendência' })
    await expect(edit.getByLabel('Observações')).toHaveValue(long)
    expect((await edit.getByLabel('Observações').boundingBox())!.width)
      .toBeGreaterThan((await edit.getByLabel('Descrição').boundingBox())!.width)
  } finally { await finishE2EServer(app, [page.context()], request) }
})

test('UX70-07: alinha controles de tags e renomeação de anexos em desktop', async ({ page, request }) => {
  const app = createE2EServer(':memory:', resolve('dist'))
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const { id } = await (await request.post(origin + '/api/campaigns', { data: { name: 'Costa fictícia' } })).json()
    const root = origin + '/api/campaigns/' + id
    const wiki = crypto.randomUUID()
    expect((await request.post(root + '/wiki', { data: { id: wiki, type: 'npc', title: 'Vigia fictícia', body: '' } })).ok()).toBe(true)
    expect((await request.post(root + '/attachments?documentId=' + wiki, { data: {
      id: crypto.randomUUID(), filename: 'registro.pdf',
      data: Buffer.from('%PDF-1.4\nxref\nstartxref\n9\n%%EOF\n').toString('base64'),
    } })).ok()).toBe(true)
    await page.goto(origin)
    const button = (name: string) => page.getByRole('button', { name, exact: true })
    await button('Costa fictícia').click()
    await button('Wiki da campanha').click()
    await button('Vigia fictícia').click()
    await button('Renomear registro.pdf').click()
    for (const [label, action] of [['Nome da tag', 'Adicionar tag'], ['Nome de exibição', 'Salvar nome']]) {
      const [field, control] = await Promise.all([
        page.getByLabel(label, { exact: true }).boundingBox(), button(action).boundingBox(),
      ])
      expect(Math.abs(field!.y + field!.height - control!.y - control!.height)).toBeLessThan(1)
    }
  } finally { await finishE2EServer(app, [page.context()], request) }
})
