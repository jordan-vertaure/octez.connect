import { BeaconErrorType } from '@tezos-x/octez.connect-types'

import { BEACON_ERROR_CODES } from './error-codes'
import { BeaconError } from './BeaconError'

/**
 * Raised by the dApp-side SDK when a wallet's `peer.version` is lower than
 * the dApp's declared required minimum. SDK-internal; never emitted on the
 * wire. Consumers discriminate via `instanceof` or `errorCode`.
 *
 * @category Error
 */
export class VersionUnsupportedBeaconError extends BeaconError {
  public name: string = 'VersionUnsupportedBeaconError'
  public title: string = 'Wallet version not supported'

  public readonly errorCode = BEACON_ERROR_CODES.VERSION_UNSUPPORTED
  public readonly requiredMinimumVersion: string
  public readonly walletServedVersion: string

  constructor(requiredMinimumVersion: string, walletServedVersion: string, message?: string) {
    super(
      BeaconErrorType.UNKNOWN_ERROR,
      message ??
        `This dApp requires Octez.connect protocol version ${requiredMinimumVersion} or higher, ` +
          `but the wallet only supports version ${walletServedVersion}. Please upgrade your wallet.`,
      BEACON_ERROR_CODES.VERSION_UNSUPPORTED
    )
    this.requiredMinimumVersion = requiredMinimumVersion
    this.walletServedVersion = walletServedVersion
  }
}
