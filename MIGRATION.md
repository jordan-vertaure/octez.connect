# Migrating to octez.connect v5 (multi-network) — from v4.8.6

**Headline:** v5 adds **multi-network support** — a single pairing can grant a dApp
accounts on several Tezos networks at once (e.g. mainnet + ghostnet), and
operations can target a specific network by its CAIP‑2 chain id. This is the
main reason to upgrade.

**Compatibility promise:** v5 is designed to be **as backward compatible as
possible**. A v5 dApp and a v4.8.6 wallet (and vice‑versa) still talk to each
other; multi-network is negotiated via a **peer‑version handshake** and is
opt‑in, so nothing regresses for peers that don't support it. Existing paired
sessions survive the upgrade — persisted account identifiers are unchanged for
single‑network (legacy) accounts.

> The package names did **not** change (`@tezos-x/octez.connect-*` in both
> v4.8.6 and v5). This is **not** a rename migration — your imports stay the
> same. For many apps the upgrade is a version bump plus a short, well‑defined
> list of required edits below.

---

## 1. Interop / backward‑compatibility matrix

| dApp | Wallet | Result |
|------|--------|--------|
| **v4.8.6** | **v5** | ✅ Works. The v5 wallet routes on the incoming message version and serves the old dApp with the classic single‑account flow. |
| **v5** | **v4.8.6** | ✅ Works. The dApp detects the wallet is legacy (no `protocolVersion` pairing marker) and transparently uses the legacy flat‑v2 single‑network flow. |
| **v5** | **v5** | ✅ Full multi-network. |
| **v4.8.6** | **v4.8.6** | ✅ Unchanged. |

**How the handshake works:** a v5 peer attaches a `protocolVersion` marker to
its pairing response (on every transport that can carry one); that marker is
the capability signal. A peer without the marker is served the flat v2 wire
it has always spoken, regardless of its `version` field; marker‑carrying
peers exchange wrapped v3/v4 envelopes, stamped with the negotiated dialect —
`min(peerVersion, '4')`, floor `'2'`. The dApp only uses multi-network
features when a marker‑carrying wallet declares version ≥ 4. Malformed or
absent versions and markers are always treated as "legacy" (and served the
flat dialect), so a hostile or legacy peer can never trip the new code paths.
WalletConnect peers carry **no** beacon version (never fabricated); their
multi-network capability is negotiated via session namespaces instead (see
§3).

