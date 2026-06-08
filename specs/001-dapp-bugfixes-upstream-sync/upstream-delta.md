# Upstream Delta Record (taquito-patches → octez.connect)

**Feature**: `001-dapp-bugfixes-upstream-sync` | **Generated**: 2026-06-05 | **Anchor**: upstream `taquito-patches` HEAD `02e9422` (4.8.4-ecad)

**Method**: behavioral/content comparison against the `master` working tree (git ancestry inapplicable — prior ecadports were rebranded `@ecadlabs/* → @tezos-x/*`). Boundary = commits after `2fac5929f` ("prepare 4.8.2-ecad release"), which is the last already-merged ecadport.

**Correction note**: initial keyword greps suggested several recent fixes were already merged; full per-commit content analysis found those were false positives. None of the post-4.8.2-ecad functional commits were present before this feature.

## Classification (31 candidates)

### Imported & verified (typecheck clean) — this session

| SHA | Subject | Target | Status |
|-----|---------|--------|--------|
| `52198d37a` | fix(core): Promise.allSettled for Matrix broadcast send | `octez.connect-core/src/transports/Transport.ts` | ✅ ported |
| `a6d20243f` | fix(wc): match synthesized peer senderId to stored account senderId | `octez.connect-transport-walletconnect/src/WalletConnectTransport.ts:127` | ✅ ported (adapted to 5.0.0 `basePeer` shape) |
| `227672f3b` | fix(dapp): observe ACCOUNTS changes to recover cross-tab active account | `octez.connect-dapp/src/dapp-client/DAppClient.ts` | ✅ ported |
| `d82807184` | Fix Beacon response handling and UI fallback data | Matrix `pollSync` + DAppClient response-handling + UI qrcode swap | ✅ FULLY ported (3 commits) — **resolves issue #33** |

**Decisions applied (2026-06-05):** DAppClient hunk ported adapted to `usesWrappedMessages()` and now serves as the #33 fix; qrcode-svg→qrcode swap adopted (qrcode resolves transitively; lockfile regen deferred to build-prep). `useWallets` #30 Map-filter intentionally left for the #30 phase.

### Imported & verified (typecheck + unit tests clean) — 2026-06-05 (session 2)

| SHA | Subject | Target | Status |
|-----|---------|--------|--------|
| `15ddcc7ca` | Normalize storage reads across all backends | new `octez.connect-core/src/storage/storage-normalization.ts` + LocalStorage/ChromeStorage/IndexedDBStorage + `__tests__/storage/undefined-storage.test.ts` (13 tests) | ✅ ported — commit `492eecec` |
| `b569ed65e` | Fix WCStorage prefix-mismatch and empty-array detection | `octez.connect-core/src/storage/WCStorage.ts` + `__tests__/storage/WCStorage.test.ts` (9 tests) | ✅ ported — commit `4465eaed` |

**Both ported clean**: our `LocalStorage`/`ChromeStorage` "before" state matched upstream's (modulo `@ecadlabs`→`@tezos-x` rebrand); the 30 `StorageKey` enum members exactly match the 30 classified keys so the module-load exhaustiveness assertion passes.

### ⚠️ Newly-identified prerequisite gap (blocks the dApp-lifecycle chain)

| SHA | Subject | Finding |
|-----|---------|---------|
| `2d9723ec6` | fix(dapp-client): unwedge in-flight requests on abort paths (+288/-105 in `DAppClient.ts`) | **CORRECTION (session 2, 2026-06-08): this is NOT a missing prerequisite — its mechanism is already present in our tree under a different name.** Our `DAppClient.ts` already has a rejectable init: `_initPromiseReject` (13 refs; field at :222, captured at `:814 this._initPromiseReject = reject`), abort paths that reject the in-flight init (`:917`, `:938`, `:2479`, `:2619`), and **no `res.catch(handler)` fire-and-forget anti-pattern** (the thing `2d9723ec6` removes — 0 occurrences here). The earlier "`_initReject` = 0 ⇒ gap" finding mistook a **naming** difference (`_initReject` upstream ≡ `_initPromiseReject` here) for an absence. So the chain does **not** need `2d9723ec6` re-expressed; chain commits that reference `_initReject` map to our `_initPromiseReject`. Behavior-change caveats (init() can reject; V3 `permissionRequest`; `PERMISSION_REQUEST_ERROR`) are already in effect here. |

