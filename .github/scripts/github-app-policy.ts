type File = { filename: string; previous_filename?: string; patch?: string; additions: number }
type Rule = { type: string; parameters?: {
  strict_required_status_checks_policy?: boolean
  required_status_checks?: { context: string; integration_id: number }[]
}}
type Run = { event: string; head_sha: string; status: string; conclusion: string | null }

export function authorizedBranch(branch: string) {
  return /^(codex|feat|fix|chore|docs)\/[a-z0-9][a-z0-9-]{0,70}$/.test(branch)
}

export function authorizedAuthor(author: string, owner: string, bot: string, allowed: string[]) {
  return Boolean(author) && [owner, bot, ...allowed].some((login) => login.toLowerCase() === author.toLowerCase())
}

const trustRoot = /^(?:\.github\/(?:workflows|scripts|actions)\/|package(?:-lock)?\.json$|\.npmrc$|\.nvmrc$|playwright\.config\.|eslint\.config\.|tsconfig(?:\..*)?\.json$)/
const credentialPath = /(^|\/)(?:\.env(?!\.example$)|id_(?:rsa|ed25519)$)|\.(?:pem|p12|pfx|key)$/i
const credential = /-----BEGIN (?:[A-Z ]*PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----|\b(?:gh[pousr]_[a-z0-9]{25,}|github_pat_[a-z0-9_]{25,}|AKIA[A-Z0-9]{16}|sk-(?:proj-)?[a-z0-9_-]{20,}|xox[baprs]-[a-z0-9-]{15,})\b|\b[\w.-]*(?:pass(?:word|wd)?|secret|token|api[_-]?key)[\w.-]*["']?\s*[:=]\s*["'][^"'\s]{12,}["']/i
const migration = /(?:^src\/server\/database\.ts$|(?:^|\/)migrations?\/|\.sql$)/i
const destructive = /\b(?:DROP\s+(?:TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM|REPLACE\s+INTO|PRAGMA\s+foreign_keys\s*=\s*(?:OFF|0))\b/i

function addedLines(file: File) {
  if (typeof file.patch !== 'string' || !Number.isSafeInteger(file.additions)) return null
  const lines = file.patch.split('\n').filter((line) => line.startsWith('+')).map((line) => line.slice(1))
  return lines.length === file.additions ? lines.join('\n') : null
}

export function ordinaryChange(branch: string, files: File[]) {
  if (!authorizedBranch(branch) || !files.length) return false
  let changesMigration = false
  const migrationTests = []
  for (const file of files) {
    const paths = [file.filename, file.previous_filename].filter((name): name is string => Boolean(name))
    const added = addedLines(file)
    if (!file.filename || added === null || paths.some((name) => trustRoot.test(name) || credentialPath.test(name)) ||
        credential.test(added)) return false
    if (file.filename.startsWith('tests/integration/')) migrationTests.push(added)
    if (paths.some((name) => name.startsWith('src/server/')) && destructive.test(added)) return false
    if (paths.some((name) => !name.startsWith('tests/') && migration.test(name))) {
      changesMigration = true
      // Also inspect removed SQL tokens and surrounding context for schema-replacement edits.
      if (destructive.test(file.patch ?? '')) return false
    }
  }
  const evidence = migrationTests.join('\n')
  return !changesMigration || ['integrity', 'preservation', 'rollback'].every((name) =>
    new RegExp(`^\\s*test\\(\\s*['"]migration-${name}\\b`, 'm').test(evidence))
}

export function waitingForCI(run: Run | undefined, head: string) {
  return run === undefined || (run.event === 'pull_request' && run.head_sha === head &&
    run.conclusion === null && ['queued', 'in_progress', 'requested', 'waiting', 'pending'].includes(run.status))
}

export function strictRules(rules: Rule[]) {
  return rules.some(({ type }) => type === 'pull_request') &&
    rules.some(({ type, parameters }) => type === 'required_status_checks' &&
      parameters?.strict_required_status_checks_policy === true &&
      parameters.required_status_checks?.some(({ context, integration_id }) =>
        context === 'validar' && integration_id === 15368))
}

type Check = { name: string; status: string; conclusion: string | null; steps?: Check[] }

export function candidateApproved(pr: { number: number; candidate: string; head: string }, run: Run, jobs: Check[]) {
  if (run.event !== 'pull_request' || run.head_sha !== pr.head ||
      run.status !== 'completed' || run.conclusion !== 'success') return false
  const validate = jobs.filter((job) => job.name === 'validar')
  if (validate.length !== 1 || validate[0].status !== 'completed' || validate[0].conclusion !== 'success') return false
  const proof = validate[0].steps?.filter((step) => step.name.startsWith(`PR ${pr.number} candidato `))
  return Boolean(proof?.length === 1 && proof[0].name === `PR ${pr.number} candidato ${pr.candidate}` &&
    proof[0].status === 'completed' && proof[0].conclusion === 'success')
}
