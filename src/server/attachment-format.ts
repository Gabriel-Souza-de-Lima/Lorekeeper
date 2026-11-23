import { crc32 } from 'node:zlib'

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function isPng(bytes: Buffer) {
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(pngSignature)) return false
  if (bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') return false
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  if (width === 0 || height === 0 || width * height > 16_000_000) return false
  let hasImageData = false
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const size = bytes.readUInt32BE(offset)
    const end = offset + size + 12
    if (end > bytes.length) return false
    const kind = bytes.toString('latin1', offset + 4, offset + 8)
    if (!/^[A-Za-z]{4}$/.test(kind) ||
        crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) return false
    if (kind === 'IDAT' && size > 0) hasImageData = true
    if (kind === 'IEND') return hasImageData && size === 0 && end === bytes.length
    offset = end
  }
  return false
}

function isPdf(bytes: Buffer) {
  if (!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(bytes.toString('latin1', 0, 10))) return false
  const tail = bytes.subarray(-1024).toString('latin1')
  const start = /[\r\n]startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail)
  if (!start) return false
  const offset = Number(start[1])
  if (offset >= bytes.length) return false
  return /^(?:xref\b|\d+ \d+ obj\b)/.test(bytes.toString('latin1', offset, offset + 40))
}

export function attachmentMime(filename: string, bytes: Buffer) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.png') && isPng(bytes)) return 'image/png'
  if (lower.endsWith('.pdf') && isPdf(bytes)) return 'application/pdf'
  return null
}

export function validAttachmentName(name: string) {
  return name.length > 0 && name.length <= 150 &&
    !/[\/\\<>:"|?*\p{Cc}\p{Cf}]/u.test(name) &&
    !/^\.|[. ]$|^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) &&
    !/[\uD800-\uDFFF]/u.test(name)
}
