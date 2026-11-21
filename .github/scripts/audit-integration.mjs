import { appendFileSync, readFileSync } from 'node:fs'
import { assess } from './integration-policy.ts'

const repository = process.env.GITHUB_REPOSITORY
const { workflow_run: eventRun } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))

async function read(path) {
  const response = await fetch(`${process.env.GITHUB_API_URL}/repos/${repository}/${path}`, {
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`)
  return response.json()
}

async function audit() {
  if (eventRun.event !== 'pull_request') return ['not-a-pull-request']
  const [run, workflow] = await Promise.all([
    read(`actions/runs/${eventRun.id}`),
    read('actions/workflows/ci.yml'),
  ])
  const associations = run.pull_requests ?? []
  if (run.workflow_id !== workflow.id || run.run_attempt !== eventRun.run_attempt || associations.length !== 1) {
    return ['run-or-pull-request-not-confirmed']
  }
  const association = associations[0]
  const number = association.number
  if (run.status !== 'completed' || run.conclusion !== 'success') return ['ci-not-successful', number]

  const [pr, main, jobList, files] = await Promise.all([
    read(`pulls/${number}`),
    read('git/ref/heads/main'),
    read(`actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`),
    read(`pulls/${number}/files?per_page=100`),
  ])
  const jobs = jobList.jobs ?? []
  const validation = jobs.filter((job) => job.name === 'validar')
  if (jobs.length !== jobList.total_count || validation.length !== 1 ||
      validation[0].status !== 'completed' || validation[0].conclusion !== 'success') {
    return ['validation-not-successful', number]
  }
  if (!pr.merge_commit_sha || pr.mergeable !== true) return ['mergeability-not-confirmed', number]

  // Require both the check's recorded SHA and the exact parents of the merge candidate.
  const checkId = validation[0].check_run_url?.match(/\/check-runs\/(\d+)$/)?.[1]
  if (!checkId) return ['candidate-evidence-unavailable', number]
  const [check, commit] = await Promise.all([
    read(`check-runs/${checkId}`),
    read(`git/commits/${pr.merge_commit_sha}`),
  ])
  const currentBase = main.object.sha
  if (check.head_sha !== pr.merge_commit_sha || check.app?.slug !== 'github-actions' ||
      check.status !== 'completed' || check.conclusion !== 'success' ||
      commit.parents.length !== 2 || commit.parents[0].sha !== currentBase || commit.parents[1].sha !== pr.head.sha) {
    return ['candidate-evidence-unavailable', number]
  }

  const paths = files.length === pr.changed_files
    ? files.flatMap(({ filename, previous_filename }) => previous_filename ? [filename, previous_filename] : [filename])
    : []
  return [assess({
    event: run.event, conclusion: run.conclusion, status: run.status, jobs,
    repository, headRepository: pr.head.repo?.full_name, baseRepository: pr.base.repo?.full_name,
    headBranch: pr.head.ref, baseBranch: pr.base.ref, prState: pr.state, draft: pr.draft,
    mergeable: pr.mergeable, validatedHead: association.head.sha, currentHead: pr.head.sha,
    validatedBase: association.base.sha, currentBase, testedCandidate: check.head_sha,
    currentCandidate: pr.merge_commit_sha, paths,
  }), number]
}

let decision
let pullRequest
try {
  [decision, pullRequest] = await audit()
} catch (error) {
  decision = 'evidence-unavailable'
  console.error(error.message)
}
const summary = `Auditoria de integração: ${decision}${Number.isInteger(pullRequest) ? ` (PR #${pullRequest})` : ''}. Somente leitura.\n`
console.log(summary)
appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
