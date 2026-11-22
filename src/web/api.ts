export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, method = 'GET', body?: unknown, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(path, {
    method,
    ...(body === undefined ? {} : {
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  }).catch(() => { throw new ApiError('Verifique a conexão com o servidor.', 0) })
  if (!response.ok) {
    if (response.status >= 500) throw new ApiError('O servidor não conseguiu concluir a operação.', response.status)
    const result = await response.json()
    throw new ApiError(result.message || 'A operação não pôde ser concluída.', response.status)
  }
  return response.json()
}

export function localDate() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function displayDate(date: string) {
  return date.split('-').reverse().join('/')
}
