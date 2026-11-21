import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'

const runNode = promisify(execFile)

test('a auditoria lê a evidência via HTTP e fecha diante de mudança de base ou erro de acesso', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'lorekeeper-audit-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const repo = { full_name: 'owner/lorekeeper' }
  const head = { sha: 'head', ref: 'feat/example', repo }
  const base = { sha: 'base', ref: 'main', repo }
  const run = { id: 12, event: 'pull_request', workflow_id: 9, run_attempt: 1,
    status: 'completed', conclusion: 'success', pull_requests: [{ number: 4, head, base }] }
  const pr = { head, base, state: 'open', draft: false, mergeable: true, merge_commit_sha: 'candidate', changed_files: 1 }
  const job = { name: 'validar', status: 'completed', conclusion: 'success', check_run_url: 'https://api.github.com/repos/owner/lorekeeper/check-runs/8' }
  let main = 'base'
  let forbid = false
  const methods: string[] = []
  const server = createServer((request, response) => {
    methods.push(request.method ?? '')
    const path = request.url?.replace('/repos/owner/lorekeeper/', '')
    const endpoints: Record<string, unknown> = {
      'actions/runs/12': run,
      'actions/workflows/ci.yml': { id: 9 },
      'pulls/4': pr,
      'git/ref/heads/main': { object: { sha: main } },
      'actions/runs/12/attempts/1/jobs?per_page=100': { total_count: 1, jobs: [job] },
      'pulls/4/files?per_page=100': [{ filename: 'src/web/main.tsx' }],
      'check-runs/8': { ...job, head_sha: 'candidate', app: { slug: 'github-actions' } },
      'git/commits/candidate': { parents: [{ sha: 'base' }, { sha: 'head' }] },
    }
    const data = endpoints[path ?? '']
    response.writeHead(forbid ? 403 : data ? 200 : 404, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(data ?? {}))
  })
  server.listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const event = join(dir, 'event.json')
  const summary = join(dir, 'summary.md')
  await writeFile(event, JSON.stringify({ workflow_run: run }))
  const env = {
    GITHUB_REPOSITORY: repo.full_name,
    GITHUB_API_URL: `http://127.0.0.1:${address.port}`,
    GITHUB_EVENT_PATH: event,
    GITHUB_STEP_SUMMARY: summary,
    GITHUB_TOKEN: 'fixture',
  }

  await runNode(process.execPath, ['.github/scripts/audit-integration.mjs'], { env })
  main = 'base-new'
  await runNode(process.execPath, ['.github/scripts/audit-integration.mjs'], { env })
  forbid = true
  await runNode(process.execPath, ['.github/scripts/audit-integration.mjs'], { env })
  const outcomes = (await readFile(summary, 'utf8')).trim().split('\n')
  assert.deepEqual(outcomes, [
    'Auditoria de integração: eligible (PR #4). Somente leitura.',
    'Auditoria de integração: candidate-evidence-unavailable (PR #4). Somente leitura.',
    'Auditoria de integração: evidence-unavailable. Somente leitura.',
  ])
  assert.deepEqual([...new Set(methods)], ['GET'])
})
