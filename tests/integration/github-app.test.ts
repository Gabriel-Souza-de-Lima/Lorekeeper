import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { promisify } from 'node:util'

test('IA-06/08: publicação, auto-merge e recuperação protegida para PRs internos autorizados', async (t) => {
  const repo = 'owner/lorekeeper'
  const botLogin = 'lorekeeper-pr-bot[bot]'
  let branch = 'feat/servidor'
  let author = botLogin
  let internal = true
  let published = false
  let armed = false
  let ahead = true
  let mergeable = true
  let strict = true
  let changedHead = false
  let signalAuthor = 'owner'
  let tested = 'candidate'
  let ci: 'pending' | 'success' | 'failure' | 'absent' = 'pending'
  const writes: { path: string; method: string; payload: Record<string, unknown> }[] = []

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const path = url.pathname.replace(`/repos/${repo}`, '')
    const pr = {
      number: 1, node_id: 'PR_node', state: 'open', draft: false, user: { login: author },
      mergeable, mergeable_state: ci === 'success' ? 'clean' : 'blocked', merge_commit_sha: 'candidate',
      head: { sha: changedHead && path === '/pulls/1' ? 'new-head' : 'head', ref: branch,
        repo: { full_name: internal ? repo : 'fork/lorekeeper' } },
      base: { ref: 'main', repo: { full_name: repo } },
      auto_merge: armed ? { enabled_by: { login: botLogin } } : null,
    }
    const run = {
      id: 2, run_attempt: 1, event: 'pull_request', head_sha: 'head',
      status: ci === 'pending' ? 'in_progress' : 'completed', conclusion: ci === 'pending' ? null : ci,
      pull_requests: [{ number: 1, head: { sha: 'head' } }],
    }
    const read: Record<string, unknown> = {
      '/rules/branches/main': strict ? [
        { type: 'pull_request' }, { type: 'required_status_checks', parameters: {
          strict_required_status_checks_policy: true, required_status_checks: [{ context: 'validar', integration_id: 15368 }],
        } },
      ] : [],
      '/git/ref/heads/main': { object: { sha: 'base' } },
      [`/git/ref/heads/${branch}`]: { object: { sha: 'head' } },
      '/actions/workflows/notify-codex-branch.yml/runs': {
        workflow_runs: [{ path: '.github/workflows/notify-codex-branch.yml', conclusion: 'success', event: 'push',
          actor: { login: signalAuthor }, head_branch: branch, head_sha: 'head', head_repository: { full_name: repo } }],
      },
      '/compare/base...head': {
        status: ahead ? 'ahead' : 'diverged', merge_base_commit: { sha: ahead ? 'base' : 'older' },
        files: [{ filename: 'src/server/app.ts', additions: 1, patch: '@@ -1 +1 @@\n-old\n+new' }],
      },
      '/pulls': published ? [pr] : [],
      '/pulls/1': pr,
      '/git/commits/candidate': { parents: [{ sha: 'base' }, { sha: 'head' }] },
      '/actions/workflows/ci.yml/runs': { workflow_runs: ci === 'absent' ? [] : [run] },
      '/actions/runs/2': run,
      '/actions/runs/2/attempts/1/jobs': { total_count: 1, jobs: [{
        name: 'validar', status: 'completed', conclusion: 'success',
        steps: [{ name: `PR 1 candidato ${tested}`, status: 'completed', conclusion: 'success' }],
      }] },
    }
    let body: unknown = read[path]
    if (req.method === 'POST' || req.method === 'PUT') {
      let payload = ''
      for await (const chunk of req) payload += chunk
      if (req.headers.authorization !== 'Bearer app-fixture') {
        res.writeHead(403).end('{}')
        return
      }
      writes.push({ path, method: req.method, payload: JSON.parse(payload) })
      if (path === '/pulls') {
        published = true
        body = pr
      } else if (path === '/graphql') {
        armed = true
        body = { data: { enablePullRequestAutoMerge: { pullRequest: { number: 1,
          autoMergeRequest: { enabledAt: 'test', enabledBy: { login: botLogin } },
        } } } }
      } else if (path === '/pulls/1/merge') {
        body = { merged: true, sha: 'merge-result' }
      }
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
    GITHUB_REPOSITORY: repo, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: 'base', GITHUB_EVENT_NAME: 'schedule',
    GITHUB_API_URL: origin, GITHUB_GRAPHQL_URL: `${origin}/graphql`,
    APP_TOKEN: 'app-fixture', GITHUB_TOKEN: 'reader-fixture', APP_SLUG: 'lorekeeper-pr-bot',
  } })
  const paths = () => writes.map(({ path }) => path)

  signalAuthor = 'outsider'
  await run()
  assert.deepEqual(paths(), [])
  signalAuthor = 'owner'
  await run()
  await run()
  assert.deepEqual(paths(), ['/pulls', '/graphql'])
  assert.equal((writes[1].payload.variables as { head: string }).head, 'head')
  assert.match(String(writes[1].payload.query), /expectedHeadOid/)

  const expectBlocked = async () => {
    await run()
    assert.deepEqual(paths(), ['/pulls', '/graphql'])
  }
  armed = false
  branch = 'fix/servidor'
  author = 'owner'
  ci = 'failure'
  await expectBlocked()
  ci = 'success'
  ahead = false
  await expectBlocked()
  ahead = true
  mergeable = false
  await expectBlocked()
  mergeable = true
  internal = false
  await expectBlocked()
  internal = true
  author = 'outsider'
  await expectBlocked()
  author = 'owner'
  changedHead = true
  await expectBlocked()
  changedHead = false
  strict = false
  await expectBlocked()
  strict = true
  tested = 'outro'
  await expectBlocked()
  tested = 'candidate'
  assert.match((await run()).stdout, /merge protegido confirmado/)
  assert.deepEqual(writes.at(-1), { path: '/pulls/1/merge', method: 'PUT',
    payload: { sha: 'head', merge_method: 'merge' } })

  branch = 'chore/infra'
  ci = 'absent'
  await run()
  assert.equal(writes.at(-1)?.path, '/graphql')
})
