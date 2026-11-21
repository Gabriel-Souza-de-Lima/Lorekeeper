type Evidence = {
  event: string, conclusion: string, status: string,
  jobs: { name: string, status: string, conclusion: string }[],
  repository: string, headRepository: string, baseRepository: string,
  headBranch: string, baseBranch: string, prState: string, draft: boolean,
  mergeable: boolean | null | undefined,
  validatedHead: string, currentHead: string, validatedBase: string, currentBase: string,
  testedCandidate: string, currentCandidate: string, paths: string[]
}

export function assess(evidence: Evidence) {
  if (evidence.event !== 'pull_request' || evidence.status !== 'completed' || evidence.conclusion !== 'success') {
    return 'ci-not-successful'
  }

  const validationJobs = evidence.jobs.filter((job) => job.name === 'validar')
  if (validationJobs.length !== 1 || validationJobs[0].status !== 'completed' || validationJobs[0].conclusion !== 'success') {
    return 'validation-not-successful'
  }

  if (!evidence.repository || evidence.repository !== evidence.baseRepository ||
      evidence.repository !== evidence.headRepository || evidence.baseBranch !== 'main' ||
      !/^(feat|fix|docs)\/[a-z0-9][a-z0-9-]*$/.test(evidence.headBranch) ||
      evidence.prState !== 'open' || evidence.draft !== false) {
    return 'pull-request-not-eligible'
  }

  if (evidence.mergeable !== true) return 'mergeability-not-confirmed'
  if (!evidence.validatedHead || evidence.validatedHead !== evidence.currentHead ||
      !evidence.validatedBase || evidence.validatedBase !== evidence.currentBase ||
      !evidence.testedCandidate || evidence.testedCandidate !== evidence.currentCandidate) {
    return 'revalidation-required'
  }

  if (!evidence.paths.length || evidence.paths.some((path) =>
    !/^(src\/web\/|tests\/|docs\/specs\/)/.test(path) ||
    /auth|permission|secret|migration/i.test(path))) {
    return 'manual-review-required'
  }

  return 'eligible'
}
