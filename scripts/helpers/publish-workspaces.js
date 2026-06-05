'use strict'

const getPrereleaseTag = (version) => {
  const prerelease = version.split('-')[1]

  if (!prerelease) {
    return undefined
  }

  return prerelease.split('.')[0]
}

const hasExplicitTagArg = (extraArgs) =>
  extraArgs.some((arg, index) => {
    if (arg === '--tag') {
      return true
    }

    if (index > 0 && extraArgs[index - 1] === '--tag') {
      return true
    }

    return arg.startsWith('--tag=')
  })

const resolvePublishTag = ({ version, extraArgs, env }) => {
  if (hasExplicitTagArg(extraArgs)) {
    return undefined
  }

  return env.NPM_DIST_TAG ?? getPrereleaseTag(version)
}

// The set of {name, version} a release must publish (every non-private workspace).
const buildExpectedReleaseSet = (packages) =>
  packages
    .filter((pkg) => !(pkg.manifest && pkg.manifest.private))
    .map((pkg) => ({ name: pkg.manifest.name, version: pkg.manifest.version }))

// Given the expected release set and a resolver, return the entries whose exact
// `name@version` does not resolve on the registry. `resolveVersion(name, version)`
// must return the resolved version string, or null/undefined if unresolvable.
//
// This is the guard for #15: after a partial publish the registry can list an
// exact-pinned internal version (e.g. 5.0.0-beta.6) that no published tarball
// satisfies, so `npm`/`bun` installs of the meta-package fail. A release set is
// only valid once every member resolves to exactly its release version.
const findUnresolvableReleases = ({ expected, resolveVersion }) =>
  expected.filter(({ name, version }) => resolveVersion(name, version) !== version)

const resolvePublishCommand = ({ publishArgs, env, nodeExecPath }) => {
  const npmExecPath = env.npm_execpath

  if (npmExecPath) {
    return {
      command: nodeExecPath,
      args: [npmExecPath, ...publishArgs]
    }
  }

  return {
    command: 'npm',
    args: publishArgs
  }
}

module.exports = {
  buildExpectedReleaseSet,
  findUnresolvableReleases,
  getPrereleaseTag,
  hasExplicitTagArg,
  resolvePublishCommand,
  resolvePublishTag
}
