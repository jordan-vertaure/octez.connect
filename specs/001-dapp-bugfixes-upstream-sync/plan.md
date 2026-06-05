# Implementation Plan: dApp/SDK Bug Fixes & Upstream Patch Parity

**Branch**: `001-dapp-bugfixes-upstream-sync` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-dapp-bugfixes-upstream-sync/spec.md`

## Summary

Fix four confirmed defects in the `@tezos-x/octez.connect-*` SDK and import the recent, not-yet-merged tail of upstream `ecadlabs/beacon-sdk-taquito-patches` commits — delivering all of it on **two release lines**: `master` (`5.0.0-beta.6`) and `4.8-stable` (`4.8.4`).

The four fixes are small, localized, and confirmed against the current source:

- **#33** — `DAppClient.handleResponse` dereferences an undefined payload for V3-versioned messages with no `.message`; add an early-return guard (`DAppClient.ts` master:325 / 4.8-stable:312).
- **#30** — `octez.connect-ui` `useWallets.tsx:177` builds `new Map(wallets.map(...))` from a list that can contain `undefined`, throwing "Iterator value undefined is not an entry object"; filter before construction. Also make the documented getting-started flow work without an explicit `enableMetrics` flag.
- **#32** — Make the WalletConnect transport opt-in (additive `disableWalletConnect` option + don't build it when no `walletConnectOptions`), and make pairing peer-info consumable across a Firefox content-script compartment.
- **#15** — `publish-workspaces.mjs` can leave the registry with an exact-pinned internal version (e.g. `5.0.0-beta.6`) listed but unresolvable after a partial publish; make publishing atomic/verified so a release set always fully resolves under `npm` and `bun`.

The upstream import is the **content-determined delta** beyond the already-merged `*-ecadport` work, applied as narrowly-scoped, provenance-tagged commits per Constitution Principle II.

**Technical approach**: implement once on the `master`-based feature branch, then port each discrete commit to a `4.8-stable`-based branch, adapting where code diverges. Ship as **two pull requests** (one per base branch), each independently CI-gated. See [Dual-Branch Delivery & PR Strategy](#dual-branch-delivery--pr-strategy).

## Technical Context

**Language/Version**: TypeScript 5.8.x; Node.js >= 22.12.0, npm >= 11.0.0 (enforced by `engines`/`packageManager`).

**Primary Dependencies**: `@walletconnect/sign-client` ^2.23.x (pinned 2.18.0 upstream — evaluate in delta), Matrix P2P client, Playwright (e2e), React (in `octez.connect-ui`).

**Storage**: Browser `localStorage` / SDK `StorageManager` backends (relevant to #30 metrics flag and the upstream storage-normalization delta).

**Testing**: `npm run test` (unit, per-workspace via `scripts/run-workspaces.mjs`), `npm run e2e:smoke` (Playwright `--grep-invert @extended`, the PR gate), `npm run e2e` (extended, release gate for transport/pairing/payload changes — applies to #32/#33).

**Target Platform**: Evergreen browsers (Chrome, Firefox, Safari latest) + Node 22+; #32 specifically targets Firefox MV3 content-script compartments.

**Project Type**: Multi-package TypeScript monorepo (`workspaces: packages/*`), published as a coordinated set of `@tezos-x/octez.connect-*` packages with exact-pinned internal dependencies.

**Performance Goals**: No regression to pairing/connect latency; fixes are guards/filters with negligible cost.

**Constraints**: TZIP-10 v2 wire + public-type backward compatibility (Principle I) — every option/behavior change MUST be additive; workspace version synchrony (Principle III); trusted-publisher-only release (Principle IV).

**Scale/Scope**: 4 localized bug fixes + an N-commit upstream delta (N determined during research, anchored at `taquito-patches` HEAD / `4.8.4-ecad`), delivered across 2 branches = effectively 2 coordinated PRs.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` v1.0.0.*

| Principle | Applies? | Plan compliance |
|-----------|----------|-----------------|
| **I. TZIP-10 Backward-Compatible SDK Surface** | Yes | #32's `disableWalletConnect` is a new **optional** option (absence preserves current behavior). #33/#30 guards only drop/skip malformed input — valid messages behave byte-for-byte as before. No public type is changed in a breaking way; any new option member is additive. |
| **II. Upstream Provenance & Narrow Ports (NON-NEGOTIABLE)** | Yes | Each imported upstream commit is a **separate, narrowly-scoped** commit recording the source SHA on `taquito-patches` + a one-line reason. **No bulk sync.** Delta is content-determined (research.md) because prior ecadports were rebranded. |
| **III. Workspace Versioning Synchrony** | Yes | Any version bump uses `npm version --no-git-tag-version` → `version:sync` → lockfile refresh; `check:versions` is in CI on both PRs. #15's fix directly strengthens this invariant at publish time. |
| **IV. Trusted Publisher Release Pipeline (NON-NEGOTIABLE)** | Yes | #15 fix lives in `publish-workspaces.mjs`/release tooling; no long-lived tokens introduced; prereleases keep the `beta` dist-tag, `4.8-stable` releases keep their tag. Publishing remains tag-triggered via `release.yml`. |
| **V. Test Discipline: Smoke Gate + Real Transports** | Yes | Each issue gets a unit regression test (fails pre-fix, passes post-fix). #32/#33 touch pairing/transport handlers → **extended e2e (`npm run e2e`) against real transports is required before the release** that ships them, per the merge gate. |

**Result**: PASS. One governance nuance requires justification (PRs targeting `4.8-stable` rather than only `master`) — documented in [Complexity Tracking](#complexity-tracking).

## Project Structure

### Documentation (this feature)

```text
specs/001-dapp-bugfixes-upstream-sync/
├── plan.md              # This file
├── research.md          # Phase 0: delta method, per-issue fix approach, backport mechanics
├── data-model.md        # Phase 1: message guard, delta record, branch/version matrix
├── quickstart.md        # Phase 1: per-issue validation + dual-branch pre-PR loop
├── contracts/
│   └── public-surface.md  # Behavioral contracts that MUST NOT break + additive option
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/
├── octez.connect-dapp/
│   └── src/dapp-client/
│       ├── DAppClient.ts          # #33 guard (handleResponse); #32 WC opt-in + PAIR_INIT peer-info; #30 enableMetrics default
│       └── DAppClientOptions.ts   # #32 additive `disableWalletConnect?` option
├── octez.connect-ui/
│   └── src/ui/alert/hooks/
│       └── useWallets.tsx         # #30 filter undefined before `new Map(...)`
├── octez.connect-core/            # upstream delta: storage/account managers (verify already-merged vs missing)
├── octez.connect-transport-walletconnect/  # upstream delta: WC lifecycle/single-flight/listener cleanup
└── octez.connect-transport-matrix/          # upstream delta: broadcast/relay hardening

scripts/
├── publish-workspaces.mjs         # #15 atomic/verified publish
├── check-workspace-version.mjs    # Principle III gate (referenced)
└── set-workspace-version.mjs      # version:sync

e2e/                               # extended e2e for #32/#33 (real transports)
packages/*/{src/**/__tests__,test}/ # unit regression tests per issue
```

**Structure Decision**: Existing multi-package monorepo; no new packages. Changes are confined to the files above plus their colocated tests. The `disableWalletConnect` option is the only public-surface addition and is strictly additive.

## Dual-Branch Delivery & PR Strategy

> This section answers the user's explicit ask: *how the change is delivered as PRs to both `4.8-stable` and `master`.*

### Why two PRs (not one)

`master` (`5.0.0-beta.6`) and `4.8-stable` (`4.8.4`) are divergent histories with different base code and version constants. A single PR cannot target two bases. The constitution's default ("PRs target `master`") is extended here to a **maintenance backport** because the spec (FR-019) and the user require both lines; `4.8-stable` is the LTS line still consumed by `4.8.x` integrators (issues #30/#33 were reported against `4.8.4`).

### Branch topology

```text
origin/master (5.0.0-beta.6)
   └── 001-dapp-bugfixes-upstream-sync          ← PR #A  base: master
