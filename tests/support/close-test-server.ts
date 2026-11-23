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

export function monitorTestResponses(app: FastifyInstance) {
  const pending = new Set<Promise<void>>()
  app.server.prependListener('request', (_request, response) => {
    const completion = Promise.withResolvers<void>()
    pending.add(completion.promise)
    function finish() {
      response.off('finish', finish)
      response.off('close', finish)
      pending.delete(completion.promise)
      completion.resolve()
    }
    response.once('finish', finish)
    response.once('close', finish)
  })
  return async () => {
    while (pending.size) await Promise.all([...pending])
  }
}
