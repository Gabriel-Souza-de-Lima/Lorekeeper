export const maxImportBytes = 512 * 1024

export function validImportName(filename: string) {
  return filename.isWellFormed() && filename.length <= 150 && /^[^./\\][^/\\]*\.(txt|md)$/i.test(filename) && !/\p{Cc}/u.test(filename)
}

export function validImportText(text: string) {
  return text.isWellFormed() && text.trim() !== '' && !/\p{Cc}/u.test(text.replace(/[\t\n\r]/g, ''))
}

export function readImportFile(filename: string, bytes: Uint8Array) {
  if (!validImportName(filename)) throw new Error('Selecione um arquivo TXT ou Markdown.')
  if (bytes.byteLength > maxImportBytes) throw new Error('O arquivo excede 512 KiB.')
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/\r\n?/g, '\n') }
  catch { throw new Error('O arquivo precisa estar codificado em UTF-8.') }
  if (!validImportText(text)) throw new Error('O arquivo precisa conter texto UTF-8 sem controles binários.')
  return text
}
