# `@tezos-x/octez.connect-dapp`

octez.connect dApp client for connecting Tezos dApps to wallets.

This is a primary package in the Trilitech-maintained octez.connect SDK line and may be installed directly.

## Install

```sh
npm install @tezos-x/octez.connect-dapp
```
## Package provenance

This package is published from the Trilitech-maintained octez.connect repository:
[trilitech/octez.connect](https://github.com/trilitech/octez.connect)

- Original Beacon lineage: [airgap-it/beacon-sdk](https://github.com/airgap-it/beacon-sdk)
- External maintenance line Trilitech may selectively import from: [ecadlabs/beacon-sdk-taquito-patches](https://github.com/ecadlabs/beacon-sdk-taquito-patches)

## Notes

- Trilitech publishes these packages under the `@tezos-x/octez.connect-*` scope
- Release notes, package policy, and the current package list live in the repository README

## Restoring persisted dApp sessions

Applications should restore Beacon connection state from the SDK, for example by
calling `client.getActiveAccount()`, instead of relying only on app-local markers
such as `wallet-provider=beacon`.

Treat a missing `beacon:active-account` storage entry as disconnected. Do not use
checks like `localStorage.getItem('beacon:active-account') !== 'undefined'` as a
valid restore guard, because `null` and corrupt stored state are not valid active
accounts.

When Beacon deactivates invalid stored active-account state, it emits
`BeaconEvent.INVALID_ACCOUNT_DEACTIVATED` with this payload:

```ts
{
  reason:
    | 'missing_active_account'
    | 'invalid_active_account_storage'
    | 'storage_validation_failed'
}
```

For backward compatibility, event handler types still allow this event data to
be `undefined`. Beacon's invalid active-account deactivation path emits the
object above; consumers that inspect the reason should handle an absent payload
defensively if they also support direct event emission or older Beacon versions.

Reason meanings:

- `missing_active_account`: `beacon:active-account` pointed at an account
  identifier that was not present in Beacon's persisted account list.
- `invalid_active_account_storage`: Beacon could not read or parse the persisted
  active-account/account storage needed to restore the account.
- `storage_validation_failed`: Beacon restored an active account, but a later
  storage validation pass still found invalid persisted session state.

The default UI intentionally keeps a generic "session expired" message for end
users, while the event payload and debug logs expose the specific restore failure
reason for applications and diagnostics.
