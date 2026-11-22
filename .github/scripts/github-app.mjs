import { readFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { authorizedAuthor, authorizedBranch, candidateApproved, ordinaryChange, strictRules, waitingForCI } from './github-app-policy.ts'

const repo = process.env.GITHUB_REPOSITORY
const prefix = `/repos/${repo}`
const appToken = process.env.APP_TOKEN
const reader = process.env.GITHUB_TOKEN
const botLogin = process.env.APP_SLUG && `${process.env.APP_SLUG}[bot]`
const owner = repo.split('/')[0]
const allowed = (process.env.AUTHORIZED_AUTHORS ?? '').split(',').map((item) => item.trim()).filter(Boolean)
const allowedAuthor = (login) => authorizedAuthor(login, owner, botLogin ?? '', allowed)
const signalPath = '.github/workflows/notify-codex-branch.yml'

async function request(path, { token = reader, body, method = body ? 'POST' : 'GET' } = {}) {
  const url = path === '/graphql' ? process.env.GITHUB_GRAPHQL_URL : `${process.env.GITHUB_API_URL}${prefix}${path}`
  const response = await fetch(url, {
    method, redirect: 'error',
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
  const rules = await request('/rules/branches/main')
  return Array.isArray(rules) && strictRules(rules)
}

async function currentDiff(base, head) {
  const diff = await request(`/compare/${base}...${head}`)
  return diff.status === 'ahead' && diff.merge_base_commit?.sha === base ? diff : null
}

async function findOrPublish(branch, sha, base) {
  const diff = await currentDiff(base, sha)
  // A comparison at the API cap may be incomplete.
  if (!(diff?.files?.length < 300) || !ordinaryChange(branch, diff.files)) return null
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

function graphqlReason(errors) {
  const raw = errors.map((error) => typeof error.message === 'string' ? error.message : '').join(' ')
  if (/clean status|can be merged immediately/i.test(raw)) return 'PR já integrável; a janela de espera pelo CI passou'
  if (/not authorized|forbidden|resource not accessible|permission/i.test(raw)) return 'a App não tem autorização para a solicitação nativa'
  if (/disabled|not enabled/i.test(raw)) return 'auto-merge desabilitado ou indisponível no GitHub'
  if (/conflict|dirty|not mergeable/i.test(raw)) return 'o GitHub detectou candidato não integrável'
  return 'o GitHub não confirmou a solicitação (erro GraphQL sem categoria conhecida)'
}

async function reconcilePull(pr, base) {
  const { sha, ref: branch } = pr.head
  const eligible = (value) => value.state === 'open' && value.draft === false &&
    authorizedBranch(branch) && allowedAuthor(value.user?.login) &&
    value.head.sha === sha && value.head.ref === branch && value.head.repo?.full_name === repo &&
    value.base.ref === 'main' && value.base.repo?.full_name === repo
  if (!eligible(pr)) return
  const diff = await currentDiff(base, sha)
  if (!(diff?.files?.length < 300) || !ordinaryChange(branch, diff.files)) {
    console.log(`PR #${pr.number}: diff sem evidência suficiente, fora da política ou base desatualizada.`)
    return
  }
  const url = `/pulls/${pr.number}`
  let current = await request(url)
  for (let attempt = 0; current.mergeable === null && current.state === 'open' && attempt < 4; attempt++) {
    await delay(750)
    current = await request(url)
  }
  if (!eligible(current) || current.mergeable !== true || !current.merge_commit_sha) {
    console.log(`PR #${pr.number}: estado ou candidato incompatível com a publicação.`)
    return
  }
  if (current.auto_merge) {
    console.log(`PR #${pr.number}: auto-merge já solicitado; autor ${current.auto_merge.enabled_by?.login === botLogin ? 'App' : 'outra identidade'}.`)
    return
  }
  const candidate = current.merge_commit_sha
  const commit = await request(`/git/commits/${candidate}`)
  if (commit.parents.length !== 2 || commit.parents[0].sha !== base || commit.parents[1].sha !== sha) return

  const query = new URLSearchParams({ event: 'pull_request', branch, head_sha: sha, per_page: '10' })
  const { workflow_runs: runs } = await request(`/actions/workflows/ci.yml/runs?${query}`)
  if (!Array.isArray(runs)) return
  const run = runs[0]
  const waiting = waitingForCI(run, sha)
  if (!waiting) {
    if (run?.status !== 'completed' || run.conclusion !== 'success' ||
        !Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_attempt) ||
        (run.pull_requests?.length && !run.pull_requests.some((pull) =>
          pull.number === pr.number && pull.head?.sha === sha))) {
      console.log(`PR #${pr.number}: CI sem sucesso comprovado para o head atual.`)
      return
    }
    const { jobs, total_count } = await request(`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`)
    if (!Array.isArray(jobs) || jobs.length !== total_count ||
        !candidateApproved({ number: pr.number, head: sha, candidate }, run, jobs)) {
      console.log(`PR #${pr.number}: validar sem aprovação para o candidato exato.`)
      return
    }
  }

  const [latest, main, protectedMain] = await Promise.all([
    request(url), request('/git/ref/heads/main'), protection(),
  ])
  if (!eligible(latest) || latest.mergeable !== true || latest.merge_commit_sha !== candidate ||
      latest.auto_merge || main.object.sha !== base || !protectedMain) return

  if (!waiting) {
    const latestRun = await request(`/actions/runs/${run.id}`)
    if (latest.mergeable_state !== 'clean' || latestRun.run_attempt !== run.run_attempt ||
        latestRun.head_sha !== sha || latestRun.status !== 'completed' || latestRun.conclusion !== 'success') return
    const merged = await request(`${url}/merge`, { token: appToken, method: 'PUT',
      body: { sha, merge_method: 'merge' } })
    if (merged.merged !== true) throw new Error(`PR #${pr.number}: GitHub não confirmou o merge protegido.`)
    console.log(`PR #${pr.number}: merge protegido confirmado após CI para ${candidate}: ${merged.sha}.`)
    return
  }

  const result = await request('/graphql', { token: appToken, body: {
    query: 'mutation Enable($id: ID!, $head: GitObjectID!) { enablePullRequestAutoMerge(input: {pullRequestId: $id, expectedHeadOid: $head, mergeMethod: MERGE}) { pullRequest { number autoMergeRequest { enabledAt enabledBy { login } } } } }',
    variables: { id: latest.node_id, head: sha },
  } })
  const confirmed = result.data?.enablePullRequestAutoMerge?.pullRequest
  if (result.errors?.length || confirmed?.number !== pr.number ||
      confirmed?.autoMergeRequest?.enabledBy?.login !== botLogin) {
    console.log(`PR #${pr.number}: auto-merge recusado: ${graphqlReason(result.errors ?? [])}.`)
    return
  }
  console.log(`PR #${pr.number}: solicitação nativa da App confirmada para head ${sha}; o GitHub aguarda validar.`)
}

async function publicationSignals() {
  if (process.env.GITHUB_EVENT_NAME === 'schedule') {
    const { workflow_runs: runs } = await request(
      '/actions/workflows/notify-codex-branch.yml/runs?event=push&status=success&per_page=30',
    )
    return Array.isArray(runs) ? runs : []
  }
  if (!process.env.GITHUB_EVENT_PATH) return []
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  return event.workflow_run ? [event.workflow_run] : []
}

async function reconcile() {
  if (!appToken || !reader || !botLogin || process.env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('A automação exige os tokens do GitHub, a identidade da App e a branch padrão.')
  }
  // Native auto-merge and the protected late path both require the active rules.
  let verified = false
  try {
    verified = await protection()
  } catch (error) {
    console.error(error.message)
  }
  if (!verified) console.log('Proteção indisponível; apenas publicação de PRs autorizados.')
  const main = await request('/git/ref/heads/main')
  const base = main.object.sha
  if (base !== process.env.GITHUB_SHA) {
    console.log('A main mudou depois do início do workflow. A próxima execução reconciliará os PRs.')
    return
  }
  let failures = 0
  const opened = new Map()
  for (const signal of await publicationSignals()) {
    const branch = signal.head_branch
    if (signal.path !== signalPath || signal.event !== 'push' || signal.conclusion !== 'success' ||
        signal.head_repository?.full_name !== repo || !authorizedBranch(branch) ||
        !allowedAuthor(signal.actor?.login)) continue
    try {
      const ref = await request(`/git/ref/heads/${branch}`)
      if (ref.object.sha !== signal.head_sha) continue
      const pr = await findOrPublish(branch, signal.head_sha, base)
      if (pr) opened.set(pr.number, pr)
    } catch (error) {
      failures++
      console.error(error.message)
    }
  }
  if (!verified) {
    if (failures) process.exitCode = 1
    return
  }
  for (let page = 1; ; page++) {
    const pulls = await request(`/pulls?state=open&base=main&per_page=100&page=${page}`)
    for (const pr of pulls) if (!opened.has(pr.number)) opened.set(pr.number, pr)
    if (pulls.length < 100) break
  }
  for (const pr of opened.values()) {
    try {
      if ((await request('/git/ref/heads/main')).object.sha !== base) break
      await reconcilePull(pr, base)
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
