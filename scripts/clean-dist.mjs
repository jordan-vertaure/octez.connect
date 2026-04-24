import { readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const packagesRoot = path.join(repoRoot, 'packages')

const packageDirs = readdirSync(packagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesRoot, entry.name))

for (const packageDir of packageDirs) {
  rmSync(path.join(packageDir, 'dist'), { recursive: true, force: true })
}

rmSync(path.join(repoRoot, 'dist'), { recursive: true, force: true })
rmSync(path.join(repoRoot, 'webpack_builds'), { recursive: true, force: true })

console.log(`Cleaned dist outputs in ${packageDirs.length} packages.`)
