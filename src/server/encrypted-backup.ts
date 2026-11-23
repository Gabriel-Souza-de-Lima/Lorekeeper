import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { appendFile, link, mkdtemp, open, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { copyDatabase } from './backup.ts'

const magic = Buffer.from('LKBACK01')
const headerSize = magic.length + 12
const tagSize = 16

async function readKey(path: string) {
  const key = await readFile(path)
  if (key.length !== 32) throw new Error('O arquivo de chave deve conter 32 bytes binários.')
  return key
}

export async function encryptBackup(source: string, destination: string, keyFile: string) {
  const target = resolve(destination)
  const key = await readKey(keyFile)
  const local = await mkdtemp(join(tmpdir(), 'lorekeeper-copia-'))
  try {
    const snapshot = join(local, 'verified.sqlite')
    await copyDatabase(source, snapshot)
    const external = await mkdtemp(join(dirname(target), '.lorekeeper-criptografado-'))
    try {
      const staged = join(external, 'copy.lkb')
      const nonce = randomBytes(12)
      const header = Buffer.concat([magic, nonce])
      const cipher = createCipheriv('aes-256-gcm', key, nonce)
      cipher.setAAD(header)
      await writeFile(staged, header, { flag: 'wx', mode: 0o600 })
      await pipeline(createReadStream(snapshot), cipher, createWriteStream(staged, { flags: 'a' }))
      await appendFile(staged, cipher.getAuthTag())
      const completed = await open(staged, 'r+')
      try { await completed.sync() } finally { await completed.close() }
      await link(staged, target)
    } finally {
      await rm(external, { recursive: true, force: true })
    }
  } finally {
    await rm(local, { recursive: true, force: true })
  }
}

export async function restoreEncryptedBackup(source: string, destination: string, keyFile: string) {
  const key = await readKey(keyFile)
  const local = await mkdtemp(join(tmpdir(), 'lorekeeper-restauracao-'))
  try {
    const snapshot = join(local, 'verified.sqlite')
    const input = await open(source, 'r')
    try {
      const { size } = await input.stat()
      if (size <= headerSize + tagSize) throw new Error('Arquivo de backup incompleto.')
      const header = Buffer.alloc(headerSize)
      const tag = Buffer.alloc(tagSize)
      const tagOffset = size - tagSize
      if ((await input.read(header, 0, header.length, 0)).bytesRead !== header.length ||
          !header.subarray(0, magic.length).equals(magic) ||
          (await input.read(tag, 0, tag.length, tagOffset)).bytesRead !== tag.length) {
        throw new Error('Formato de backup inválido.')
      }
      const decipher = createDecipheriv('aes-256-gcm', key, header.subarray(magic.length), { authTagLength: tagSize })
      decipher.setAAD(header)
      decipher.setAuthTag(tag)
      await pipeline(
        input.createReadStream({ start: headerSize, end: tagOffset - 1, autoClose: false }),
        decipher,
        createWriteStream(snapshot, { flags: 'wx', mode: 0o600 }),
      )
    } finally {
      await input.close()
    }
    await copyDatabase(snapshot, destination)
  } finally {
    await rm(local, { recursive: true, force: true })
  }
}
