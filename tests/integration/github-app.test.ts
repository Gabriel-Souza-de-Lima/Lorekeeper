import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { promisify } from 'node:util'

test('a App publica, aguarda a prova exata, solicita auto-merge e só então aprova a admissão', async (t) => {
  const repo = 'owner/lorekeeper'
  const branch = 'codex/ensaio'
  const bot = { login: 'lorekeeper-pr-bot[bot]' }
  const app = { id: 42 }
  const pr = {
    number: 1, node_id: 'PR_node', state: 'open', draft: false, mergeable: true, user: bot,
    merge_commit_sha: 'candidate', head: { sha: 'head', ref: branch, repo: { full_name: repo } },
    base: { ref: 'main', repo: { full_name: repo } },
  }
  const writes: string[] = []
  let published = false
  let armed = false
  let visible = false
  let rejected = true
  let candidate = 'candidate'
  let status = 'in_progress'
  let conclusion: string | null = null
  let ahead = true
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const path = url.pathname.replace(`/repos/${repo}`, '')
    const run = { id: 2, run_attempt: 1, head_sha: 'head', event: 'pull_request', status, conclusion }
    const read: Record<string, unknown> = {
      '': { default_branch: 'main', allow_auto_merge: true, allow_merge_commit: true },
      '/rules/branches/main': [
        { type: 'deletion', ruleset_id: 1, ruleset_source_type: 'Repository' },
        { type: 'pull_request', ruleset_id: 1, parameters: { required_approving_review_count: 0 } },
        { type: 'required_status_checks', ruleset_id: 1, parameters: { strict_required_status_checks_policy: true,
          required_status_checks: [{ context: 'validar', integration_id: 15368 },
            { context: 'integracao-lorekeeper', integration_id: 42 }] } },
      ],
      '/rulesets/1': { id: 1, name: 'main', source: repo, enforcement: 'active',
        ...(visible && req.headers.authorization === 'Bearer verifier-fixture' ? { bypass_actors: [] } : {}) },
      '/git/ref/heads/main': { object: { sha: 'base' } },
      '/git/matching-refs/heads/codex/': [{ ref: `refs/heads/${branch}`, object: { sha: 'head' } }],
      '/compare/base...head': { status: ahead ? 'ahead' : 'diverged', merge_base_commit: { sha: ahead ? 'base' : 'older' },
        files: [{ filename: 'docs/specs/test.md' }] },
      '/pulls': published ? [pr] : [],
      '/pulls/1': { ...pr, auto_merge: armed ? { enabled_by: bot } : null },
      '/git/commits/candidate': { parents: [{ sha: 'base' }, { sha: 'head' }] },
      '/actions/workflows/ci.yml/runs': { workflow_runs: [run] },
      '/actions/runs/2': run,
      '/actions/runs/2/attempts/1/jobs': { total_count: 1, jobs: [{ name: 'validar', status: 'completed',
        conclusion: 'success', steps: [{ name: `PR 1 candidato ${candidate}`, status: 'completed', conclusion: 'success' }] }] },
      '/commits/candidate/check-runs': { total_count: 0, check_runs: [] },
    }
    let body: unknown = read[path]
    if (req.method === 'POST') {
      let payload = ''
      for await (const chunk of req) payload += chunk
      if (req.headers.authorization !== 'Bearer app-fixture') {
        res.writeHead(403).end('{}')
        return
      }
      writes.push(path)
      if (path === '/pulls') {
        published = true
        body = pr
      } else if (path === '/graphql') {
        armed = !rejected
        body = rejected ? { errors: [{ message: 'Pull request is in clean status' }] } :
          { data: { enablePullRequestAutoMerge: { pullRequest: {
            number: 1, autoMergeRequest: { enabledAt: 'test', enabledBy: bot }, merged: false,
          } } } }
      } else if (path === '/check-runs' && armed) {
        const sent = JSON.parse(payload)
        body = { id: 9, app, head_sha: sent.head_sha, conclusion: sent.conclusion }
      } else body = undefined
    }
    res.writeHead(body === undefined ? 404 : 200, { 'Content-Type': 'application/json' }).end(JSON.stringify(body ?? {}))
  })
  server.listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const origin = `http://127.0.0.1:${address.port}`
  const run = () => promisify(execFile)(process.execPath, ['.github/scripts/github-app.mjs'], { env: {
    GITHUB_REPOSITORY: repo, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: 'base',
    GITHUB_API_URL: origin, GITHUB_GRAPHQL_URL: `${origin}/graphql`, GITHUB_SERVER_URL: origin,
    APP_TOKEN: 'app-fixture', GITHUB_TOKEN: 'reader-fixture', RULESET_VERIFIER_TOKEN: 'verifier-fixture',
    APP_ID: '42', APP_SLUG: 'lorekeeper-pr-bot',
  } })

  assert.match((await run()).stdout, /ruleset-1-bypass-hidden/)
  visible = true
  assert.match((await run()).stdout, /estado=in_progress/)
  status = 'completed'
  conclusion = 'failure'
  assert.match((await run()).stdout, /conclusão=failure/)
  conclusion = 'success'
  ahead = false
  assert.match((await run()).stdout, /branch desatualizada/)
  ahead = true
  candidate = 'old-candidate'
  assert.match((await run()).stdout, /sem evidência exata/)
  assert.deepEqual(writes, ['/pulls'])

  candidate = 'candidate'
  assert.match((await run()).stdout, /auto-merge recusado: PR já integrável/)
  assert.deepEqual(writes, ['/pulls', '/graphql'])

  rejected = false
  const result = await run()
  assert.match(result.stdout, /solicitação nativa da App confirmada/)
  assert.match(result.stdout, /admissão 9 aprovada para candidate/)
  assert.deepEqual(writes, ['/pulls', '/graphql', '/graphql', '/check-runs'])
})
