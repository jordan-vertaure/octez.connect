import path from 'node:path'

import { readJson, repoRoot } from './workspace-utils.mjs'

const minimumVersions = {
  '@stablelib/ed25519': '2.1.0',
  'unstorage': '1.17.5',
  'h3': '1.15.9',
  'defu': '6.1.7',
  'picomatch': '2.3.2'
}

const compareSemver = (left, right) => {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10))
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10))

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index] ?? 0
    const rightPart = rightParts[index] ?? 0

    if (leftPart > rightPart) {
      return 1
    }

    if (leftPart < rightPart) {
      return -1
    }
  }

  return 0
}

const manifests = [
  readJson(path.join(repoRoot, 'packages', 'octez.connect-core', 'package.json')),
  readJson(path.join(repoRoot, 'packages', 'octez.connect-utils', 'package.json')),
  readJson(path.join(repoRoot, 'packages', 'octez.connect-transport-walletconnect', 'package.json'))
]

const lockfile = readJson(path.join(repoRoot, 'package-lock.json'))
const failures = []

const getResolvedEntries = (dependencyName) =>
  Object.entries(lockfile.packages ?? {})
    .filter(([packagePath]) => packagePath.endsWith(`node_modules/${dependencyName}`))
    .map(([packagePath, entry]) => ({ packagePath, version: entry?.version }))

const utilsManifest = manifests.find((manifest) => manifest.name === '@tezos-x/octez.connect-utils')
const coreManifest = manifests.find((manifest) => manifest.name === '@tezos-x/octez.connect-core')
const walletConnectTransportManifest = manifests.find(
  (manifest) => manifest.name === '@tezos-x/octez.connect-transport-walletconnect'
)

const declaredVersion = utilsManifest.dependencies?.['@stablelib/ed25519']

if (!declaredVersion) {
  failures.push('@tezos-x/octez.connect-utils is missing required dependency @stablelib/ed25519')
} else {
  const normalizedVersion = declaredVersion.replace(/^[^\d]*/, '')

  if (compareSemver(normalizedVersion, minimumVersions['@stablelib/ed25519']) < 0) {
    failures.push(
      `@tezos-x/octez.connect-utils declares @stablelib/ed25519@${declaredVersion}, expected at least ${minimumVersions['@stablelib/ed25519']}`
    )
  }
}

if (coreManifest.dependencies?.['@stablelib/ed25519']) {
  failures.push(
    '@tezos-x/octez.connect-core should consume ed25519 through @tezos-x/octez.connect-utils, not declare it directly'
  )
}

if (walletConnectTransportManifest.dependencies?.elliptic) {
  failures.push('@tezos-x/octez.connect-transport-walletconnect must not declare elliptic')
}

for (const [dependencyName, minimumVersion] of Object.entries(minimumVersions)) {
  const resolvedEntries = getResolvedEntries(dependencyName)

  if (resolvedEntries.length === 0) {
    failures.push(`package-lock.json is missing resolved entry for ${dependencyName}`)
    continue
  }

  for (const entry of resolvedEntries) {
    if (!entry.version || compareSemver(entry.version, minimumVersion) < 0) {
      failures.push(
        `package-lock.json resolves ${dependencyName}@${entry.version ?? 'missing'} at ${entry.packagePath}, expected at least ${minimumVersion}`
      )
    }
  }
}

if (failures.length > 0) {
  console.error('Security dependency check failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Security-sensitive dependency baselines are satisfied.')
