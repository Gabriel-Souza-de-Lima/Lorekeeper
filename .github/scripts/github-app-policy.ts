type File = { filename: string; previous_filename?: string }
type Rule = { type: string; parameters?: {
  strict_required_status_checks_policy?: boolean
  required_status_checks?: { context: string; integration_id: number }[]
}}
type Run = { event: string; head_sha: string; status: string; conclusion: string | null }

export function ordinaryChange(branch: string, files: File[]) {
  return /^codex\/[a-z0-9][a-z0-9-]{0,70}$/.test(branch) && files.length > 0 &&
    files.flatMap(({ filename, previous_filename }) => previous_filename ? [filename, previous_filename] : [filename])
      .every((name) => /^(docs\/specs\/|src\/web\/|tests\/)/.test(name) &&
        !/(^|\/)AGENTS\.md$|auth|permission|secret|migration|deploy/i.test(name))
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
