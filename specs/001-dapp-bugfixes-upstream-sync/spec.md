# Feature Specification: dApp/SDK Bug Fixes & Upstream Patch Parity

**Feature Branch**: `001-dapp-bugfixes-upstream-sync`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "see issue https://github.com/trilitech/octez.connect/issues/33 and also #32, #30, #15 — we need to fix all these issues, plus import all the upstream changes added in https://github.com/ecadlabs/beacon-sdk-taquito-patches/commits/taquito-patches/. These changes and fixes are to be added to both master branch and 4.8-stable branch."

## Overview

The octez.connect SDK (the Tezos Beacon SDK fork published under the `@tezos-x/octez.connect-*` scope) has four open, confirmed defects that degrade or block integration for dApp developers. In addition, a sibling hardening effort lives on the `ecadlabs/beacon-sdk-taquito-patches` `taquito-patches` branch — a long series of robustness fixes (WalletConnect lifecycle, Matrix transport, dApp disconnect/recovery, storage normalization, dependency/security hardening), most of which has already been ported into our maintained lines.

The bulk of that upstream work (the `*-ecadport` branches, up to roughly the `4.8.2`/`4.8.3`-ecad range) has **already been merged** into both `master` and `4.8-stable`. What remains is the **recent tail** of upstream commits — added after our last port — that is not yet included.

This feature delivers: (1) targeted fixes for the four reported issues, and (2) import of only the **not-yet-merged recent upstream commits** (the delta between upstream `taquito-patches` HEAD and our current merged state), both landed on **two release lines** — the current `master` line (`5.0.0-beta.x`) and the long-term-support `4.8-stable` line.

## Clarifications

### Session 2026-06-05

- Q: How should SC-004's "100%" Firefox web-wallet pairing acceptance be gated, given real MV3 content-script pairing can't run in standard Playwright e2e? → A: Hybrid — automated Playwright-Firefox check for the compartment-safe pairing logic, plus a documented manual MV3 content-script repro as a release-gate checklist item.
- Q: What is the scope boundary for fixing #32? → A: Default-UI fix only (WalletConnect opt-in + compartment-safe default pairing UI); a public headless pairing API is out of scope (stretch, not a hard requirement).
- Q: For #30, should the SDK keep telemetry disabled by default? → A: Yes — `enableMetrics` stays off unless explicitly enabled; the fix only ensures the documented flow does not error when the flag is absent (no telemetry-by-default change).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - dApp survives malformed/payload-less wallet messages (Priority: P1)

A dApp developer integrates `DAppClient` and connects a wallet over the PostMessage transport. During an active session the wallet emits a message whose version marks it as the V3 wrapped-message format but whose inner payload is absent (e.g. a keepalive frame, an out-of-spec response, or a wrapper-less V3 message). Today this dereferences an undefined payload and throws an uncaught `TypeError`, surfacing as a runtime error overlay in development and an unhandled promise rejection in production — and can leave the client's internal bookkeeping (open requests, transport cleanup) half-completed.

