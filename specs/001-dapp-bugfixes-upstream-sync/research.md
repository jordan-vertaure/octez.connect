# Phase 0 Research: dApp/SDK Bug Fixes & Upstream Patch Parity

**Feature**: `001-dapp-bugfixes-upstream-sync` | **Date**: 2026-06-04

All Technical Context unknowns are resolved below. Each entry: Decision / Rationale / Alternatives considered.

---

## R1 — How to determine the not-yet-merged upstream delta

**Decision**: Determine the delta by **behavioral/content comparison**, not git ancestry. Procedure: (a) enumerate `taquito-patches` commits newer than our last port (anchor: upstream HEAD `02e9422` "prepare 4.8.4-ecad release", working back to the `4.8.2`/`4.8.3`-ecad boundary already merged via `*-ecadport`); (b) for each commit, extract the behavioral change and probe both target lines for its presence (grep distinctive identifiers, then confirm by reading the touched function); (c) classify as already-present / to-import / exclude-with-reason. Record the result as the delta table in `data-model.md`.

**Rationale**: Prior ecadports were rebranded (`@ecadlabs/* → @tezos-x/*`) and re-committed with new SHAs, so `git log upstream/taquito-patches --not master` is meaningless — ancestry is broken. Content is the only reliable signal. Constitution Principle II forbids bulk sync and requires per-commit provenance, which this per-commit method satisfies directly.

**Evidence already gathered** (probes on the `master` tree):
- PRESENT: Matrix `Promise.allSettled` broadcast; cross-tab ACCOUNTS recovery (`AccountManager.ts`); storage-read normalization (`P2PCommunicationClient.ts`); WCStorage prefix/empty-array (`LocalStorage.ts`, `ClientOptions.ts`).
- NOT YET CONFIRMED (keyword-absent, must verify by reading during implementation): WC single-flight SignClient/pairing; "recover invalid stored session state"; "coalesce concurrent permission requests"; "destroyed dApp client singleton reuse"; "invalid account deactivation reasons".

**Alternatives considered**: (1) `git cherry`/patch-id — rejected, rebranding changes patch-ids. (2) Trust commit dates only — rejected, imprecise and risks re-applying merged work. (3) Full re-sync from upstream — rejected, violates Principle II.

---

## R2 — Issue #33: payload-less V3 message crash

**Decision**: Insert an early-return guard in `handleResponse` immediately after `typedMessage` is computed: if `!typedMessage`, `logger.warn(...)` and `return`. This is the single safe fix because `typedMessage` is dereferenced at many later sites (type checks, `openRequests` bookkeeping) — guarding only the first deref would just move the crash.

**Rationale**: Matches the reporter's root-cause analysis and the existing code (master `DAppClient.ts:325-330`, 4.8-stable `:312-323`). Drops malformed input without touching the valid-message path (Principle I). Near-identical on both lines → clean cherry-pick.

**Alternatives considered**: Optional chaining on the first deref only (rejected — moves crash downstream); try/catch around the whole handler (rejected — hides state-consistency problem, and the spec requires bookkeeping not be left orphaned).

---

## R3 — Issue #30: connect-UI Map crash + enableMetrics default

**Decision**: Two parts. (a) In `useWallets.tsx:177`, filter falsy/malformed entries before `new Map(wallets.map(...))` (e.g. `wallets.filter(Boolean).map(...)`, and guard that each has an `id`). (b) Ensure the getting-started flow succeeds with `enableMetrics` unset: the metrics path must be fully inert when the flag is absent (it defaults to `false` at `DAppClient.ts:270`, so the crash is the UI Map, not metrics per se) — verify no metrics code runs unguarded, and align docs.

**Rationale**: The thrown message "Iterator value undefined is not an entry object" is exactly a `new Map(iterable)` where an element is `undefined` — i.e. `wallets` contains undefined entries (e.g. an unresolved/queued wallet-list entry). Filtering is minimal and behavior-preserving for valid lists. The reporter conflated the Map crash with `enableMetrics`; investigation shows metrics already defaults false, so the doc/UX fix is to confirm the documented snippet works verbatim and document the flag if any path still requires it.

**Alternatives considered**: Defaulting `enableMetrics` to `true` (rejected — privacy/telemetry default change, out of scope and arguably a regression); patching the wallet-list source instead of the Map site (deferred — the Map site is the universal guard; source-level dedup can be part of the upstream delta if applicable).

---

## R4 — Issue #32: Firefox content-script web-wallet pairing

