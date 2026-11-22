import { candidateApproved, ordinaryChange, strictRules } from './github-app-policy.ts'

const repo = process.env.GITHUB_REPOSITORY
const prefix = `/repos/${repo}`
const appToken = process.env.APP_TOKEN
const reader = process.env.GITHUB_TOKEN

async function request(path, { token = reader, body } = {}) {
  const url = path === '/graphql' ? process.env.GITHUB_GRAPHQL_URL : `${process.env.GITHUB_API_URL}${prefix}${path}`
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET', redirect: 'error',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status} para ${path.split('?')[0]}`)
  return response.json()
}

async function protection() {
  const repository = await request('', { token: appToken })
  if (repository.default_branch !== 'main' || repository.allow_auto_merge !== true ||
      !repository.allow_merge_commit) return false
  const rules = await request('/rules/branches/main')
  const ids = [...new Set(rules.map((rule) => rule.ruleset_id))]
  if (ids.some((id) => !Number.isSafeInteger(id))) return false
  const rulesets = await Promise.all(ids.map((id) => request(`/rulesets/${id}`, { token: appToken })))
  return strictRules(rules, rulesets)
}

async function compare(base, head, branch) {
  const diff = await request(`/compare/${base}...${head}`)
  // A comparison at the API cap may be incomplete.
  return diff.status === 'ahead' && diff.merge_base_commit.sha === base &&
    diff.files?.length < 300 && ordinaryChange(branch, diff.files)
}

async function findOrPublish(branch, sha, base) {
  if (!await compare(base, sha, branch)) return null
  const owner = repo.split('/')[0]
  const query = new URLSearchParams({ state: 'all', head: `${owner}:${branch}`, base: 'main', per_page: '100' })
  const pulls = await request(`/pulls?${query}`)
  const opened = pulls.find((pr) => pr.state === 'open' && pr.head.repo?.full_name === repo)
  if (opened) return opened
  if (pulls.length) return null // A closed or merged branch is never recycled.
  const pr = await request('/pulls', { token: appToken, body: {
    title: `Lorekeeper · ${branch}`, head: branch, base: 'main',
    body: 'Publicação da GitHub App Lorekeeper PR Bot. O job validar precisa aprovar o candidato corrente.',
  } })
  console.log(`PR #${pr.number} publicado.`)
  return pr
}

async function askNativeMerge(pr, branch, sha, base) {
  const url = `/pulls/${pr.number}`
  const current = await request(url)
  if (current.state !== 'open' || current.draft !== false || current.auto_merge ||
      current.head.ref !== branch || current.head.sha !== sha || current.head.repo?.full_name !== repo ||
      current.base.ref !== 'main' || current.base.repo?.full_name !== repo ||
      current.mergeable !== true || !current.merge_commit_sha) return
  const candidate = current.merge_commit_sha
  const commit = await request(`/git/commits/${candidate}`)
  // Require the synthetic candidate built from the current base and head.
  if (commit.parents.length !== 2 || commit.parents[0].sha !== base || commit.parents[1].sha !== sha) return
  const query = new URLSearchParams({ event: 'pull_request', branch, head_sha: sha, per_page: '10' })
  const { workflow_runs: runs } = await request(`/actions/workflows/ci.yml/runs?${query}`)
  const run = runs[0]
  if (!run || run.head_sha !== sha || run.status !== 'completed' || run.conclusion !== 'success') return
  const { jobs, total_count } = await request(`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`)
  if (jobs.length !== total_count || !candidateApproved({ number: pr.number, head: sha, candidate }, run, jobs)) return

  const [latest, main] = await Promise.all([request(url), request('/git/ref/heads/main')])
  if (latest.state !== 'open' || latest.draft !== false || latest.auto_merge || latest.mergeable !== true ||
      latest.head.sha !== sha || latest.merge_commit_sha !== candidate || main.object.sha !== base ||
      !await protection()) return

  const result = await request('/graphql', { token: appToken, body: {
    query: 'mutation Enable($id: ID!) { enablePullRequestAutoMerge(input: {pullRequestId: $id, mergeMethod: MERGE}) { pullRequest { number autoMergeRequest { enabledAt } merged } } }',
    variables: { id: current.node_id },
  } })
  const confirmed = result.data?.enablePullRequestAutoMerge?.pullRequest
  if (result.errors?.length || (!confirmed?.autoMergeRequest && !confirmed?.merged)) {
    console.log(`PR #${pr.number}: solicitação de auto-merge não aceita pelo GitHub; PR mantido.`)
    return
  }
  console.log(`PR #${pr.number}: GitHub confirmou ${confirmed.merged ? 'merge' : 'solicitação de auto-merge'}.`)
}

async function reconcile() {
  if (!appToken || !reader || process.env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('A automação exige os tokens do GitHub e a branch padrão.')
  }
  // A native merge request is gated independently from PR publication.
  let verified = false
  try {
    verified = await protection()
  } catch (error) {
    console.error(error.message)
  }
  if (!verified) console.log('Proteção ou auto-merge sem confirmação; apenas publicação de PRs.')
  const main = await request('/git/ref/heads/main')
  if (main.object.sha !== process.env.GITHUB_SHA) {
    console.log('A main mudou depois do início do workflow. A próxima execução reconciliará as branches.')
    return
  }
  const refs = await request('/git/matching-refs/heads/codex/')
  let failures = 0
  for (const { ref, object } of refs) {
    const branch = ref.replace(/^refs\/heads\//, '')
    if (!/^codex\/[a-z0-9][a-z0-9-]{0,70}$/.test(branch)) continue
    try {
      const pr = await findOrPublish(branch, object.sha, main.object.sha)
      if (pr && verified) await askNativeMerge(pr, branch, object.sha, main.object.sha)
    } catch (error) {
      failures++
      console.error(error.message)
    }
  }
  if (failures) process.exitCode = 1
}

try {
  await reconcile()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
