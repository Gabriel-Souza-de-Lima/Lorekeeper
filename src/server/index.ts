import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createApp } from './app.ts'

const database = resolve(process.env.LOREKEEPER_DB_PATH || 'data/lorekeeper.sqlite')
mkdirSync(dirname(database), { recursive: true })
const app = createApp(database, resolve('dist'))

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { void app.close() })
}

try {
  const address = await app.listen({ host: '127.0.0.1', port: Number(process.env.PORT ?? 3000) })
  console.log(`Lorekeeper disponível em ${address}`)
} catch (error) {
  console.error(error)
  await app.close()
  process.exitCode = 1
}
