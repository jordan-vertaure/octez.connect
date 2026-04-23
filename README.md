# Octez Connect SDK

[![npm](https://img.shields.io/npm/v/@tezos-x/octez.connect-sdk.svg?colorB=brightgreen)](https://www.npmjs.com/package/@tezos-x/octez.connect-sdk)
[![documentation](https://img.shields.io/badge/documentation-online-brightgreen.svg)](https://octez-connect.tezos.com)
[![GitHub Action](https://github.com/trilitech/octez.connect/workflows/Build%2C%20Test%20and%20Analyze/badge.svg)](https://github.com/trilitech/octez.connect/actions?query=workflow%3A%22Build%2C+Test+and+Analyze%22+branch%3Amain)

> Connect Wallets with dApps on Tezos

[Octez Connect](https://octez-connect.tezos.com) is the implementation of the wallet interaction standard [tzip-10](https://gitlab.com/tzip/tzip/blob/master/proposals/tzip-10/tzip-10.md) which describes the connection of a dApp with a wallet.

## Intro

The `octez.connect-sdk` simplifies and abstracts the communication between dApps and wallets over different transport layers.

Developers that plan to develop complex smart contract interactions can use [Octez.js](https://github.com/trilitech/octez.js) with the `BeaconWallet`, which uses this SDK under the hood, but provides helpful methods to interact with contracts.

Besides this Typescript SDK, we also provide SDKs for native iOS and Android Wallets:

- [Octez.connect Android SDK (Kotlin)](https://github.com/trilitech/octez.connect-android-sdk)
- [Octez.connect iOS SDK (Swift)](https://github.com/trilitech/octez.connect-ios-sdk)

## Documentation

The documentation can be found [here](https://octez-connect.tezos.com/), technical documentation can be found [here](https://typedocs.octez-connect.tezos.com/).

## Installation

```
npm i --save @tezos-x/octez.connect-sdk
```

## Example DApp integration

```ts
import { DAppClient } from '@tezos-x/octez.connect-sdk'

const dAppClient = new DAppClient({ name: 'My Sample DApp' })

// Listen for all the active account changes
dAppClient.subscribeToEvent(BeaconEvent.ACTIVE_ACCOUNT_SET, async (account) => {
  // An active account has been set, update the dApp UI
  console.log(`${BeaconEvent.ACTIVE_ACCOUNT_SET} triggered: `, account)
})

try {
  console.log('Requesting permissions...')
  const permissions = await dAppClient.requestPermissions()
  console.log('Got permissions:', permissions.address)
} catch (error) {
  console.error('Got error:', error)
}
```

For a more complete example, see [`examples/dapp.html`](./examples/dapp.html).

## Example Wallet integration

```ts
const client = new WalletClient({ name: 'My Wallet' })
await client.init() // Establish P2P connection

client
  .connect(async (message) => {
    // Example: Handle PermissionRequest. A wallet should handle all request types
    if (message.type === BeaconMessageType.PermissionRequest) {
      // Show a UI to the user where he can confirm sharing an account with the DApp

      const response: PermissionResponseInput = {
        type: BeaconMessageType.PermissionResponse,
        network: message.network, // Use the same network that the user requested
        scopes: [PermissionScope.OPERATION_REQUEST], // Ignore the scopes that have been requested and instead give only operation permissions
        id: message.id,
        publicKey: 'tezos public key'
      }

      // Send response back to DApp
      await client.respond(response)
    }
  })
  .catch((error) => console.error('connect error', error))
```

For a more complete example, see [`examples/wallet.html`](./examples/wallet.html).

## Adding a wallet to octez.connect

Wallets are managed in the [beacon-wallet-list](https://github.com/airgap-it/beacon-wallet-list) repository. Please create a PR there to add your wallet.

For iOS wallets, the wallet needs to define a custom url scheme to support the same-device functionality.

## Development

```
$ npm ci
$ npm run check:versions
$ npm run build
$ npm run test
$ npm run e2e:smoke
```

Once the SDK is built, you can open [`examples/dapp.html`](./examples/dapp.html) or
[`examples/wallet.html`](./examples/wallet.html) in your
browser and try the basic functionality. To support browser extensions, the
examples should be served over HTTP rather than opened directly from disk.
