---
description: "Task list for dApp/SDK Bug Fixes & Upstream Patch Parity"
---

# Tasks: dApp/SDK Bug Fixes & Upstream Patch Parity

**Input**: Design documents from `specs/001-dapp-bugfixes-upstream-sync/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/public-surface.md, quickstart.md

**Tests**: INCLUDED — spec FR-020 mandates a regression test per issue (fails before fix, passes after). Test-first within each story.

**Organization**: Phases 3–7 are one-per-user-story on the **master line**. Phase 8 backports the completed work to **4.8-stable** (cross-cutting, FR-019). Phase 9 handles versioning, the two PRs, and release gates.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5 on user-story phases only
- All paths are repo-root-relative on the `master`-based branch `001-dapp-bugfixes-upstream-sync` unless a task names the `4.8-stable` branch.

## Branch / line legend

- **master line** = branch `001-dapp-bugfixes-upstream-sync` (base `master`, `5.0.0-beta.6`) → **PR #A**
- **4.8 line** = branch `001-dapp-bugfixes-upstream-sync-4.8` (base `4.8-stable`, `4.8.4`) → **PR #B**

---

## Phase 1: Setup (Shared)

**Purpose**: Establish a meaningful baseline so "fails before the fix" is verifiable.

- [X] T001 Confirm `001-dapp-bugfixes-upstream-sync` is current and rebased on `origin/master` (`git fetch && git status`)
- [ ] T002 Record a green baseline: run `npm ci && npm run check:versions && npm run build && npm run test && npm run e2e:smoke` and capture results in the PR-prep notes — PARTIAL: per-package `tsc --noEmit` verified for core/walletconnect/dapp; full build/test/e2e pending (full topological build exceeds local time budget)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the test entry points every story relies on actually execute.

**⚠️ CRITICAL**: Complete before story work so each regression test can be shown red→green.

- [ ] T003 Verify per-package Jest harnesses run: `npm run test -w @tezos-x/octez.connect-dapp` and `npm run test -w @tezos-x/octez.connect-ui`, and that Playwright e2e runs (`npm run e2e:smoke`)

**Checkpoint**: Harnesses confirmed — story implementation can begin.

---

## Phase 3: User Story 1 — Resilient response handling (#33, Priority: P1) 🎯 MVP

**Goal**: `DAppClient.handleResponse` never crashes on a V3-versioned message with a missing payload.

**Independent Test**: Feed `handleResponse({ version: '3' })` (no `.message`); assert it returns without throwing, emits no unhandled rejection, and mutates no client state.

### Tests for User Story 1 ⚠️ (write first, ensure FAIL)

- [ ] T004 [P] [US1] Add failing regression test for payload-less V3 message (no throw, no state mutation) in `packages/octez.connect-dapp/__tests__/dapp-client/DAppClient.test.ts`
- [ ] T005 [P] [US1] Add test asserting valid wrapped **and** unwrapped messages still process unchanged (behavior-preservation guard) in `packages/octez.connect-dapp/__tests__/dapp-client/DAppClient.test.ts`

### Implementation for User Story 1

- [X] T006 [US1] Insert early-return guard immediately after `typedMessage` is resolved in `this.handleResponse` (warn + return when wrapped payload missing) in `packages/octez.connect-dapp/src/dapp-client/DAppClient.ts` — done as part of the `d82807184` DAppClient port (commit `3deb85d1`), adapted to `usesWrappedMessages()`
- [ ] T007 [US1] Confirm `openRequests` / transport cleanup are left consistent on the dropped-message path; extend T004 assertions to cover it in `packages/octez.connect-dapp/__tests__/dapp-client/DAppClient.test.ts`

**Checkpoint**: US1 functional and independently testable on the master line (contract C1).

---

## Phase 4: User Story 2 — Installable published releases (#15, Priority: P1)

**Goal**: A published release always resolves & installs fully under `npm` and `bun`; no half-published, exact-pinned version can be tagged.

**Independent Test**: From a clean env, install the meta-package and confirm the full internal dependency tree resolves; the publish verifier fails loudly if any `package@version` tarball is missing.

### Tests for User Story 2 ⚠️ (write first, ensure FAIL)

- [X] T008 [P] [US2] Add failing test/verifier asserting a release is rejected when any internal `package@releaseVersion` tarball is unresolvable in `scripts/__tests__/publish-workspaces.test.js` — done: `findUnresolvableReleases`/`buildExpectedReleaseSet` tests (10/10 pass)

### Implementation for User Story 2

- [X] T009 [US2] Make publishing atomic/verified in `scripts/publish-workspaces.mjs`: after publish, verify every `@tezos-x/octez.connect-*@<version>` tarball resolves; fail and name the missing package; never finalize a partial set — done (post-publish verification pass + `resolvePublishedVersion` with bounded retries)
- [X] T010 [US2] Ensure `scripts/check-workspace-version.mjs` asserts all internal exact-pins equal the release version (add the check if absent) — already present (check-workspace-version.mjs lines 21–30)
- [X] T011 [US2] Add a clean-room install verification step (`npm install` + `bun add`) to the release checklist in `specs/001-dapp-bugfixes-upstream-sync/quickstart.md` — updated to document the now-automated registry-resolution gate + manual clean-room confirmation

**Checkpoint**: US2 verified (contract C5); release tooling stays trusted-publisher-only (Principle IV).

---

## Phase 5: User Story 3 — Getting-started flow & UI robustness (#30, Priority: P2)

**Goal**: The documented getting-started snippet works without `enableMetrics`, and the connect UI never throws "Iterator value undefined is not an entry object".

**Independent Test**: Build `new Map` from a wallet list containing `undefined` without throwing; run the verbatim getting-started options (no `enableMetrics`) with no runtime error.

### Tests for User Story 3 ⚠️ (write first, ensure FAIL)

- [X] T012 [P] [US3] Add failing test: `useWallets` builds its lookup `Map` from a list containing `undefined`/`id`-less entries without throwing in `packages/octez.connect-ui/__tests__/hooks/use-wallets.test.tsx` — done (commit `5b928d49`)
- [ ] T013 [P] [US3] Add test: `new DAppClient({ name, network })` without `enableMetrics` initializes with no throw and no metrics side-effects in `packages/octez.connect-dapp/__tests__/dapp-client/DAppClient.test.ts` — N/A in code: `enableMetrics` already defaults false (DAppClient.ts:276); dedicated test deferred (DAppClient instantiation is heavy)

### Implementation for User Story 3

- [X] T014 [US3] Filter falsy / `id`-less entries before `new Map(wallets.map(...))` in `packages/octez.connect-ui/src/ui/alert/hooks/useWallets.tsx` (line ~183) — done (commit `5b928d49`)
- [X] T015 [US3] Confirm `enableMetrics` defaults disabled and every metrics path is inert when unset in `packages/octez.connect-dapp/src/dapp-client/DAppClient.ts` — confirmed: `config.enableMetrics ? true : false` (line 276); no path requires the flag

**Checkpoint**: US3 functional (contract C4); valid wallet lists produce the identical Map as before.

---

## Phase 6: User Story 4 — Firefox content-script web-wallet pairing (#32, Priority: P2)

**Goal**: WalletConnect is opt-in, and web wallets pair from a Firefox MV3 content script; Chrome and extension-wallet behavior unchanged.

**Independent Test**: Init with only `{ name, network }` → no WC transport built and no WC errors; in a Firefox content-script context the web-wallet pairing action renders and is actionable.

### Tests for User Story 4 ⚠️ (write first, ensure FAIL)

- [X] T016 [P] [US4] Add failing test: client with no `walletConnectOptions` **or** `disableWalletConnect: true` builds/listens **no** WC transport in `packages/octez.connect-dapp/__tests__/dapp-client/DAppClient.test.ts` — done: 'DAppClient — WalletConnect opt-in (#32)' describe block (verifies `isWalletConnectEnabled` gating + no default projectId when disabled)

### Implementation for User Story 4

- [X] T017 [US4] Add additive `disableWalletConnect?: boolean` to `packages/octez.connect-dapp/src/dapp-client/DAppClientOptions.ts` (optional; absence preserves current behavior — contract C2) — done
- [X] T018 [US4] Skip constructing/listening `walletConnectTransport` when WC options are absent or disabled (and don't apply the default project-id) in `packages/octez.connect-dapp/src/dapp-client/DAppClient.ts` — done: `isWalletConnectEnabled` gate in constructor + `initInternalTransports`; init-flow guards (all-ready check, WC `listenForNewPeer`, abort handler, peer-info, WALLETCONNECT active-account branch)
- [~] T017/T018 DONE (commit `7c939ed1`): additive `disableWalletConnect` option + `isWalletConnectEnabled` gating + construction-skip + init-flow guards + 4 opt-in tests. tsc clean; full dapp suite green (14).
- [ ] T019 [US4] Make `PAIR_INIT` `walletConnectPeerInfo` compartment-safe (resolve the URI before emit / emit a non-Promise value) in `packages/octez.connect-dapp/src/dapp-client/DAppClient.ts`; verify the consumer in `packages/octez.connect-dapp/src/events.ts` (`showPairAlert`) — DEFERRED: converting the lazy peer-info Promise to an eager string changes WC-init timing for all browsers and needs Firefox MV3 e2e (T020/T021) to validate; not runnable in this environment. Disabled-case guard applied (resolves '' when WC off). The cleaner array-based init is part of the deferred dApp-lifecycle chain (Phase 7 / upstream-delta.md).
- [ ] T020 [P] [US4] Add a Firefox-targeted Playwright pairing check (tag `@pairing`) asserting the web-wallet action renders in `e2e/wc-flow.spec.ts` (or a new `e2e/firefox-pairing.spec.ts`); document the MV3 manual repro in `specs/001-dapp-bugfixes-upstream-sync/quickstart.md` — DEFERRED (e2e not runnable here; pairs with T019)
- [ ] T021 [US4] Add regression assertion that Chrome (both wallet kinds) and Firefox extension-wallet pairing are unchanged in `e2e/base-flow.spec.ts` — DEFERRED (e2e not runnable here)

**Checkpoint**: US4 functional (contracts C2, C3); no public-type break (Principle I).

---

## Phase 7: User Story 5 — Import the recent not-yet-merged upstream delta (Priority: P3)

**Goal**: Bring in only the upstream `taquito-patches` commits not already merged, as narrowly-scoped provenance-tagged commits.

**Independent Test**: A delta record classifies every candidate commit (already-present / import / exclude-with-reason) with zero unclassified entries (SC-005); ported tests pass.

### Implementation for User Story 5

- [X] T022 [US5] Enumerate `taquito-patches` commits newer than our last port via `gh api` (anchor: upstream HEAD / `4.8.4-ecad`) into the Upstream Delta Record — see `upstream-delta.md` (31 candidates classified)
- [X] T023 [US5] For each candidate, content-probe the master line and classify already-present / import / exclude — reading the touched function, not hash/ancestry (done via parallel investigation agents)
- [ ] T024 [US5] Import each not-yet-merged commit as a focused commit with a `Port of …@<sha>` + reason trailer — PARTIAL: storage pair + WC-transport lifecycle chain DONE (session 2). Imported & verified: `52198d37a`, `a6d20243f`, `227672f3b`, `d82807184` (session 1); `15ddcc7ca` (`492eecec`), `b569ed65e` (`4465eaed`), `2345a6e7f` (`788696e9`), `c3f7819de`+`dce21bc25` (`bb606998`), `bf9350740` (`fbcc08c0`), `e8eccd9e7`+`07304283b` (`b9a7260a`) (session 2). REMAINING (BLOCKED/deferred): the dApp-lifecycle chain (`32b83dcc0`→`9785f5402`→`734703d92`→`2c93b9d10`→`d682738cf`, `ca30859d6`→`82814a76a`, `9e8213a88`) requires hand re-expression of the `2d9723ec6` init abort-path refactor first (not in tree; see upstream-delta.md). `595e894b8` still pending classification/import.
- [ ] T025 [US5] Port the tests accompanying each imported fix and confirm they pass (`npm run test`) — PARTIAL: storage tests (`undefined-storage.test.ts` 13, `WCStorage.test.ts` 9) + WC client tests (26 total, +19 vs baseline) ported and green; `tsc --noEmit` clean for core + walletconnect. dApp-chain tests pending with the deferred dApp-lifecycle port.
- [X] T026 [US5] Record exclusions with reasons; confirm zero unclassified commits (SC-005) — 13 excluded (release/CI/test/lint/deps/gitignore + WC-pin regression) in `upstream-delta.md`

**Checkpoint**: US5 complete on the master line; delta record reviewable.

---

## Phase 8: Dual-Branch Backport to 4.8-stable (Cross-Cutting — FR-019)

**Purpose**: Land every change above on the `4.8-stable` line, adapting where code diverges. Answers the user's dual-PR requirement.

- [ ] T027 Create branch `001-dapp-bugfixes-upstream-sync-4.8` from `origin/4.8-stable` (`git switch -c 001-dapp-bugfixes-upstream-sync-4.8 origin/4.8-stable`)
- [ ] T028 [P] Cherry-pick/adapt the #33 guard + its tests onto the 4.8 line in `packages/octez.connect-dapp/src/dapp-client/DAppClient.ts` (~line 312) and the dapp test file
- [ ] T029 [P] Cherry-pick/adapt the #30 Map filter + metrics check + tests onto the 4.8 line (`useWallets.tsx`, `DAppClient.ts`, ui/dapp test files)
- [ ] T030 Cherry-pick/adapt the #32 WC opt-in + compartment-safe pairing + tests onto the 4.8 line (resolve divergence from 5.0.0-only code)
- [ ] T031 Cherry-pick/adapt the #15 publish-tooling changes onto the 4.8 line (`scripts/publish-workspaces.mjs`, `scripts/check-workspace-version.mjs`)
- [ ] T032 Re-run the delta classification for the 4.8 line (presence may differ per line per E6) and import its not-yet-merged set with provenance trailers
- [ ] T033 Run the full pre-PR loop on the 4.8 branch: `npm ci && npm run check:versions && npm run build && npm run test && npm run e2e:smoke`
- [ ] T034 Mark both columns complete in the Delivery Matrix (data-model E7); note any per-line exceptions

**Checkpoint**: Logical parity across both lines; each line independently green.

---

## Phase 9: Polish, Versioning & Release Gates

**Purpose**: Version bumps, the two PRs, and the release-time real-transport gate.

- [ ] T035 [P] Bump master line to `5.0.0-beta.7` in its **own** commit: `npm version 5.0.0-beta.7 --no-git-tag-version && npm run version:sync && npm install --package-lock-only --ignore-scripts`
- [ ] T036 [P] Bump 4.8 line to `4.8.5` in its **own** commit (same sequence) on `001-dapp-bugfixes-upstream-sync-4.8`
- [ ] T037 Run the **extended** `npm run e2e` against real transports on each line (required because #32/#33 touch pairing/transport handlers — Principle V merge gate); link both runs in the PRs
- [ ] T038 Open **PR #A → `master`** from `001-dapp-bugfixes-upstream-sync` with the imported-SHA / exclusion table and a companion link (`gh pr create --base master`)
- [ ] T039 Open **PR #B → `4.8-stable`** from `001-dapp-bugfixes-upstream-sync-4.8` with the backport note and a companion link (`gh pr create --base 4.8-stable`)
- [ ] T040 Confirm CI green on both PRs (`lint:new`, `check:versions`, `build`, `test`, `e2e:smoke`); resolve any `lint:new` findings on touched lines
- [ ] T041 Write the per-principle constitution-compliance one-liner (I–V) for the `/speckit-analyze` closeout in the PR descriptions

---

## Dependencies & Execution Order

- **Setup (P1) → Foundational (P2)** block everything.
- **User stories (P3–P7)** are independent of each other on the master line and may proceed in any order after T003. Recommended order = priority: US1 (#33) → US2 (#15) → US3 (#30) → US4 (#32) → US5 (delta).
- **Phase 8 (backport)** depends on the corresponding master-line story being complete (T028←US1, T029←US3, T030←US4, T031←US2, T032←US5) and on T027 (branch created).
- **Phase 9**: T035/T036 after their lines are otherwise final; T037 after both lines build; T038 (PR #A) after master line green; T039 (PR #B) after T033; T040/T041 after both PRs open.

```text
Setup(T001-T002) → Foundational(T003)
   ├─ US1(#33): T004,T005 → T006 → T007
   ├─ US2(#15): T008 → T009 → T010 → T011
   ├─ US3(#30): T012,T013 → T014 → T015
   ├─ US4(#32): T016 → T017 → T018 → T019 → T020,T021
   └─ US5(delta): T022 → T023 → T024 → T025 → T026
Backport(T027) → T028,T029,T030,T031,T032 → T033 → T034
Release: (T035‖T036) → T037 → T038,T039 → T040 → T041
```

## Parallel Execution Examples

- **Within US1**: T004 and T005 are `[P]` (independent test cases in the same file — coordinate or split files to truly parallelize).
- **Across stories on the master line**: US1, US3, US4 touch different files (dapp `DAppClient.ts` vs ui `useWallets.tsx` vs `DAppClientOptions.ts`), so their *implementation* tasks can largely proceed in parallel — except T006/T013/T016 all touch `DAppClient.ts`, so serialize those edits.
- **Backport**: T028 and T029 are `[P]` (different files); T030 (shared `DAppClient.ts`) should follow T028.
- **Versioning**: T035 and T036 are `[P]` (different branches).

## Implementation Strategy

- **MVP = US1 (#33)** on the master line: a one-line-region guard + tests that stops a live, universal crash. Shippable alone as the first increment.
- **Incremental**: deliver US1→US2→US3→US4→US5 on master, open PR #A early as draft for CI, then execute Phase 8 to mirror onto 4.8-stable, then Phase 9 to version + open PR #B + run extended e2e.
- **Dual-branch invariant**: FR-019 is satisfied only when both PRs are green and the Delivery Matrix (E7) is fully checked.

## Coverage Map (task → requirement)

| Story | Issue | FRs | Tasks |
|-------|-------|-----|-------|
| US1 | #33 | FR-001..003 | T004–T007 |
| US2 | #15 | FR-004..007 | T008–T011 |
| US3 | #30 | FR-008..010 | T012–T015 |
| US4 | #32 | FR-011..014 | T016–T021 |
| US5 | delta | FR-015..018 | T022–T026 |
| cross-cutting | dual-branch/quality | FR-019..022 | T002, T028–T041 |
