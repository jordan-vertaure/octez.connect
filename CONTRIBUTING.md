# Contributing

This repository is the Trilitech-maintained octez.connect package line published
under the `@tezos-x/octez.connect-*` scope.

## Ground rules

- Open a pull request against `4.8.4`, do not push feature work directly to the
  branch.
- Keep changes scoped and explain the user-visible impact.
- If you port behavior from a published upstream release (e.g.
  `ecadlabs/beacon-sdk-taquito-patches` or `airgap-it/beacon-sdk`) or another
  external source, record that provenance in the commit message and pull request.
- Prefer targeted fixes and tests over bulk syncs from external repos.

## Local workflow

```bash
npm ci
npm run check:versions
npm run build
npm run test
npm run e2e:smoke
```

Use `npm run e2e` when you need the full suite, including the longer reconnect
scenarios that are not part of the required CI smoke gate.

## Versioning

The workspace root version is the source of truth for the published package
version. Before release, synchronize every workspace package and the Beacon
runtime constant with:

```bash
npm version 4.8.N --no-git-tag-version
npm run version:sync
npm install --package-lock-only --ignore-scripts
```

## Trusted Publisher releases

Releases are published from GitHub Actions using npm Trusted Publishers. The npm
package settings must point at `.github/workflows/release.yml` in this repo.
Avoid introducing long-lived npm publish tokens back into the workflow.
Prerelease versions publish under the prerelease identifier as the npm dist-tag,
for example `4.8.4-beta.1` publishes with the `beta` tag.
