import assert from 'node:assert/strict'
import { Agent, get } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { test } from 'node:test'
import { createApp } from '../../src/server/app.ts'
import { closeTestServer } from '../support/close-test-server.ts'

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
