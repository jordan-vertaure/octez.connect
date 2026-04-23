import { spawnSync } from 'node:child_process'

import { getWorkspacePackages, topologicallySortWorkspaces } from './workspace-utils.mjs'

const [scriptName, ...flags] = process.argv.slice(2)

if (!scriptName) {
  throw new Error('Usage: node scripts/run-workspaces.mjs <script> [--topological]')
}

const topological = flags.includes('--topological')
const packages = topological ? topologicallySortWorkspaces(getWorkspacePackages()) : getWorkspacePackages()
const npmCommand = process.env.npm_execpath ? process.execPath : 'npm'
const npmArgsPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : []

for (const pkg of packages) {
  if (!pkg.manifest.scripts?.[scriptName]) {
    continue
  }

  const result = spawnSync(npmCommand, [...npmArgsPrefix, 'run', scriptName], {
    cwd: pkg.directory,
    stdio: 'inherit'
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
