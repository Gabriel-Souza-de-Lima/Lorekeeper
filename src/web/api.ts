export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    ...(body === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  }).catch(() => { throw new Error('Verifique a conexão com o servidor.') })
  if (!response.ok) {
    if (response.status >= 500) throw new Error('O servidor não conseguiu concluir a operação.')
    const result = await response.json()
    throw new Error(result.message || 'A operação não pôde ser concluída.')
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
