import { admissionCheck, candidateApproved, ordinaryChange, protectionIssues } from './github-app-policy.ts'

const repo = process.env.GITHUB_REPOSITORY
const prefix = `/repos/${repo}`
const appToken = process.env.APP_TOKEN
const reader = process.env.GITHUB_TOKEN
const verifier = process.env.RULESET_VERIFIER_TOKEN || appToken
const appId = Number(process.env.APP_ID)
const botLogin = process.env.APP_SLUG && `${process.env.APP_SLUG}[bot]`

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
  const settings = [
    ['main-como-padrão', repository.default_branch === 'main'],
    ['auto-merge-habilitado', repository.allow_auto_merge === true],
    ['método-merge-permitido', repository.allow_merge_commit === true],
  ]
  const unknown = settings.filter(([, confirmed]) => !confirmed).map(([name]) => name)
  if (unknown.length) {
    console.log(`Configuração REST não confirmada: ${unknown.join(', ')}.`)
    return false
  }
  const rules = await request('/rules/branches/main')
  const ids = [...new Set(rules.map((rule) => rule.ruleset_id))]
  if (ids.some((id) => !Number.isSafeInteger(id))) return false
  const rulesets = await Promise.all(ids.map((id) => request(`/rulesets/${id}`, { token: verifier })))
  const issues = protectionIssues(rules, rulesets, appId)
  if (issues.length) console.log(`Proteção bloqueada: ${issues.join(', ')}.`)
  return issues.length === 0
}

async function currentDiff(base, head) {
  const diff = await request(`/compare/${base}...${head}`)
  return diff.status === 'ahead' && diff.merge_base_commit?.sha === base ? diff : null
}

