import { expect, test } from '@playwright/test'

test('o Chromium recupera do IndexedDB após recarregar a página', async ({ page, browser }) => {
  const origin = 'http://localhost/'
  await page.route(origin, (route) => route.fulfill({ contentType: 'text/html', body: '<title>Teste local</title>' }))
  await page.goto(origin)

  const readDraft = async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('lorekeeper-test', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('drafts')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<string | undefined>((resolve, reject) => {
        const request = db.transaction('drafts').objectStore('drafts').get('session')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } finally {
      db.close()
    }
  }

  expect(await page.evaluate(readDraft)).toBeUndefined()
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('lorekeeper-test', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('drafts', 'readwrite')
        transaction.oncomplete = () => resolve()
        transaction.onabort = () => reject(transaction.error)
        transaction.objectStore('drafts').put('Rascunho fictício', 'session')
      })
    } finally {
      db.close()
    }
  })

  await page.reload()
  expect(await page.evaluate(readDraft)).toBe('Rascunho fictício')

  const otherContext = await browser.newContext()
  try {
    const otherPage = await otherContext.newPage()
    await otherPage.route(origin, (route) => route.fulfill({ contentType: 'text/html', body: '<title>Teste local</title>' }))
    await otherPage.goto(origin)
    expect(await otherPage.evaluate(readDraft)).toBeUndefined()
  } finally {
    await otherContext.close()
  }
})
