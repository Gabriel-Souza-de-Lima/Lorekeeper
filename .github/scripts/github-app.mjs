import { setTimeout as delay } from 'node:timers/promises'
import { ordinaryChange, strictRules, waitingForCI } from './github-app-policy.ts'

const repo = process.env.GITHUB_REPOSITORY
const prefix = `/repos/${repo}`
const appToken = process.env.APP_TOKEN
const reader = process.env.GITHUB_TOKEN
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
  if (/clean status|can be merged immediately/i.test(raw)) return 'PR já integrável; a janela de espera pelo CI passou'
  if (/not authorized|forbidden|resource not accessible|permission/i.test(raw)) return 'a App não tem autorização para a solicitação nativa'
  if (/disabled|not enabled/i.test(raw)) return 'auto-merge desabilitado ou indisponível no GitHub'
  if (/conflict|dirty|not mergeable/i.test(raw)) return 'o GitHub detectou candidato não integrável'
  return 'o GitHub não confirmou a solicitação (erro GraphQL sem categoria conhecida)'
}

async function askNativeMerge(pr, branch, sha, base) {
  const url = `/pulls/${pr.number}`
  let current = await request(url)
  for (let attempt = 0; current.mergeable === null && current.state === 'open' && attempt < 4; attempt++) {
    await delay(750)
    current = await request(url)
  }
  const eligible = (value) => value.state === 'open' && value.draft === false &&
    value.head.sha === sha && value.head.ref === branch && value.head.repo?.full_name === repo &&
    value.base.ref === 'main' && value.base.repo?.full_name === repo && value.user?.login === botLogin &&
    value.mergeable === true && Boolean(value.merge_commit_sha)

  if (!botLogin || !eligible(current)) {
    console.log(`PR #${pr.number}: autoria, estado ou candidato incompatível com a publicação.`)
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
  if (!Array.isArray(runs) || !waitingForCI(runs[0], sha)) {
    console.log(`PR #${pr.number}: CI não está pendente para o head atual; nenhum pedido nativo.`)
    return
  }

  const [latest, main, protectedMain] = await Promise.all([
    request(url), request('/git/ref/heads/main'), protection(),
  ])
  if (!eligible(latest) || latest.merge_commit_sha !== candidate || latest.auto_merge ||
      main.object.sha !== base || !protectedMain) return

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