**Graceful degradation (important nuance):** by default a v5 dApp that requests
multiple networks from a **v4.8.6 wallet** receives a **single** account (the
wallet's configured network) with **no error** — best‑effort. If your dApp
*requires* multi-network, set `requiredMinimumVersion: '4'` (see §3) so an old
wallet is rejected cleanly with `VersionUnsupportedBeaconError` instead of
silently degrading.

---

## 2. The minimum upgrade (no new features)

Bump every `@tezos-x/octez.connect-*` dependency from `4.8.6` to `5.0.4` (or
later), then apply the required edits below. These are **breaking changes
independent of multi-network** — you must handle them even if you never touch
a second network.

### 2.1 dApp — required edits

| # | Change | What to do |
|---|--------|-----------|
| 1 | **`DAppClientOptions.disclaimerText` removed** → replaced by `termsAndConditionsUrl` (+ new optional `privacyPolicyUrl`). | Rename the option. |
| 2 | **`DAppClientOptions.requestTimeoutMs` removed** and the built‑in per‑request timeout is gone. | If you relied on requests auto‑rejecting after a timeout, wrap your calls in your own `Promise.race` / `AbortController`. |
| 3 | **`disconnect()` and `removeAllPeers()` dropped their options arguments;** the types `DAppClientDisconnectOptions` and `DAppClientRemoveAllPeersOptions` are removed. | Call `disconnect()` / `removeAllPeers(sendDisconnectToPeers?)` without an options object; delete those type imports. |
| 4 | **`PeerUnreachableBeaconError` removed.** | Remove any `import`/`instanceof` of it. |
| 5 | **Tezos blockchain identifier is `'tezos'`, not `'xtz'`.** | If you look up or register the Tezos handler, use `'tezos'` (`blockchains.get('tezos')`, `addBlockchain(new TezosBlockchain())`). |

### 2.2 Wallet — required edits

| # | Change | What to do |
|---|--------|-----------|
| 1 | **`WalletClient.subscribeToDisconnect()` / `unsubscribeFromDisconnect()` removed** (and the `DisconnectListener` type). | Remove those registrations — disconnects are handled internally now. There is no public replacement. |
| 2 | **`WalletClient.connect()` now filters to a request‑type allowlist.** Your message callback no longer fires for response‑type messages echoed back by the relay. | Usually desirable; only act if you depended on seeing echoed responses. |
| 3 | **Tezos blockchain identifier is `'tezos'`, not `'xtz'`.** | Register/look up the Tezos handler under `'tezos'`. |

### 2.3 Both — runtime

- Node/npm engine requirements are **unchanged** from v4.8.6
  (`node ≥ 22.12`, `npm ≥ 11`).
- **Deep imports into `@tezos-x/octez.connect-core`** moved from
  `dist/cjs/index.js` to `dist/cjs/src/index.js` (and the esm/types
  equivalents). Package‑name imports are unaffected; only hard‑coded deep file
  paths break.

If your app uses none of the removed options/APIs, the upgrade really is just
the version bump. (WalletConnect behaves as in v4.8.6: enabled by default with
a shared `projectId`; pass `walletConnectOptions` to use your own, or
`disableWalletConnect: true` to turn the transport off.)

---

## 3. Opting into multi-network

### 3.1 dApp

```ts
import { DAppClient } from '@tezos-x/octez.connect-dapp'
import { TezosBlockchain } from '@tezos-x/octez.connect-blockchain-tezos'

const client = new DAppClient({
  name: 'My dApp',
  network: { type: NetworkType.MAINNET },
  // Optional: require a multi-network-capable wallet (rejects v4.8.6 wallets
  // with VersionUnsupportedBeaconError instead of degrading to one account).
  requiredMinimumVersion: '4'
})

// TezosBlockchain is registered by DEFAULT in v5 — no addBlockchain call
// needed (calling it again to override is still allowed).

// Ask for several networks at once (CAIP-2 chain ids):
await client.requestPermissions({
  networks: [
    { chainId: 'tezos:NetXdQprcVkpaWU' }, // mainnet
    { chainId: 'tezos:NetXsqzbfFenSTS' }  // shadownet
  ]
})

// One AccountInfo is materialised per granted network; each carries network.chainId:
const accounts = await client.getAccounts()

// Target a specific network on an operation:
await client.requestOperation({
  network: 'tezos:NetXsqzbfFenSTS',
  operationDetails: [ /* ... */ ]
})
```

Key points:
- **No registration needed:** `DAppClient` and `WalletClient` register
  `TezosBlockchain` by default. `addBlockchain` remains public for other
  chains or overrides.
- **Over WalletConnect**, `requestPermissions({ networks })` drives the WC
  **session proposal**: your preferred network stays in `requiredNamespaces`,
  the extra networks go to `optionalNamespaces` — a single-network wallet
  (e.g. Kukai iOS today) simply ignores the optionals and keeps working with
  one network; a multi-network wallet approves accounts per chain. Networks
  must map to a known genesis id (table in §5); unmapped ids are excluded
  from the WC proposal. The proposal is fixed at pairing time: widening the
  network set on a live WC session requires re-pairing.
- `requestPermissions({ networks })` is **additive** — omit `networks` and
  behaviour is exactly as before (one account).
- `requestOperation({ network })` takes a **CAIP‑2 string**
  (`tezos:<NetID>`). On a multi-network session it is **required** (omitting it
  throws `NetworksUnsupportedBeaconError` — "specify a network"); on a
  single-network/legacy session it is optional.
- New error types to handle: `NetworksUnsupportedBeaconError`,
  `VersionUnsupportedBeaconError`, `InvalidRequiredMinimumVersionError`,
  `InvalidBeaconVersionError` (all exported from `@tezos-x/octez.connect-core`
  and the umbrella SDK).

### 3.2 Wallet

To support multi-network, on a permission request read the optional
`message.networks` array and return an `accounts` map keyed by CAIP‑2 chain id;
otherwise respond exactly as before (the dApp handles the single-account case).

```ts
// Incoming PermissionRequest may carry:
//   networks?: { chainId: string; rpcUrl?: string; name?: string }[]
if (Array.isArray(message.networks) && message.networks.length > 0) {
  response.accounts = {}
  for (const n of message.networks) {
    response.accounts[n.chainId] = {
      publicKey,                // per-network key/address
      address,
      name: n.name              // optional label for your UI
    }
  }
}
await client.respond(response)
```

Also: **`OperationRequest.network` is now `Network | string`.** On the
multi-network path it arrives as a CAIP‑2 string; discriminate with `typeof`:

```ts
const net = typeof request.network === 'string'
  ? resolveNetworkFromCaip2(request.network) // your mapping
  : request.network
```

A wallet that ignores `message.networks` stays fully compatible — it simply
returns a single account and the dApp treats the session as single-network.

---

## 4. Everything else that changed in v5 (advantages & burdens)

### New capabilities (advantages)

| Area | Change | Benefit |
|------|--------|---------|
| Multi-network | `networks` request + `accounts` fanout + CAIP‑2 operation routing | One pairing spans several chains; fewer pairing round‑trips. |
| Version negotiation | `protocolVersion` pairing-marker handshake, `requiredMinimumVersion`, strict version parsing (`BEACON_VERSION` `3`→`4`) | dApps can require capabilities and reject incompatible wallets with a clear, typed error instead of failing mysteriously. |
| Structured errors & diagnostics | New `BEACON_ERROR_CODES` / error‑code modules, `gatherDiagnostics`, `buildErrorContext`, `ErrorContext`, `DiagnosticSnapshot` | Programmatic error discrimination and better bug reports. |
| Wallet list | Now downloaded from a **pinned** release and shipped as JSON (`@tezos-x/octez.connect-ui/data/*.json`, a new exported subpath); v4.8.6 generated it at build | Reproducible builds; you can import the list directly. |

### Costs / things to watch (burdens)

- **A few removed options/APIs** (`disclaimerText`, `requestTimeoutMs`,
  `disconnect`/`removeAllPeers` options, `subscribeToDisconnect`,
  `PeerUnreachableBeaconError`) require small code edits — see §2.
- **No built‑in request timeout** anymore — add your own if you need one.
- **WalletConnect 2.23.x** — re‑verify wallets sensitive to the WC relay
  version (notably Kukai iOS).
- **No `addBlockchain` call is needed** — `TezosBlockchain` is registered by
  default in both clients (see §3.1); `addBlockchain` remains public for other
  chains or to override the default.
- **Wire note (advanced):** for peers negotiated at protocol v2+, the message
  serializer uses plain JSON rather than the bs58check envelope. This is
  transparent unless you inspect/validate raw transport bytes; pairing and
  postMessage still use the v1 (bs58) format by default.

---

## 5. Quick reference

**New `DAppClientOptions`:** `requiredMinimumVersion?: string` (decimal‑integer
string in `[1, BEACON_VERSION]`; default `'2'` = accept any wallet).

**NetworkType ↔ genesis chain id table** (used at the WalletConnect boundary;
RPC‑sourced and locked by unit test):

| NetworkType | Genesis (CAIP‑2 reference) |
|---|---|
| `mainnet` | `NetXdQprcVkpaWU` |
| `ghostnet` (deprecated, succeeded by `shadownet`) | `NetXnHfVqm9iesp` |
| `shadownet` | `NetXsqzbfFenSTS` |
| `tezosx-mainnet` | `NetXohUVN5QWR4f` |
| `ushuaianet` | `NetXpX8WSZkAZZA` |

`tezosx-mainnet` is the Tezos X L2 (Michelson runtime) — the same Tezos
smart-contract language, so it needs no separate blockchain handler; it is
addressed like any other Tezos chain by its CAIP‑2 id.

`weeklynet`/`dailynet` (rotating genesis), `custom`, and networks without a
public RPC (`tallinnnet`, `seoulnet`, `tezlink-shadownet`,
`tezosx-previewnet`, `tezosx-shadownet`) are not statically mappable —
multi-network requests for them travel over P2P/postmessage only (chain ids
pass through opaquely).

**New request/response types** (`@tezos-x/octez.connect-types`):
`RequestPermissionNetwork` (`{ chainId; rpcUrl?; name? }`),
`PermissionResponseAccount` / `PermissionResponseAccounts`,
`RequestPermissionInput.networks?`, `RequestOperationInput.network?`,
`Network.chainId?`, `OperationRequest.network: Network | string`.

**Removed (breaking):** `DAppClientOptions.disclaimerText`,
`DAppClientOptions.requestTimeoutMs`, `DAppClientDisconnectOptions`,
`DAppClientRemoveAllPeersOptions`, `PeerUnreachableBeaconError`,
`WalletClient.subscribeToDisconnect` / `unsubscribeFromDisconnect`.

**Changed defaults/behaviour:** `BEACON_VERSION` `3` → `4`;
Tezos identifier `'xtz'` → `'tezos'` (with a `'xtz'` legacy registry alias);
no built‑in request timeout; WalletConnect `2.18.0` → `2.23.6`;
`TezosBlockchain` registered by default in both clients; the wire dialect is
negotiated per peer (wrapped v3/v4 for capable peers, flat v2 otherwise) —
transparent to integrators.

> Note: passing `network` to `requestPermissions()` already threw in v4.8.6
> (set `network` on the `DAppClient` constructor) — unchanged in v5, listed
> only to avoid confusion.

---

*Applies to `@tezos-x/octez.connect-*` `5.0.4` and later. Package names and
Node/npm engine requirements are unchanged from v4.8.6.*
