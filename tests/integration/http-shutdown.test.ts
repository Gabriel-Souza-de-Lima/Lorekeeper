import assert from 'node:assert/strict'
import { request as playwrightRequest } from '@playwright/test'
import { Agent, get } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'
import { closeTestServer, monitorTestResponses } from '../support/close-test-server.ts'

test('I2-06: encerramento entrega a resposta ativa e encerra a conexão quando ficar ociosa', async () => {
  const app = createApp(':memory:')
  const agent = new Agent({ keepAlive: true })
  const release = Promise.withResolvers<void>()
  const arrived = Promise.withResolvers<void>()
  app.get('/test-drain', async () => {
    arrived.resolve()
    await release.promise
    return 'Resposta completa'
  })
  let shutdown: Promise<void> | undefined
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 })
    const response = new Promise<string>((resolve, reject) => {
      get(`${address}/test-drain`, { agent }, (message) => {
        let body = ''
        message.setEncoding('utf8')
        message.on('data', (part: string) => { body += part })
        message.on('end', () => resolve(body))
        message.on('error', reject)
      }).on('error', reject)
    })
    await Promise.race([arrived.promise, response])
    shutdown = closeTestServer(app)
    // Wait for Node to stop accepting connections before releasing the handler.
    for (let attempt = 0; app.server.listening && attempt < 50; attempt++) await delay(5)
    assert.equal(app.server.listening, false)
    release.resolve()
    assert.equal(await response, 'Resposta completa')
    const deadline = new AbortController()
    try {
      assert.equal(await Promise.race([
        shutdown.then(() => 'fechado'),
        delay(1000, 'conexão ociosa permaneceu aberta', { signal: deadline.signal }),
      ]), 'fechado')
    } finally {
      deadline.abort()
    }
  } finally {
    release.resolve()
    agent.destroy()
    await (shutdown ?? app.close())
  }
})

test('o encerramento espera a resposta antes de liberar o cliente Playwright persistente', async () => {
  const app = createApp(':memory:')
  const drain = monitorTestResponses(app)
  const client = await playwrightRequest.newContext()
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  app.get('/pending', async () => {
    started.resolve()
    await release.promise
    return 'concluída'
  })
  try {
    const origin = await app.listen({ host: '127.0.0.1', port: 0 })
    const response = client.get(`${origin}/pending`, { timeout: 5000 })
    // Keep the response observed even when a regression fails the earlier assertion.
    void response.catch(() => {})
    await Promise.race([started.promise, response])
    const drained = drain().then(() => 'drenado')
    assert.equal(await Promise.race([drained, delay(25, 'ativa')]), 'ativa')
    release.resolve()
    assert.equal(await (await response).text(), 'concluída')
    await drained
    const count = () => new Promise<number>((resolve, reject) => {
      app.server.getConnections((error, value) => error ? reject(error) : resolve(value))
    })
    assert.equal(await count(), 1, 'o agente do Playwright conserva o socket após a resposta')
    await client.dispose()
    for (let attempt = 0; await count() && attempt < 50; attempt++) await delay(5)
    assert.equal(await count(), 0, 'descartar o cliente encerra o socket')
  } finally {
    release.resolve()
    await client.dispose()
    await closeTestServer(app)
  }
})