origin/4.8-stable (4.8.4)
   └── 001-dapp-bugfixes-upstream-sync-4.8       ← PR #B  base: 4.8-stable
```

- The existing `001-dapp-bugfixes-upstream-sync` branch (off `master`) hosts the primary implementation and **PR #A → `master`**.
- A sibling branch `001-dapp-bugfixes-upstream-sync-4.8` is created from `origin/4.8-stable` and hosts **PR #B → `4.8-stable`**.

### Commit hygiene for portability

Implement each fix and each upstream-delta item as **one focused commit** so it can be `git cherry-pick`-ed between the two feature branches. Where a commit doesn't apply cleanly (divergent surrounding code or version constants), adapt by hand and keep the same commit subject + provenance trailer so the two PRs remain auditable as the same logical change. Commit-message provenance trailer for every upstream port (Principle II):

```text
fix(wc): <subject>

Port of ecadlabs/beacon-sdk-taquito-patches@<sha> (<upstream subject>).
Reason: <one line>.
```

### Order of operations

1. **Research the delta first** (Phase 0 / research.md) so the upstream-import commit list is known before branching the second line.
2. Implement #33, #30, #32, #15 + the delta on `001-...` (master base). Open **PR #A → master** as draft early so CI runs.
3. Create `001-...-4.8` from `origin/4.8-stable`; cherry-pick the commits in the same order; resolve divergences (e.g. `4.8.x` lacks 5.0.0 refactors). Open **PR #B → 4.8-stable**.
4. Keep the two PRs cross-linked in their descriptions ("companion: PR #A/#B") and list, per PR, which upstream SHAs were imported and which were excluded-with-reason (SC-005).

### Per-PR gates (identical, base-agnostic)

CI (`.github/workflows/ci.yml`) triggers on `pull_request:` for **any** base, so both PRs run: `lint:new` (gated on the PR base), `check:versions`, `build`, `test`, and `e2e:smoke`. Before the **release** that ships #32/#33 on either line, run the **extended** `npm run e2e` against real transports (Principle V merge gate). Each PR must be validated locally through the documented loop (`npm ci && npm run check:versions && npm run build && npm run test && npm run e2e:smoke`) and say so in its description.

### Versioning & release per line

- `master`: bump within the `5.0.0-beta` series (e.g. `5.0.0-beta.7`) via `npm version --no-git-tag-version` + `version:sync`; publishes under the `beta` dist-tag.
- `4.8-stable`: bump the patch (`4.8.5`) the same way; publishes under its stable line tag.
- Version bumps are kept in their **own commit** (not mixed with fixes) so the fix commits stay cleanly portable across lines. The #15 publish-atomicity fix is shared tooling and ports to both.

### Risks specific to dual delivery

- **Drift between PRs** — mitigated by identical commit subjects + provenance trailers and a per-PR import/exclusion table.
- **Divergent code defeating cherry-pick** — expected for 5.0.0-only refactors; the fix is re-expressed for `4.8.x` and verified by the same regression test ported to that line.
- **Partial merge** (one line merges, the other lags) — acceptable; each PR is independently shippable, and FR-019 is only fully satisfied when both merge. Track as a release checklist item.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| PR targets `4.8-stable` in addition to `master` (constitution default is "PRs target `master`") | FR-019 + user requirement: defects #30/#33 were reported against `4.8.4`; `4.8-stable` is the LTS line still in use, so fixes must land there too | Master-only delivery would leave reported, in-the-wild `4.8.x` crashes unfixed for current integrators; waiting for them to migrate to `5.0.0-beta` is not acceptable for P1 crashes |
| Two coordinated feature branches/PRs for one feature | Divergent base histories cannot share a single PR | A single branch cannot target two bases; merging master→4.8-stable wholesale would violate Principle II (bulk sync) and drag unrelated 5.0.0 changes into the stable line |
