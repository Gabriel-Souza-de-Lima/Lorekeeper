import { test, type APIRequestContext, type BrowserContext } from '@playwright/test'
import { createApp } from '../../src/server/app.ts'
import { closeTestServer, monitorTestResponses } from './close-test-server.ts'

type App = ReturnType<typeof createApp>
const drains = new WeakMap<App, ReturnType<typeof monitorTestResponses>>()

export function createE2EServer(...args: Parameters<typeof createApp>) {
  const app = createApp(...args)
  drains.set(app, monitorTestResponses(app))
  return app
}

export async function finishE2EServer(app: App, contexts: BrowserContext[], request?: APIRequestContext) {
  try {
    await test.step('Concluir respostas HTTP iniciadas no servidor', async () => {
      await drains.get(app)?.()
    }, { timeout: 5000 })
    await test.step('Fechar os clientes HTTP do teste', async () => {
      await Promise.all([...contexts.map((context) => context.close()), request?.dispose()])
    }, { timeout: 5000 })
  } finally {
    await test.step('Fechar o servidor Fastify do teste', () => closeTestServer(app), { timeout: 5000 })
  }
}
