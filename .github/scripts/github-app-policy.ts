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

export const admissionCheck = 'integracao-lorekeeper'

export function protectionIssues(rules: Rule[], rulesets: Ruleset[], appId: number) {
  const pull = rules.filter((rule) => rule.type === 'pull_request')
  const checks = rules.filter((rule) => rule.type === 'required_status_checks')
  const issues: string[] = []
  for (const id of new Set(rules.map((rule) => rule.ruleset_id))) {
    const ruleset = rulesets.find((value) => value.id === id)
    if (ruleset?.enforcement !== 'active') issues.push(`ruleset-${id}-active-unconfirmed`)
    if (!Array.isArray(ruleset?.bypass_actors)) issues.push(`ruleset-${id}-bypass-hidden`)
    else if (ruleset.bypass_actors.length) issues.push(`ruleset-${id}-bypass-present`)
  }
  if (!pull.length || !pull.every(({ parameters }) => parameters?.required_approving_review_count === 0 &&
    !parameters.require_code_owner_review && !parameters.require_last_push_approval)) issues.push('pr-rules-unconfirmed')

  const required = new Map<string, Set<number>>()
  for (const { parameters } of checks) {
    for (const { context, integration_id } of parameters?.required_status_checks ?? []) {
      const origins = required.get(context) ?? new Set()
      origins.add(integration_id)
      required.set(context, origins)
    }
  }
  if (!checks.length || !checks.every(({ parameters }) => parameters?.strict_required_status_checks_policy === true)) {
    issues.push('strict-status-checks-unconfirmed')
  }
  if (required.get('validar')?.size !== 1 || !required.get('validar')?.has(15368)) issues.push('validar-origin-unconfirmed')
  if (!Number.isSafeInteger(appId) || appId <= 0 || required.get(admissionCheck)?.size !== 1 ||
      !required.get(admissionCheck)?.has(appId)) issues.push('admission-origin-unconfirmed')
  if (required.size > 2) issues.push('additional-required-checks')
  return issues
}

export function strictRules(rules: Rule[], rulesets: Ruleset[], appId: number) {
  return protectionIssues(rules, rulesets, appId).length === 0
}
