import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { promisify } from 'node:util'

test('a App abre um único PR e solicita auto-merge nativo apenas com CI pendente e política confirmada', async (t) => {
  const repo = 'owner/lorekeeper'
  const branch = 'codex/ensaio'
  const bot = { login: 'lorekeeper-pr-bot[bot]' }
  const pr = {
    number: 1, node_id: 'PR_node', state: 'open', draft: false, user: bot,
    merge_commit_sha: 'candidate', head: { sha: 'head', ref: branch, repo: { full_name: repo } },
    base: { ref: 'main', repo: { full_name: repo } },
  }
  const writes: string[] = []
  let published = false
  let armed = false
  let protectedMain = false
  let rejected = true
  let ahead = true
  let mergeable = true
  let author = bot
  let status = 'in_progress'
  let conclusion: string | null = null
  let changedHead = false
  let runVisible = true
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const path = url.pathname.replace(`/repos/${repo}`, '')
    const read: Record<string, unknown> = {
      '/rules/branches/main': protectedMain ? [
        { type: 'deletion', ruleset_id: 1, ruleset_source_type: 'Repository' },
        { type: 'pull_request', ruleset_id: 1 },
        { type: 'required_status_checks', ruleset_id: 1, parameters: { strict_required_status_checks_policy: true,
          required_status_checks: [{ context: 'validar', integration_id: 15368 }] } },
      ] : [],
      '/git/ref/heads/main': { object: { sha: 'base' } },
      '/git/matching-refs/heads/codex/': [{ ref: `refs/heads/${branch}`, object: { sha: 'head' } }],
      '/compare/base...head': { status: ahead ? 'ahead' : 'diverged', merge_base_commit: { sha: ahead ? 'base' : 'older' },
        files: [{ filename: 'docs/specs/test.md' }] },
      '/pulls': published ? [pr] : [],
      '/pulls/1': { ...pr, user: author, mergeable, head: { ...pr.head, sha: changedHead ? 'new-head' : 'head' },
        auto_merge: armed ? { enabled_by: bot } : null },
      '/git/commits/candidate': { parents: [{ sha: 'base' }, { sha: 'head' }] },
      '/actions/workflows/ci.yml/runs': { workflow_runs: runVisible ? [
        { id: 2, head_sha: 'head', event: 'pull_request', status, conclusion },
      ] : [] },
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
        const mutation = JSON.parse(payload)
        if (!mutation.query.includes('expectedHeadOid') || mutation.variables.head !== 'head') {
          res.writeHead(400).end('{}')
          return
        }
        armed = !rejected
        body = rejected ? { errors: [{ message: 'Pull request is in clean status' }] } :
          { data: { enablePullRequestAutoMerge: { pullRequest: { number: 1,
            autoMergeRequest: { enabledAt: 'test', enabledBy: bot },
          } } } }
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
    GITHUB_API_URL: origin, GITHUB_GRAPHQL_URL: `${origin}/graphql`,
    APP_TOKEN: 'app-fixture', GITHUB_TOKEN: 'reader-fixture', APP_SLUG: 'lorekeeper-pr-bot',
  } })

  assert.match((await run()).stdout, /apenas publicação de PRs/)
  protectedMain = true
  status = 'completed'
  for (const completed of ['failure', 'success']) {
    conclusion = completed
    assert.match((await run()).stdout, /CI não está pendente/)
  }
  status = 'in_progress'
  conclusion = null
  ahead = false
  await run()
  ahead = true
  mergeable = false
  await run()
  mergeable = true
  changedHead = true
  await run()
  changedHead = false
  author = { login: 'maintainer' }
  await run()
  author = bot
  assert.deepEqual(writes, ['/pulls'])

  assert.match((await run()).stdout, /auto-merge recusado: PR já integrável/)
  assert.deepEqual(writes, ['/pulls', '/graphql'])

  rejected = false
  runVisible = false // Immediately after publication, the run may not exist yet.
  assert.match((await run()).stdout, /solicitação nativa da App confirmada para head head/)
  assert.match((await run()).stdout, /auto-merge já solicitado; autor App/)
  assert.deepEqual(writes, ['/pulls', '/graphql', '/graphql'])
})
