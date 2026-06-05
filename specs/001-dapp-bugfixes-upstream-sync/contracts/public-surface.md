# Contract: Public Surface & Behavioral Guarantees

**Feature**: `001-dapp-bugfixes-upstream-sync` | **Date**: 2026-06-04

The SDK's "contracts" are its public TypeScript surface and observable runtime behavior (TZIP-10 v2 compatibility, Principle I). This documents what MUST NOT break and the single additive change.

---

## C1 — `DAppClient.handleResponse` behavioral contract (#33)

**Inputs**: a wallet message (wrapped V3 or unwrapped) over any transport.

**Guarantees**:
- A valid message (wrapped or unwrapped) is processed exactly as before — no change to outputs, events, or `openRequests` bookkeeping.
- A message whose resolved payload is `undefined`/`null` is dropped: the handler returns without throwing, emits **no** unhandled promise rejection, and leaves client state consistent (no orphaned open requests, no half-done transport cleanup).
- A warning is logged for dropped messages with enough context to diagnose, without leaking sensitive payload contents.

**Non-goals**: does not change which valid message types are accepted or their semantics.

---

## C2 — `DAppClientOptions` (#32) — additive only

```ts
interface DAppClientOptions {
  // ...existing fields unchanged...
  walletConnectOptions?: RequireAtLeastOne<{ projectId: string; relayUrl: string }>
  /** NEW (optional). When true, the WalletConnect transport is not constructed or listened. */
  disableWalletConnect?: boolean
}
```

**Guarantees**:
- Omitting `disableWalletConnect` ⇒ **identical** behavior to today.
- `disableWalletConnect: true` **or** `walletConnectOptions` absent ⇒ no WC transport built, no default project-id used, no WC errors or connection-timeout noise emitted.
- No existing field is removed, renamed, or narrowed. Backward compatible (Principle I) — no MAJOR bump required.

---

## C3 — `PAIR_INIT` peer-info consumption contract (#32)

**Guarantee**: values delivered to the pairing UI via `BeaconEvent.PAIR_INIT` are consumable without awaiting a `Promise` created in a foreign JS compartment, so the default pairing UI renders all available wallet actions (including web wallets) in a Firefox MV3 content-script context. Chrome and normal-page behavior unchanged.

**Compatibility note**: the *shape* of `BeaconEventType[PAIR_INIT]` is preserved for existing consumers; if `walletConnectPeerInfo` changes from `Promise<string>` to a resolved/compartment-safe form, that is evaluated for type-compat and, if observable to consumers, treated as additive (e.g. accept both) rather than a breaking change.

---

## C4 — `enableMetrics` default & docs (#30)

**Guarantee**: the documented getting-started flow succeeds with `enableMetrics` unset; the absence of the flag causes no runtime error. `enableMetrics` continues to default to disabled (no telemetry-by-default change). If any code path still requires the flag, it is documented.

---

## C5 — Published release resolvability contract (#15)

**Guarantee**: for any published release, `npm install @tezos-x/octez.connect-sdk@<version>` and the `bun` equivalent resolve and download the **entire** internal dependency set from a clean environment, exit 0. No release exists in a state where a version is listed by the registry index but its tarball is unresolvable. Publishing remains tag-triggered via `release.yml` through npm Trusted Publishers (Principle IV) — no long-lived tokens.

---

## Contract tests (map to FR-020 / SC-006)

| Contract | Test | Fails before fix? |
|----------|------|-------------------|
| C1 | unit: `handleResponse({version:'3'})` (no `.message`) → resolves, no throw, no state mutation | Yes |
| C1 | unit: valid wrapped + unwrapped messages → unchanged processing | No (guards regression) |
| C2 | unit: client with no `walletConnectOptions` / `disableWalletConnect:true` → no WC transport added | Yes |
| C3 | targeted Firefox check (quickstart) + unit on emitted peer-info shape | Yes (Firefox) |
| C4 | unit/e2e: getting-started options without `enableMetrics` → no throw | Yes |
| C5 | publish dry-run/verify unit over tarball-resolvability check | Yes |
