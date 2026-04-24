import { StorageKey, Storage, PostMessagePairingRequest } from '@tezos-x/octez.connect-types'
import { PostMessageTransport } from '@tezos-x/octez.connect-transport-postmessage'
import { KeyPair } from '@tezos-x/octez.connect-utils'

// const logger = new Logger('WalletPostMessageTransport')

/**
 * @internalapi
 *
 *
 */
export class WalletPostMessageTransport extends PostMessageTransport<
  PostMessagePairingRequest,
  StorageKey.TRANSPORT_POSTMESSAGE_PEERS_WALLET
> {
  constructor(name: string, keyPair: KeyPair, storage: Storage) {
    super(name, keyPair, storage, StorageKey.TRANSPORT_POSTMESSAGE_PEERS_WALLET)
  }
}