**Decision**: Two coordinated changes. (a) **Make WalletConnect opt-in**: add an additive `disableWalletConnect?: boolean` to `DAppClientOptions`, and skip constructing/listening `walletConnectTransport` when WalletConnect options are absent or the flag is set (no default project-id transport built). (b) **Compartment-safe pairing**: stop handing the default pairing UI a `Promise` created in the content-script compartment; resolve the WalletConnect peer-info URI before emitting `PAIR_INIT`, or emit a plain primitive the UI can read without a cross-compartment `.then`. Minimum bar: web wallets render and pair in a Firefox content script.

**Rationale**: Confirmed `walletConnectOptions?` exists but no disable flag (`DAppClientOptions.ts:119`); the WC transport is built unconditionally with a default project id (`DAppClient.ts:249,670`); peer-info is emitted as a `Promise` (`DAppClient.ts:944,953`) consumed by `showPairAlert` in `events.ts:539`. Firefox Xray wrappers block cross-compartment `.then`. Making WC opt-in matches the documented "WalletConnect is opt-in" contract; the option is additive (Principle I).

**Alternatives considered**: A full public headless pairing API (deferred to stretch per spec Assumptions — larger surface, needs its own contract); cloning values into the page compartment (more fragile than resolving primitives before emit). Extended e2e cannot run real Firefox-content-script today, so #32's browser-specific acceptance is validated by a targeted manual/Playwright-Firefox check documented in quickstart.md, with unit coverage for the opt-in/disable logic.

---

## R5 — Issue #15: published packages not resolvable

**Decision**: Make `scripts/publish-workspaces.mjs` **atomic and verified**: publish all workspace packages, then verify every package's tarball for the release version is resolvable from the registry (e.g. `npm view <pkg>@<version> dist.tarball` resolves and downloads) before considering the release successful; fail the release (and surface which package failed) if any tarball is missing, so a half-published state cannot be tagged `latest`/`beta`. Pair with `check:versions` ensuring internal exact-pins all reference the same release version.

**Rationale**: Internal deps are **exact-pinned** (`"@tezos-x/octez.connect-core": "5.0.0-beta.6"`), so any single package whose tarball failed to publish makes the whole set uninstallable with `ETARGET` even though `npm view ... versions` lists it (the reported symptom). The defect is publish atomicity/verification, not the version numbers. Lives in release tooling shared by both lines (Principle IV — stays trusted-publisher, no tokens added).

**Alternatives considered**: Switching internal deps to ranges/`workspace:` protocol (rejected — larger change, and ranges wouldn't fix a genuinely missing tarball); manual re-publish of one broken version (rejected — treats the symptom, not the class, per spec Assumptions).

---

## R6 — Dual-branch backport mechanics

**Decision**: One commit per logical change; cherry-pick from the `master`-based branch to a `4.8-stable`-based branch in the same order; adapt on conflict and preserve the commit subject + provenance trailer. Keep version bumps in separate commits. Two PRs, one per base. (Full strategy in plan.md → Dual-Branch Delivery.)

**Rationale**: CI is `pull_request:`-triggered for any base, so both PRs get the identical gate; per-commit portability keeps the two PRs auditable as the same logical set and honors Principle II provenance. Confirmed `4.8-stable` carries the same `ci.yml` and the same `#33` code shape, so most fixes port cleanly.

**Alternatives considered**: Merge `master` → `4.8-stable` (rejected — bulk sync, drags 5.0.0 changes into LTS, violates Principle II); a shared base branch (impossible — bases diverge).

---

## R7 — Test & release gating

**Decision**: Each issue gets a unit regression test that fails pre-fix / passes post-fix (#33: payload-less message → no throw; #30: wallet list with `undefined` → Map builds; #32: no WC options → no WC transport built + opt-out honored; #15: a publish dry-run/verify unit over the tarball-resolvability check). Run `e2e:smoke` on every PR; run **extended `npm run e2e`** against real transports before releasing #32/#33 on either line (Principle V merge gate, since they touch pairing/transport handlers).

**Rationale**: Directly satisfies FR-020 and the constitution's merge gate. The transport/pairing touch points trip the "extended e2e before release" rule.

**Alternatives considered**: Smoke-only for transport changes (rejected — violates Principle V merge gate).

---

## Open items carried into implementation (not blocking the plan)

- Exact membership of the upstream delta (R1) — produced as the delta table during `/speckit-tasks`/implementation; anchored at `taquito-patches` HEAD.
- Whether any remaining metrics code path requires `enableMetrics` (R3 part b) — confirm by reading; doc-only if inert.
- Whether `@walletconnect/sign-client` pin (upstream `2.18.0`) should be adopted on our lines — evaluate as a delta item against our `^2.23.x` baseline (Principle: new/changed runtime dep needs PR justification).
