# Phase 1 Data Model: dApp/SDK Bug Fixes & Upstream Patch Parity

**Feature**: `001-dapp-bugfixes-upstream-sync` | **Date**: 2026-06-04

This is a fix/maintenance feature, so the "data model" is the set of in-memory shapes the fixes guard, plus the bookkeeping records that govern dual-branch delivery and the upstream delta. No persistent schema changes.

---

## E1 — Wallet Response Message (guarded by #33)

The inbound message `handleResponse` receives. Two interpretations selected by `version`:

| Field | Type | Notes |
|-------|------|-------|
| `version` | string | Selects wrapped (V3) vs. unwrapped interpretation via `usesWrappedMessages(version)`. |
| `message` | object \| **undefined** | The V3 inner payload. **The #33 defect: present in type, absent at runtime.** |
| `type` | BeaconMessageType | Dereferenced at many sites after the guard. |
| `id` | string | Used for `openRequests` bookkeeping. |
| `senderId` | string | Used for stored-peer metadata lookup. |

**Validation rule (new)**: after `typedMessage` is resolved, if `typedMessage` is null/undefined → log warning, return, perform no bookkeeping. Valid messages unchanged.

**State transition**: `received → (typedMessage falsy?) → dropped(no-op)` else `received → processed` (unchanged path).

---

## E2 — Wallet List Entry (guarded by #30)

Consumed by `useWallets.tsx` to build a lookup `Map`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Map key. |
| (entry) | Wallet \| **undefined** | **#30 defect: array may contain `undefined`**, breaking `new Map(wallets.map(...))`. |

**Validation rule (new)**: filter falsy entries (and entries lacking `id`) before Map construction. A valid, fully-populated list produces the identical Map as today.

---

## E3 — DAppClient Options delta (for #32)

| Field | Type | Status | Notes |
|-------|------|--------|-------|
| `walletConnectOptions` | `RequireAtLeastOne<{...}>` | existing | Presence enables WalletConnect. |
| `disableWalletConnect` | `boolean` (optional) | **new, additive** | When true (or when `walletConnectOptions` absent), the WC transport is not built/listened. Default `false`/absent ⇒ current behavior preserved (Principle I). |

**Invariant**: `disableWalletConnect === true` ⟹ no `DappWalletConnectTransport` constructed, no default project-id transport, no WC errors/timeout emitted.

---

## E4 — Pairing Peer-Info (for #32)

Values emitted on `BeaconEvent.PAIR_INIT` and consumed by the pairing UI (`showPairAlert`).

| Field | Type today | Issue | Target |
|-------|-----------|-------|--------|
| `p2pPeerInfo` | resolved/sync | ok | unchanged |
| `postmessagePeerInfo` | resolved via callback | ok | unchanged |
| `walletConnectPeerInfo` | `Promise<string>` | **#32: cross-compartment `.then` denied in Firefox content script** | resolved primitive before emit, or compartment-safe value |

**Invariant**: the value the pairing UI reads must not require awaiting a `Promise` created in a foreign JS compartment.

---

## E5 — Published Package Set (for #15)

| Field | Type | Notes |
|-------|------|-------|
| packages | list of `@tezos-x/octez.connect-*` | Released together. |
| internal deps | **exact-pinned** version strings | All must equal the release version (e.g. all `5.0.0-beta.7`). |
| registry tarball | per package@version | **Must be resolvable & downloadable** for the release to be valid. |

**Validation rule (new, publish-time)**: a release is "complete" only if every `package@releaseVersion` tarball resolves from the registry; otherwise the publish fails loudly identifying the missing package. No half-published state may be tagged.

---

## E6 — Upstream Delta Record (drives the import; satisfies SC-005)

One row per `taquito-patches` commit newer than our last port. Produced during implementation; lives in the PR descriptions and/or `tasks.md`.

| Field | Type | Notes |
|-------|------|-------|
| `upstreamSha` | string | `ecadlabs/beacon-sdk-taquito-patches@<sha>`. |
| `subject` | string | Upstream commit subject. |
| `classification` | enum | `already-present` \| `import` \| `exclude`. |
| `presentOnMaster` | bool | Content-probe result. |
| `presentOn4.8Stable` | bool | Content-probe result (per-line; may differ). |
| `reason` | string | Required when `exclude` (e.g. "release-mechanics", "@ecadlabs branding", "5.0.0-incompatible"). |
| `portCommitMaster` | sha? | Our commit on the master-based branch. |
| `portCommit4.8` | sha? | Our commit on the 4.8-stable-based branch. |

**Invariant**: every newer-than-last-port upstream commit has exactly one row; `import` rows must have port commits on both lines (or a recorded per-line exception); `already-present` rows are neither re-applied nor reverted.

---

## E7 — Delivery Matrix (dual-branch tracking; satisfies FR-019)

| Change | master branch (`001-…`) | 4.8-stable branch (`001-…-4.8`) | Regression test on both? |
|--------|--------------------------|----------------------------------|--------------------------|
| #33 guard | ☐ | ☐ | ☐ |
| #30 Map filter + metrics doc | ☐ | ☐ | ☐ |
| #32 WC opt-in + pairing | ☐ | ☐ | ☐ |
| #15 publish atomicity | ☐ (shared tooling) | ☐ | ☐ |
| upstream delta (per E6) | ☐ | ☐ | ☐ |
| version bump | `5.0.0-beta.7` | `4.8.5` | n/a |

**Invariant**: FR-019 is satisfied only when both columns are complete and each row's regression test passes on the corresponding line.
