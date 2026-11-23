import type { FastifyInstance } from 'fastify'

export async function closeTestServer(app: FastifyInstance) {
  // Node closes sockets already idle when server.close() starts. An active
  // response may leave its socket idle later, so reap idle sockets while closing.
  const reapIdle = setInterval(() => app.server.closeIdleConnections(), 25).unref()
  try {
    await app.close()
  } finally {
    clearInterval(reapIdle)
  }
}
