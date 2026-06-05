import { spawnSync } from 'node:child_process'

import publishWorkspaceHelpers from './helpers/publish-workspaces.js'
import { getWorkspacePackages, topologicallySortWorkspaces } from './workspace-utils.mjs'

const { resolvePublishTag } = publishWorkspaceHelpers
const { resolvePublishCommand } = publishWorkspaceHelpers
const { buildExpectedReleaseSet } = publishWorkspaceHelpers
const { findUnresolvableReleases } = publishWorkspaceHelpers
const extraArgs = process.argv.slice(2)
const packages = topologicallySortWorkspaces(getWorkspacePackages())

// Resolve an exact `name@version` against the registry, returning the resolved
// version string or null. Retries with backoff so brief post-publish propagation
// lag is not mistaken for a missing tarball (#15).
const RELEASE_RESOLVE_ATTEMPTS = 5
const RELEASE_RESOLVE_DELAY_MS = 3000

const sleepSync = (ms) => {
  const until = Date.now() + ms
  while (Date.now() < until) {
    // busy-wait: spawnSync is sync, so this keeps the verification loop simple
  }
}

const resolvePublishedVersion = (name, version) => {
  for (let attempt = 1; attempt <= RELEASE_RESOLVE_ATTEMPTS; attempt++) {
    const viewArgs = ['view', `${name}@${version}`, 'version']
    const viewCommand = resolvePublishCommand({
      publishArgs: viewArgs,
      env: process.env,
      nodeExecPath: process.execPath
    })
    const result = spawnSync(viewCommand.command, viewCommand.args, { encoding: 'utf8' })
    const resolved = result.status === 0 ? result.stdout.trim() : ''

    if (resolved === version) {
      return resolved
    }

    if (attempt < RELEASE_RESOLVE_ATTEMPTS) {
      sleepSync(RELEASE_RESOLVE_DELAY_MS)
    }
  }

  return null
}

for (const pkg of packages) {
  if (pkg.manifest.private) {
    continue
  }

  const publishArgs = ['publish', '--access', 'public']
  const distTag = resolvePublishTag({
    version: pkg.manifest.version,
    extraArgs,
    env: process.env
  })

  if (distTag) {
    publishArgs.push('--tag', distTag)
  }

  publishArgs.push(...extraArgs)
  const publishCommand = resolvePublishCommand({
    publishArgs,
    env: process.env,
    nodeExecPath: process.execPath
  })
  const result = spawnSync(publishCommand.command, publishCommand.args, {
    cwd: pkg.directory,
    stdio: 'inherit'
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

// #15: a release set is only valid once every published package resolves to
// exactly its release version. Verify before finalizing so a partial publish
// (which would leave an exact-pinned internal dep unresolvable under npm/bun)
// fails loudly here instead of silently shipping a broken registry state.
const expectedReleases = buildExpectedReleaseSet(packages)
const unresolvable = findUnresolvableReleases({
  expected: expectedReleases,
  resolveVersion: resolvePublishedVersion
})

if (unresolvable.length > 0) {
  console.error('Release verification failed: the following packages did not resolve on the registry:')
  for (const { name, version } of unresolvable) {
    console.error(`- ${name}@${version}`)
  }
  console.error(
    'The published set is incomplete; an exact-pinned internal dependency would be unresolvable under npm/bun.'
  )
  process.exit(1)
}

console.log(`Verified ${expectedReleases.length} published package(s) resolve on the registry.`)