**What the dApp-lifecycle chain genuinely still needs (not already present):** the **transports-array / registration refactor** (`ca30859d6` `addTransport(...)`, `d682738cf` `transports.push(...)`, `82814a76a` restructure) — our `init()` still coordinates over the explicit `postMessageTransport`/`p2pTransport`/`walletConnectTransport` triple, not a list. That array refactor is what makes WC optional naturally (the basis for #32), plus the per-commit behaviors (`32b83dcc0` coalesce permission requests, `9785f5402` reject unreachable peers, `734703d92` recover stored session, `2c93b9d10` deactivation reasons, `d682738cf` destroyed-singleton reuse, `9e8213a88` orphaned active-account). These remain to port, mapping `_initReject`→`_initPromiseReject`.

### Import — pending (interdependent chains; port in order)

**dApp lifecycle chain** (overlapping `DAppClient.ts` regions — port sequentially):
`32b83dcc0` coalesce concurrent permission requests → `9785f5402` reject unreachable wallet peer requests → `734703d92` recover invalid stored session state → `2c93b9d10` invalid account deactivation reasons → `d682738cf` destroyed dApp client singleton reuse.
Also: `ca30859d6` coalesce disconnect + tear down transports → `82814a76a` full disconnect cleanup before transport resolved; `9e8213a88` repair orphaned active-account on storage load; `d82807184` Beacon response handling + UI fallback (⚠ overlaps issue #33 & #30 — reconcile with those fixes).

**WC transport lifecycle chain** (overlapping `WalletConnectCommunicationClient.ts`; needs new `withTimeout` helper + `WALLETCONNECT_DISCONNECT_TIMEOUT_MS` first):

**Order correction (session 2):** the originally-recorded order was wrong. Verified real git order via `commits?path=…WalletConnectCommunicationClient.ts` is `2345a6e7f` → `c3f7819de` → `bf9350740` → `e8eccd9e7` → `07304283b` (`e93de8b96` "Pin WC 2.18.0" interleaves but is excluded). The `try/finally` in `closeSignClient` that `07304283b` depends on is introduced by **`bf9350740`**, not present after `2345a6e7f` alone — so `07304283b` cannot precede `bf9350740`.

- ✅ `2345a6e7f` single-flight SignClient + pairing → **commit `788696e9`** (22 unit tests).
- ✅ `c3f7819de` bound pairing.disconnect on wallet-initiated session_delete (+ test `dce21bc25`) → **commit `bb606998`** (23 tests).
- ✅ `bf9350740` keep SignClient cleanup running when transport close stalls (introduces `closeSignClient` try/finally + test) → **commit `fbcc08c0`** (24 tests). NOTE: skipped the bf9350740 test hunk that asserts `optional.methods === []` — that assertion is coupled to the **excluded** `e93de8b96` (WC-pin-2.18.0 regression); we keep WC `^2.23.6` so `optional.methods === required.methods`.
- ✅ `e8eccd9e7` guard pairing listener removal in `clearEvents` + `07304283b` close listeners on captured SignClient / only zero matching refs — grouped → **commit `b9a7260a`** (26 WC tests total).

**WC-transport lifecycle chain COMPLETE.** All `octez.connect-core` (32) + `octez.connect-transport-walletconnect` (26) unit tests green; both packages `tsc --noEmit` clean.

### Exclude (13)

| SHA | Subject | Reason |
|-----|---------|--------|
| `02e9422a8`, `ab2287243`, `5ed356208` | prepare 4.8.4/4.8.4-beta.1/4.8.3-ecad releases | release-mechanics (version bumps); our line is `5.0.0-beta` under `@tezos-x/*` |
| `abe52c43d` | route prerelease tags to npm beta dist-tag | CI/release config (we have our own `release.yml`) |
| `eef50b5b2`, `6d4dd8baa` | e2e expect null not 'undefined' | test-only assertions on upstream e2e |
| `5c2d96119` | clear lint:new findings | lint-chore; no behavior; on a different lineage |
| `8dca17d6c` | Patch vulnerable build dependencies | dev-dep bump not present in our root deps |
| `46398e10c` | Ignore local-tarballs overlay directory | gitignore only |
| `e93de8b96` | Pin WalletConnect to 2.18.0 | **regression** — would downgrade our `^2.23.6` (lock 2.23.9); intentionally excluded |

**SC-005 status**: 32 post-boundary candidates (31 enumerated + `2d9723ec6` found during session-2 porting). 11 imported & verified (`52198d37a`, `a6d20243f`, `227672f3b`, `d82807184`, `15ddcc7ca`, `b569ed65e`, `2345a6e7f`, `c3f7819de`, `bf9350740`, `e8eccd9e7`, `07304283b`) + `dce21bc25` test, 13 excluded with reasons. **Remaining pending = the dApp-lifecycle chain only** (`32b83dcc0`, `9785f5402`, `734703d92`, `2c93b9d10`, `d682738cf`, `ca30859d6`, `82814a76a`, `9e8213a88`), which is BLOCKED on hand re-expression of the `2d9723ec6` init abort-path refactor (see prerequisite-gap section). Deferred per user decision 2026-06-05. Zero unclassified.
