import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { promisify } from 'node:util'

test('a App publica uma vez e só solicita auto-merge nativo com candidato aprovado', async (t) => {
  const repo = 'owner/lorekeeper'
  const branch = 'codex/ensaio'
  const pr = { number: 1, node_id: 'PR_node', state: 'open', draft: false, mergeable: true,
    merge_commit_sha: 'candidate', head: { sha: 'head', ref: branch, repo: { full_name: repo } },
    base: { ref: 'main', repo: { full_name: repo } } }
  const writes: string[] = []
  let published = false
  let passed = false
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const path = url.pathname.replace(`/repos/${repo}`, '')
    const success = passed ? 'success' : null
    const read: Record<string, unknown> = {
      '': { default_branch: 'main', allow_auto_merge: true, allow_merge_commit: true },
      '/rules/branches/main': [
        { type: 'pull_request', ruleset_id: 1, parameters: { required_approving_review_count: 0 } },
        { type: 'required_status_checks', ruleset_id: 1, parameters: { strict_required_status_checks_policy: true,
          required_status_checks: [{ context: 'validar', integration_id: 15368 }] } },
      ],
      '/rulesets/1': { id: 1, enforcement: 'active', bypass_actors: [] },
      '/git/ref/heads/main': { object: { sha: 'base' } },
      '/git/matching-refs/heads/codex/': [{ ref: `refs/heads/${branch}`, object: { sha: 'head' } }],
      '/compare/base...head': { status: 'ahead', merge_base_commit: { sha: 'base' }, files: [{ filename: 'docs/specs/test.md' }] },
      '/pulls': published ? [pr] : [],
      '/pulls/1': pr,
      '/git/commits/candidate': { parents: [{ sha: 'base' }, { sha: 'head' }] },
      '/actions/workflows/ci.yml/runs': { workflow_runs: [{ id: 2, run_attempt: 1,
        head_sha: 'head', event: 'pull_request', status: passed ? 'completed' : 'in_progress', conclusion: success }] },
      '/actions/runs/2/attempts/1/jobs': { total_count: 1, jobs: [{ name: 'validar', status: 'completed',
        conclusion: 'success', steps: [{ name: 'PR 1 candidato candidate', status: 'completed', conclusion: 'success' }] }] },
    }
    let body: unknown = read[path]
    if (req.method === 'POST') {
      req.resume()
      if (req.headers.authorization !== 'Bearer app-fixture') {
        res.writeHead(403).end('{}')
        return
      }
      writes.push(path)
      if (path === '/pulls') {
        published = true
        body = pr
      } else if (path === '/graphql') {
        body = { data: { enablePullRequestAutoMerge: { pullRequest: {
          number: 1, autoMergeRequest: { enabledAt: 'test' }, merged: false,
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
    APP_TOKEN: 'app-fixture', GITHUB_TOKEN: 'reader-fixture',
  } })

  await run()
  await run()
  assert.deepEqual(writes, ['/pulls'])
  passed = true
  const result = await run()
  assert.match(result.stdout, /confirmou solicitação de auto-merge/)
  assert.deepEqual(writes, ['/pulls', '/graphql'])
})
