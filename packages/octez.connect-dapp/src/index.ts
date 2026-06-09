export * from '@tezos-x/octez.connect-core'
export * from '@tezos-x/octez.connect-transport-matrix'
export * from '@tezos-x/octez.connect-transport-postmessage'
export * from '@tezos-x/octez.connect-types'
export * from '@tezos-x/octez.connect-utils'
export * from '@tezos-x/octez.connect-ui'

import {
  DAppClient,
  type DAppClientDisconnectOptions,
  type DAppClientRemoveAllPeersOptions
} from './dapp-client/DAppClient'
import { DAppClientOptions } from './dapp-client/DAppClientOptions'
import {
  BeaconEvent,
  BeaconEventHandler,
  defaultEventCallbacks,
  type BeaconEventType,
  type InvalidAccountDeactivatedEvent,
  type InvalidAccountDeactivatedReason
} from './events'
import { BlockExplorer } from './utils/block-explorer'
import { TzktBlockExplorer } from './utils/tzkt-blockexplorer'
import { getDAppClientInstance } from './utils/get-instance'

export { DAppClient, DAppClientOptions, getDAppClientInstance }
export type { DAppClientDisconnectOptions, DAppClientRemoveAllPeersOptions }

// Events
export { BeaconEvent, BeaconEventHandler, defaultEventCallbacks }
export type {
  BeaconEventType,
  InvalidAccountDeactivatedEvent,
  InvalidAccountDeactivatedReason
}

// BlockExplorer
export { BlockExplorer, TzktBlockExplorer, TzktBlockExplorer as TezblockBlockExplorer }
