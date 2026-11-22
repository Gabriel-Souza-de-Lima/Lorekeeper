const reference = /^#wiki-([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i

export function wikiReferenceId(url: string) {
  return reference.exec(url)?.[1].toLowerCase()
}

export function wikiMention(label: string, id: string) {
  const escaped = label.replace(/\s*\r?\n\s*/g, ' ').replace(/[\\\[\]_`*~<>!&]/g, '\\$&')
  return `[${escaped}](#wiki-${id})`
}
