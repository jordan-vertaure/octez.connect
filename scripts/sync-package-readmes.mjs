import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const packagesRoot = path.join(repoRoot, 'packages')

const primaryPackages = new Set(['octez.connect-sdk', 'octez.connect-dapp', 'octez.connect-wallet'])
const addOnPackages = new Set([
  'octez.connect-blockchain-substrate',
  'octez.connect-blockchain-tezos',
  'octez.connect-blockchain-tezos-sapling'
])

const repoUrl = 'https://github.com/trilitech/octez.connect'
const airgapUrl = 'https://github.com/airgap-it/beacon-sdk'
const ecadUrl = 'https://github.com/ecadlabs/beacon-sdk-taquito-patches'

const packageDirs = [
  'octez.connect-blockchain-substrate',
  'octez.connect-blockchain-tezos',
  'octez.connect-blockchain-tezos-sapling',
  'octez.connect-core',
  'octez.connect-dapp',
  'octez.connect-sdk',
  'octez.connect-transport-matrix',
  'octez.connect-transport-postmessage',
  'octez.connect-transport-walletconnect',
  'octez.connect-types',
  'octez.connect-ui',
  'octez.connect-utils',
  'octez.connect-wallet'
]

const usageNote = (dirName) => {
  if (primaryPackages.has(dirName)) {
    return 'This is a primary package in the Trilitech-maintained octez.connect SDK line and may be installed directly.'
  }

  if (addOnPackages.has(dirName)) {
    return 'This is an add-on package in the Trilitech-maintained octez.connect SDK line. Most consumers get it transitively through higher-level octez.connect packages.'
  }

  if (dirName === 'octez.connect-types') {
    return 'This is a shared types package in the Trilitech-maintained octez.connect SDK line. Install it directly only when you need the octez.connect type surface itself.'
  }

  return 'This is a lower-level support package in the Trilitech-maintained octez.connect SDK line. Most consumers should install a higher-level package instead.'
}

const installBlock = (packageName, dirName) => {
  if (!primaryPackages.has(dirName)) {
    return ''
  }

  return `## Install

\`\`\`sh
npm install ${packageName}
\`\`\`
`
}

const recommendedEntryPoints = (dirName) => {
  if (primaryPackages.has(dirName)) {
    return ''
  }

  return `## Usually install instead

- \`@tezos-x/octez.connect-sdk\` for the general octez.connect SDK surface
- \`@tezos-x/octez.connect-dapp\` for dApp integrations
- \`@tezos-x/octez.connect-wallet\` for wallet integrations
`
}

const template = ({ packageName, description, dirName }) => `# \`${packageName}\`

${description}

${usageNote(dirName)}

${installBlock(packageName, dirName)}## Package provenance

This package is published from the Trilitech-maintained octez.connect repository:
[trilitech/octez.connect](${repoUrl})

- Original Beacon lineage: [airgap-it/beacon-sdk](${airgapUrl})
- External maintenance line Trilitech may selectively import from: [ecadlabs/beacon-sdk-taquito-patches](${ecadUrl})

${recommendedEntryPoints(dirName)}## Notes

- Trilitech publishes these packages under the \`@tezos-x/octez.connect-*\` scope
- Release notes, package policy, and the current package list live in the repository README
`

for (const dirName of packageDirs) {
  const packageDir = path.join(packagesRoot, dirName)
  const packageJson = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
  const readmePath = path.join(packageDir, 'README.md')

  mkdirSync(packageDir, { recursive: true })
  writeFileSync(
    readmePath,
    template({
      packageName: packageJson.name,
      description: packageJson.description,
      dirName
    }),
    'utf8'
  )
}

console.log(`Synced package READMEs for ${packageDirs.length} packages.`)
