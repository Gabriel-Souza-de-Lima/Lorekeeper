type File = { filename: string; previous_filename?: string }
type Check = { name: string; status: string; conclusion: string; steps?: Check[] }
type Rule = { type: string; ruleset_id: number; parameters?: {
  strict_required_status_checks_policy?: boolean
  required_status_checks?: { context: string; integration_id: number }[]
  required_approving_review_count?: number
  require_code_owner_review?: boolean
  require_last_push_approval?: boolean
}}
type Ruleset = { id: number; enforcement: string; bypass_actors?: unknown[] }

export function ordinaryChange(branch: string, files: File[]) {
  return /^codex\/[a-z0-9][a-z0-9-]{0,70}$/.test(branch) && files.length > 0 &&
    files.flatMap(({ filename, previous_filename }) => previous_filename ? [filename, previous_filename] : [filename])
      .every((name) => /^(docs\/specs\/|src\/web\/|tests\/)/.test(name) &&
        !/(^|\/)AGENTS\.md$|auth|permission|secret|migration|deploy/i.test(name))
}

export function candidateApproved(
  pr: { number: number; head: string; candidate: string },
  run: { event: string; status: string; conclusion: string; head_sha: string },
  jobs: Check[],
) {
  const validar = jobs.filter((job) => job.name === 'validar')
  const steps = validar[0]?.steps?.filter((step) => step.name.startsWith(`PR ${pr.number} candidato `))
  return Boolean(pr.candidate && run.head_sha === pr.head && run.event === 'pull_request' &&
    run.status === 'completed' && run.conclusion === 'success' &&
    validar.length === 1 && validar[0].status === 'completed' && validar[0].conclusion === 'success' &&
    steps?.length === 1 && steps[0].name === `PR ${pr.number} candidato ${pr.candidate}` &&
    steps[0].status === 'completed' && steps[0].conclusion === 'success')
}

export function strictRules(rules: Rule[], rulesets: Ruleset[]) {
  const pull = rules.filter((rule) => rule.type === 'pull_request')
  const checks = rules.filter((rule) => rule.type === 'required_status_checks')
  const verified = (id: number) => rulesets.some((ruleset) => ruleset.id === id &&
    ruleset.enforcement === 'active' && Array.isArray(ruleset.bypass_actors) && !ruleset.bypass_actors.length)

  return pull.length > 0 && checks.length > 0 &&
    rules.every((rule) => verified(rule.ruleset_id)) &&
    pull.every(({ parameters }) => parameters?.required_approving_review_count === 0 &&
      !parameters.require_code_owner_review && !parameters.require_last_push_approval) &&
    checks.every(({ parameters }) => parameters?.strict_required_status_checks_policy === true &&
      parameters.required_status_checks?.length === 1 &&
      parameters.required_status_checks[0].context === 'validar' &&
      parameters.required_status_checks[0].integration_id === 15368)
}