async function findOrPublish(branch, sha, base) {
  const diff = await currentDiff(base, sha)
  // A comparison at the API cap may be incomplete.
  if (!(diff?.files?.length < 300) || !ordinaryChange(branch, diff.files)) return null
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

function graphqlReason(errors) {
  const raw = errors.map((error) => typeof error.message === 'string' ? error.message : '').join(' ')
  if (/clean status|can be merged immediately/i.test(raw)) return 'PR já integrável; confira o check de admissão obrigatório'
  if (/not authorized|forbidden|resource not accessible|permission/i.test(raw)) return 'a App não tem autorização para a solicitação nativa'
  if (/disabled|not enabled/i.test(raw)) return 'auto-merge desabilitado ou indisponível no GitHub'
  if (/conflict|dirty|not mergeable/i.test(raw)) return 'o GitHub detectou candidato não integrável'
  return 'o GitHub não confirmou a solicitação (erro GraphQL sem categoria conhecida)'
}

async function admit(pr, sha, base, automatic) {
  const url = `/pulls/${pr.number}`
  const current = await request(url)
  if (current.state !== 'open' || current.draft !== false ||
      current.head.sha !== sha || current.head.repo?.full_name !== repo ||
      current.base.ref !== 'main' || current.base.repo?.full_name !== repo ||
      current.mergeable !== true || !current.merge_commit_sha) {
    console.log(`PR #${pr.number}: estado ou candidato indisponível, conflito ou referência alterada.`)
    return
  }
  if (!await currentDiff(base, sha)) {
    console.log(`PR #${pr.number}: branch desatualizada em relação à main.`)
    return
  }
  const candidate = current.merge_commit_sha
  const commit = await request(`/git/commits/${candidate}`)
  if (commit.parents.length !== 2 || commit.parents[0].sha !== base || commit.parents[1].sha !== sha) {
    console.log(`PR #${pr.number}: candidato não corresponde à base e ao head atuais.`)
    return
  }
  const query = new URLSearchParams({ event: 'pull_request', branch: current.head.ref, head_sha: sha, per_page: '10' })
  const { workflow_runs: runs } = await request(`/actions/workflows/ci.yml/runs?${query}`)
  const run = runs[0]
  if (!run || run.head_sha !== sha || run.status !== 'completed' || run.conclusion !== 'success') {
    console.log(`PR #${pr.number}: CI sem aprovação; estado=${run?.status ?? 'ausente'}, conclusão=${run?.conclusion ?? 'ausente'}.`)
    return
  }
  const { jobs, total_count } = await request(`/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`)
  if (jobs.length !== total_count || !candidateApproved({ number: pr.number, head: sha, candidate }, run, jobs)) {
    console.log(`PR #${pr.number}: job validar ou seu passo de verificação do candidato sem evidência exata.`)
    return
  }
  console.log(`PR #${pr.number}: CI ${run.id} aprovou ${candidate} (base ${base}, head ${sha}).`)

  async function stillCurrent() {
    const [latest, main] = await Promise.all([request(url), request('/git/ref/heads/main')])
    if (latest.state !== 'open' || latest.draft !== false || latest.mergeable !== true ||
        latest.head.sha !== sha || latest.merge_commit_sha !== candidate || main.object.sha !== base) {
      console.log(`PR #${pr.number}: estado, candidato ou base mudou durante a verificação.`)
      return null
    }
    return await protection() ? latest : null
  }

  let latest = await stillCurrent()
  if (!latest) return
  const previous = await request(`/commits/${candidate}/check-runs?check_name=${admissionCheck}&app_id=${appId}`, { token: appToken })
  if (previous.check_runs.some((check) => check.app?.id === appId && check.conclusion === 'success')) return

  if (automatic) {
    if (!latest.auto_merge) {
      const result = await request('/graphql', { token: appToken, body: {
        query: 'mutation Enable($id: ID!) { enablePullRequestAutoMerge(input: {pullRequestId: $id, mergeMethod: MERGE}) { pullRequest { number autoMergeRequest { enabledAt enabledBy { login } } merged } } }',
        variables: { id: latest.node_id },
      } })
      const confirmed = result.data?.enablePullRequestAutoMerge?.pullRequest
      if (result.errors?.length || confirmed?.autoMergeRequest?.enabledBy?.login !== botLogin) {
        console.log(`PR #${pr.number}: auto-merge recusado: ${graphqlReason(result.errors ?? [])}.`)
        return
      }
      console.log(`PR #${pr.number}: solicitação nativa da App confirmada pelo GitHub.`)
    }
    latest = await stillCurrent()
    if (latest?.auto_merge?.enabled_by?.login !== botLogin) {
      console.log(`PR #${pr.number}: API não confirmou a solicitação nativa vigente da App.`)
      return
    }
  } else if (latest.auto_merge) {
    console.log(`PR #${pr.number}: revisão manual necessária; desarme o auto-merge antes da admissão.`)
    return
  }

  const verifiedRun = await request(`/actions/runs/${run.id}`)
  if (verifiedRun.run_attempt !== run.run_attempt || verifiedRun.status !== 'completed' ||
      verifiedRun.conclusion !== 'success') {
    console.log(`PR #${pr.number}: o CI mudou antes da admissão.`)
    return
  }

  const check = await request('/check-runs', { token: appToken, body: {
    name: admissionCheck, head_sha: candidate, status: 'completed', conclusion: 'success',
    details_url: `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${run.id}`,
    output: { title: 'Candidato exato validado', summary: automatic ?
      'CI aprovado e solicitação nativa confirmada.' : 'CI aprovado. A alteração depende de integração manual.' },
  } })
  if (check.app?.id !== appId || check.head_sha !== candidate || check.conclusion !== 'success') {
    throw new Error(`PR #${pr.number}: API não confirmou o check de admissão esperado.`)
  }
  console.log(`PR #${pr.number}: admissão ${check.id} aprovada para ${candidate}.`)
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
  const automatic = new Map()
  let failures = 0
  for (const { ref, object } of refs) {
    const branch = ref.replace(/^refs\/heads\//, '')
    if (!/^codex\/[a-z0-9][a-z0-9-]{0,70}$/.test(branch)) continue
    try {
      const pr = await findOrPublish(branch, object.sha, main.object.sha)
      if (pr) automatic.set(pr.number, object.sha)
    } catch (error) {
      failures++
      console.error(error.message)
    }
  }
  if (verified) {
    const pulls = await request('/pulls?state=open&base=main&per_page=100')
    for (const pr of pulls) {
      if (pr.head.repo?.full_name !== repo || pr.draft !== false) continue
      try {
        const eligible = Boolean(botLogin && automatic.get(pr.number) === pr.head.sha && pr.user?.login === botLogin)
        await admit(pr, pr.head.sha, main.object.sha, eligible)
      } catch (error) {
        failures++
        console.error(error.message)
      }
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