**Why this priority**: This is a hard runtime crash on a live, already-connected dApp. It is triggered by a single unexpected message the dApp cannot control, affects every shipped lineage (4.8.x through 5.0.0-beta.x), and corrupts client state. It has the highest blast radius of the four issues. (Issue #33)

**Independent Test**: Feed `DAppClient.handleResponse` a message shaped `{ version: '3' }` with no `.message` payload and assert it returns without throwing, emits no unhandled rejection, and leaves client state consistent. Fully testable in isolation with no wallet or transport.

**Acceptance Scenarios**:

1. **Given** a connected dApp, **When** the wallet sends a V3-versioned message with an undefined payload, **Then** the response handler logs a warning, returns early, and the dApp continues operating without an error overlay or unhandled rejection.
2. **Given** a connected dApp, **When** the wallet sends a well-formed V3 wrapped message, **Then** the response is processed exactly as before (no behavioral regression for valid messages).
3. **Given** a connected dApp, **When** a payload-less message is dropped, **Then** any state the handler would normally update (open-request tracking, transport cleanup) is left in a consistent, non-orphaned state.

---

### User Story 2 - The published SDK installs cleanly (Priority: P1)

A developer follows the migration guide and runs `npm install @tezos-x/octez.connect-sdk` (or the `bun` equivalent). Today the latest published release fails to install: the meta-package depends on internal sub-packages at a version whose tarballs are not resolvable from the registry, producing `ETARGET` / "No matching version found" errors and blocking adoption entirely.

**Why this priority**: An SDK that cannot be installed delivers zero value regardless of how correct its code is. This blocks the documented migration path from `@airgap/beacon-*`. (Issue #15)

**Independent Test**: From a clean environment with no cache, install the published meta-package and confirm the full dependency tree resolves and downloads, then import the package and instantiate a client. Verifiable without any running wallet.

**Acceptance Scenarios**:

1. **Given** a clean machine, **When** a developer installs the latest published `@tezos-x/octez.connect-sdk`, **Then** every internal sub-package resolves and downloads and the install completes with exit code 0.
2. **Given** a published release, **When** any internal cross-dependency pins a sibling package version, **Then** that exact version exists as a downloadable tarball in the registry (no listed-but-missing versions).
3. **Given** the package manager is `npm` or `bun`, **When** the install runs, **Then** both succeed (the failure is not package-manager-specific).

---

### User Story 3 - The documented getting-started flow works without surprises (Priority: P2)

A developer copies the getting-started example to connect a wallet on Mainnet. Today, on the affected release, the connect UI throws `Iterator value undefined is not an entry object` (a `Map` constructed from invalid entries inside the connect UI), and a separate error occurs unless the undocumented `enableMetrics` flag is explicitly set — even though the docs do not mention it. The example worked on the immediately preceding releases.

**Why this priority**: This breaks the first experience a new integrator has, on the exact code published in the docs. It is a regression from prior releases, but it is recoverable by the developer (unlike a silent crash) and narrower than the always-present #33 crash. (Issue #30)

**Independent Test**: Run the verbatim getting-started snippet (with and without `enableMetrics`) against Mainnet config and confirm the pairing UI renders and no runtime error is thrown in either case.

**Acceptance Scenarios**:

1. **Given** the verbatim getting-started example, **When** the developer omits `enableMetrics`, **Then** the client initializes and the pairing UI renders without a runtime error.
2. **Given** the connect UI receives wallet/extension data, **When** it builds its internal lookup structures, **Then** undefined or malformed entries are filtered out rather than passed into a `Map` constructor that throws.
3. **Given** a developer following the published docs, **When** they use only the options the docs describe, **Then** no additional undocumented flag is required for a successful connection (or the requirement is documented).

---

### User Story 4 - Web wallets can pair from a Firefox content script (Priority: P2)

A developer embeds `DAppClient` inside a Firefox MV3 extension content script (e.g. to inject actions onto third-party pages). Today, extension wallets (Temple) pair, but web wallets (Kukai, etc.) never render their pairing action: the WalletConnect transport is constructed unconditionally and throws across Firefox's cross-compartment ("Xray") boundary, and the pairing UI cannot read the peer-info promises handed to it across that same boundary ("Permission denied to access property 'then'"). The same code works in Chrome.

**Why this priority**: It blocks a real, growing integration pattern (extensions that embed the SDK) for an entire browser, but only for web wallets in a specific embedding context — a narrower audience than the universal issues above. (Issue #32)

**Independent Test**: In a Firefox content-script context, initialize `DAppClient` with only `{ name, network }`, trigger pairing, and confirm (a) no WalletConnect transport errors are emitted when WalletConnect options were not supplied, and (b) the web-wallet pairing action renders and is actionable.

**Acceptance Scenarios**:

1. **Given** a client created without WalletConnect options, **When** transports initialize, **Then** the WalletConnect transport is not built/listened (or can be explicitly disabled), and no WalletConnect errors or connection-timeout noise appears.
2. **Given** a Firefox content-script context, **When** the pairing UI consumes peer-info values, **Then** it can read them without a cross-compartment permission error and renders the web-wallet pairing action.
3. **Given** the same dApp code, **When** run in Chrome, **Then** both extension and web wallets continue to pair (no regression).
4. **Given** an embedder that wants to render its own UI, **When** they request pairing information, **Then** the SDK exposes pairing data in a form they can consume without crossing the compartment boundary through the default dialog. *(Out of scope for this feature — stretch only; the in-scope fix is the compartment-safe default UI. See Clarifications 2026-06-05.)*

---

### User Story 5 - Recent upstream commits not yet merged are imported (Priority: P3)

The `*-ecadport` branches have already been merged into both maintained lines, so most of the `ecadlabs/beacon-sdk-taquito-patches` (`taquito-patches`) hardening work is present. However, upstream has continued past our last port, and a **recent tail of commits is not yet included**. A maintainer needs exactly that not-yet-merged delta — and only that delta — brought into both lines, without re-applying or duplicating work that is already merged.

**Why this priority**: These are broad, mostly-defensive improvements that reduce future incident rate. They are valuable but not blocking today's integrators the way P1/P2 issues are, and most of the upstream set is already merged — only the recent tail remains. It is delivered last so the four reported issues ship first. (Upstream import requirement, scoped per the maintainer's clarification that ecadports are already merged.)

**Independent Test**: Produce a delta record that identifies which upstream `taquito-patches` commits are NOT yet present in each target line (determined by content, since the ecadports were rebranded/ported and git ancestry does not apply), import that set, and confirm the upstream-derived test suites for the imported fixes pass on both lines.

**Acceptance Scenarios**:

1. **Given** the already-merged ecadports, **When** the delta is computed, **Then** it lists only upstream commits whose changes are not already present in the target line — and explicitly does NOT include already-merged work.
2. **Given** an identified not-yet-merged upstream commit, **When** it is imported, **Then** it is applied without duplicating or reverting changes already present, and any tests it carries are ported and pass on the target line.
3. **Given** an upstream commit that is purely release-mechanics or ecad-specific (branding `@ecadlabs/*`, version/"prepare release" bumps, ecad dist-tag/CI routing), **When** evaluating the delta, **Then** it is excluded with a recorded reason rather than ported verbatim.
4. **Given** a candidate upstream change that appears present but in a rebranded/adapted form, **When** classifying it, **Then** it is judged by behavioral content (not commit hash) and counted as already-merged.

---

### Edge Cases

- **Message variants for #33**: V3-versioned message with `message: null`; non-V3 message missing `appMetadata`; message missing `id`; rapid bursts of payload-less frames must not accumulate orphaned open-requests.
- **#15 partial-publish**: a release where some sub-package tarballs published and others did not — install must fail loudly and reproducibly, and the release process must prevent shipping such a state.
- **#30 data shapes**: connect UI receiving an empty extension list, a list containing `undefined` entries, or duplicate keys when constructing lookup maps.
- **#32 transport toggles**: WalletConnect options absent vs. present vs. an explicit disable flag; Firefox vs. Chrome; content-script vs. normal page context.
- **Dual-branch divergence**: a fix whose surrounding code differs between `5.0.0-beta` (master) and `4.8-stable` — the fix must be adapted to each, not blindly cherry-picked, and must not silently no-op.
- **Already-merged in disguise**: an upstream change that is already present but in rebranded/adapted form must be recognized as merged (by content) and not re-applied — a naive cherry-pick would conflict or duplicate it.
- **Partially-merged commit**: an upstream commit whose change is present on one target line but not the other — the delta must be computed per line, not assumed identical.
- **Upstream/branding conflicts**: an upstream commit that touches `@ecadlabs/*` names or CI that does not exist in our repo.

## Requirements *(mandatory)*

### Functional Requirements

**Issue #33 — Resilient response handling**

- **FR-001**: The dApp response handler MUST detect when the resolved message payload is undefined/null and stop processing that message safely (log a warning and return) instead of dereferencing it.
- **FR-002**: Dropping a payload-less message MUST NOT throw, MUST NOT produce an unhandled promise rejection, and MUST NOT leave client bookkeeping (open requests, transport state) in an orphaned or inconsistent state.
- **FR-003**: Valid (V3 wrapped and non-wrapped) messages MUST continue to be processed with no behavioral change.

**Issue #15 — Installable releases**

- **FR-004**: Every published release MUST be installable from a clean environment such that all internal cross-package dependencies resolve to downloadable tarballs (no "listed but missing" versions).
- **FR-005**: Internal packages that reference sibling packages MUST do so using version specifiers that are guaranteed to exist for the same release (e.g. consistent, atomically-published versions).
- **FR-006**: The release/publish process MUST fail or be prevented from completing if any package in a release set is not fully published, rather than producing a half-published, uninstallable release.
- **FR-007**: A clean install MUST succeed under both `npm` and `bun`.

**Issue #30 — Connect UI robustness & metrics default**

- **FR-008**: Code that constructs lookup structures (e.g. `Map`s) from wallet/extension data MUST filter out undefined/malformed entries so construction cannot throw "Iterator value undefined is not an entry object".
- **FR-009**: The documented getting-started flow MUST succeed without the integrator setting `enableMetrics` — i.e. the absence of the flag MUST NOT cause a runtime error.
- **FR-010**: `enableMetrics` MUST remain disabled by default (no telemetry-by-default); the documented getting-started flow MUST work with the flag absent, and the flag's behavior MUST be made consistent with the documentation. No configuration flag may be silently required for correct operation.

**Issue #32 — Firefox content-script pairing**

- **FR-011**: The WalletConnect transport MUST NOT be constructed or registered when WalletConnect options were not provided, OR an explicit opt-out (e.g. a disable flag) MUST be available; either way the documented "WalletConnect is opt-in" behavior MUST hold.
- **FR-012**: When WalletConnect is not enabled, no WalletConnect-related errors or connection-timeout noise may be emitted during initialization or pairing.
- **FR-013**: Peer-info values handed to the pairing UI MUST be consumable in a Firefox content-script compartment without triggering a cross-compartment access error, so the web-wallet pairing action renders and is actionable.
- **FR-014**: Pairing for both extension and web wallets MUST continue to work in Chrome (no regression), and extension-wallet pairing MUST continue to work in Firefox.

**Upstream import — Recent not-yet-merged delta**

- **FR-015**: The delta of upstream `taquito-patches` commits that are NOT yet present in each target line MUST be determined by **behavioral/content comparison** (not git ancestry or commit hash, since prior ecadports were rebranded and ported), accounting for the already-merged `*-ecadport` work.
- **FR-016**: Only the not-yet-merged upstream changes MUST be imported; already-merged changes MUST NOT be re-applied, duplicated, or reverted.
- **FR-017**: Each imported upstream fix MUST be present on both target lines, and any tests it carries MUST be ported and MUST pass on the target line.
- **FR-018**: Upstream commits that are purely release-mechanics or ecad-specific (branding `@ecadlabs/*`, version/"prepare release" bumps, ecad dist-tag/CI routing) MUST be excluded from the import with a recorded reason rather than copied verbatim.

**Cross-cutting — Dual-branch delivery & quality gates**

- **FR-019**: All fixes (#33, #32, #30, #15) and the imported not-yet-merged upstream delta MUST be delivered on both the `master` line (`5.0.0-beta.x`) and the `4.8-stable` line, each adapted to that line's surrounding code.
- **FR-020**: Each reported issue MUST be covered by at least one automated regression test that fails before the fix and passes after, on each target line.
- **FR-021**: Both target lines MUST pass their existing lint, build, and test gates after the changes.
- **FR-022**: Every fix MUST be reflected in the published/distributable build artifacts (not only in TypeScript sources), so consumers of the built packages receive the fix.

### Key Entities *(include if data involved)*

- **Wallet Response Message**: An inbound message from a wallet over a transport; has a `version` (which selects wrapped vs. unwrapped interpretation), an optional inner payload, a type, and an id. The defect class in #33 is a message whose version implies a payload that is in fact absent.
- **Peer-Info / Pairing Data**: The values (P2P, PostMessage, WalletConnect URIs/promises) emitted to the pairing UI so a user can choose a wallet. In #32 these cross a JavaScript compartment boundary in Firefox content scripts.
- **Published Package Set**: The set of internal `@tezos-x/octez.connect-*` packages released together; #15 is a consistency/atomicity defect across this set in the registry.
- **Release Line**: A maintained branch with its own version range — `master` (`5.0.0-beta.x`) and `4.8-stable` (`4.8.x`) — each a distinct delivery target for every change in this feature.
- **Upstream Patch Commit**: An individual commit on `taquito-patches`. The unit of delta analysis for FR-015/016/018. Because prior ports were rebranded, a commit's presence is judged by behavioral content, not by hash or git ancestry.
- **Not-Yet-Merged Delta**: The subset of upstream commits whose changes are absent from a given target line after accounting for already-merged ecadports — the actual scope of the import.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A dApp left connected and receiving 100% malformed/payload-less wallet messages produces zero uncaught errors and zero unhandled promise rejections from response handling. *(#33)*
- **SC-002**: A clean install of the published SDK succeeds on the first attempt under both `npm` and `bun`, with a 0% rate of unresolvable-dependency failures. *(#15)*
- **SC-003**: The verbatim documented getting-started flow completes and renders the pairing UI without any runtime error, both with and without the metrics flag set. *(#30)*
- **SC-004**: The compartment-safe pairing logic passes an automated Playwright-Firefox check, AND a documented manual MV3 content-script repro confirms the web-wallet pairing action renders and is actionable (release-gate checklist item); extension-wallet pairing remains working in both browsers and Chrome web-wallet pairing is unregressed. *(#32; verification is hybrid auto + manual per Clarifications 2026-06-05)*
- **SC-005**: The set of upstream `taquito-patches` commits not yet present in each target line is identified and recorded; 100% of that not-yet-merged set is either imported or excluded-with-reason, and zero already-merged changes are duplicated or reverted. *(import)*
- **SC-006**: All four reported issues have a regression test that demonstrably fails on the pre-fix code and passes on the post-fix code, on each of the two target lines.
- **SC-007**: Both target lines pass their full lint + build + test suites after the changes, with no net-new failures.
- **SC-008**: The four reported issues can be verified as resolved against a live test network by an external reporter using a distributable build (each issue independently confirmable).

## Assumptions

- **Upstream import scope is the recent not-yet-merged tail only.** The maintainer has confirmed the `*-ecadport` branches are already merged into both lines, so this feature imports only upstream `taquito-patches` commits added after our last port that are not yet present — determined by behavioral content, not git ancestry (prior ports were rebranded). Already-merged work is neither re-applied nor reverted. Release-mechanics and `@ecadlabs/*`-specific commits are excluded with a recorded reason rather than copied verbatim. (FR-015, FR-016, FR-018)
- **The exact delta is a deliverable, not a precondition.** Because presence must be judged by content across rebranded ports, identifying which upstream commits remain (per line) is produced as part of this work rather than enumerated up front in this spec. The upstream anchor is `taquito-patches` HEAD (the `4.8.4-ecad` release line).
- **Issue #15** is treated as a release-pipeline correctness defect: the fix is making the publish process produce atomically-consistent, fully-resolvable package sets and verifying a clean install, rather than merely re-publishing one specific broken version. The originally-reported `5.0.0-beta.5` is illustrative of the class.
- **Target branches** are exactly the existing `master` (`5.0.0-beta.x`) and `4.8-stable` (`4.8.x`) branches in the `trilitech/octez.connect` repository. The `*-ecadport` branches have already been merged into both targets and are not additional delivery targets.
- **Issue #32 scope is the default-UI fix only** (confirmed 2026-06-05): WalletConnect is made opt-in and the default pairing UI is made compartment-safe so web wallets pair in a Firefox content script. A public headless pairing API (FR-013 / Story 4 scenario 4) is **out of scope** for this feature — a stretch goal, not a hard requirement.
- Fixes adapt to each line's code shape; a change that cannot be expressed identically on both lines is implemented per line so it is functionally equivalent and verified on each.
- Standard developer-facing error handling applies: dropped/abnormal messages are logged at warning level with enough context to diagnose, without leaking sensitive data.
- The Spec Kit workflow and all branches for this feature live in the `trilitech/octez.connect` repository (the code repo); the surrounding `tezos-x-octez-connect` workspace is out of scope.

## Out of Scope

- New features or protocol capabilities beyond fixing the four issues and importing existing upstream patches.
- Rebranding, version-strategy changes, or registry migration beyond what FR-004–FR-007 require for installability.
- Backporting to release lines other than `master` and `4.8-stable`.
- Re-importing or reconciling upstream changes already merged via the `*-ecadport` branches; only the recent not-yet-merged tail is in scope.
- Adopting upstream changes that conflict with octez.connect's identity, supported networks, or release pipeline (these are recorded as intentional exclusions per FR-018).
