# Quickstart: Validating the Fixes & Delivering to Both Branches

**Feature**: `001-dapp-bugfixes-upstream-sync` | **Date**: 2026-06-04

## Prerequisites

- Node.js >= 22.12.0, npm >= 11.0.0 (`./scripts/npm11.sh --version`)
- Clean checkout of `trilitech/octez.connect`

## Pre-PR validation loop (run on EACH branch, per CONTRIBUTING.md / Principle V)

```bash
npm ci
npm run check:versions   # Principle III — workspace versions in sync
npm run build
npm run test             # unit incl. the new regression tests
npm run e2e:smoke        # PR gate (Playwright, real transports, @extended excluded)
```

Before the **release** that ships #32/#33 on a line, also run the extended suite (real transports):

```bash
npm run e2e              # required when transport/pairing/payload handlers change
```

## Per-issue validation

### #33 — payload-less message does not crash
```bash
# Unit: handleResponse with a V3-versioned message and no .message payload
npm run test -w @tezos-x/octez.connect-dapp
# Expect: returns without throwing, no unhandled rejection, no state mutation.
```

### #30 — getting-started flow + UI Map
```bash
# Unit: useWallets builds a Map from a list containing `undefined` without throwing.
npm run test -w @tezos-x/octez.connect-ui
# Manual: run the verbatim getting-started snippet WITHOUT enableMetrics → pairing UI renders, no runtime error.
```

### #32 — WalletConnect opt-in + Firefox pairing
```bash
# Unit: new DAppClient({ name, network }) (no walletConnectOptions) builds no WC transport;
#       disableWalletConnect:true is honored.
npm run test -w @tezos-x/octez.connect-dapp
# Targeted Firefox check (content-script pairing cannot run in the standard e2e):
npx playwright test e2e --project=firefox --grep @pairing   # or documented manual MV3 repro
# Expect: web-wallet (Kukai) pairing action renders & is actionable; Temple still pairs; Chrome unchanged.
```

### #15 — published packages resolve
`scripts/publish-workspaces.mjs` now **verifies the release set automatically** after
publishing: it resolves every non-private `@tezos-x/octez.connect-*@<version>` against
the registry (with bounded retries for propagation lag) and `exit 1`s naming any package
that does not resolve — so a partial publish can never finalize a registry state where an
exact-pinned internal dependency is unresolvable.
```bash
# Automated gate (part of `npm run publish:packages`):
#   "Verified N published package(s) resolve on the registry."  → exit 0
#   "Release verification failed: ... @tezos-x/octez.connect-dapp@<version>" → exit 1

# Manual clean-room confirmation (belt-and-suspenders, run from an empty dir):
npm view @tezos-x/octez.connect-sdk@<version> dependencies   # all internal pins exist as tarballs
npm install @tezos-x/octez.connect-sdk@<version>             # exit 0
bun add @tezos-x/octez.connect-sdk@<version>                 # exit 0
```

## Upstream delta verification (SC-005)
```bash
# Enumerate candidate upstream commits newer than our last port (anchor: taquito-patches HEAD):
gh api "repos/ecadlabs/beacon-sdk-taquito-patches/commits?sha=taquito-patches&per_page=100" \
  --jq '.[] | "\(.sha[0:9])  \(.commit.author.date[0:10])  \(.commit.message|split("\n")[0])"'
# For each: probe both lines by content, classify (already-present / import / exclude-with-reason),
# and record in the Upstream Delta Record (data-model.md E6) + the PR description.
```

## Dual-branch delivery (the user's ask)

```bash
# PR #A → master (primary implementation; already on this branch)
git switch 001-dapp-bugfixes-upstream-sync
# ...commit each fix + each imported upstream commit as a focused commit with a provenance trailer...
gh pr create --base master --head 001-dapp-bugfixes-upstream-sync \
  --title "Fix #33/#32/#30/#15 + import recent upstream delta" \
  --body "Companion PR for 4.8-stable: <link>. Imported upstream SHAs + exclusions: <table>."

# PR #B → 4.8-stable (backport)
git fetch origin
git switch -c 001-dapp-bugfixes-upstream-sync-4.8 origin/4.8-stable
git cherry-pick <fix commits in order>          # adapt on conflict; keep subject + provenance trailer
npm ci && npm run check:versions && npm run build && npm run test && npm run e2e:smoke
gh pr create --base 4.8-stable --head 001-dapp-bugfixes-upstream-sync-4.8 \
  --title "[4.8-stable] Fix #33/#32/#30/#15 + import recent upstream delta" \
  --body "Companion PR for master: <link>. Backport of the same logical changes, adapted for 4.8.x."
```

**Versioning** (separate commit per line): `5.0.0-beta.7` on master, `4.8.5` on 4.8-stable, via
`npm version <x.y.z> --no-git-tag-version && npm run version:sync && npm install --package-lock-only --ignore-scripts`.

## Done criteria
- Both PRs green on CI (`lint:new`, `check:versions`, `build`, `test`, `e2e:smoke`).
- Extended `e2e` run linked on each PR before release (transport/pairing changes).
- Delivery Matrix (data-model.md E7) fully checked; Upstream Delta Record complete with zero unclassified commits.
- Each issue verifiable as resolved against a live test network from a distributable build (SC-008).
