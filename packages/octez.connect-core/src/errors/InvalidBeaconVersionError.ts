import { BeaconErrorType } from '@tezos-x/octez.connect-types'

import { BEACON_ERROR_CODES } from './error-codes'
import { BeaconError } from './BeaconError'

/**
 * Raised by `compareBeaconVersion()` when either operand fails its strict
 * decimal-integer validation. SDK-internal: never serialized to the wire.
 * Consumers discriminate via `instanceof` or the `errorCode` field; the
 * BeaconErrorType is `UNKNOWN_ERROR` only to satisfy the base contract.
 *
 * @category Error
 */
export class InvalidBeaconVersionError extends BeaconError {
  public name: string = 'InvalidBeaconVersionError'
  public title: string = 'Invalid Beacon version'

  public readonly errorCode = BEACON_ERROR_CODES.INVALID_BEACON_VERSION
  public readonly a: unknown
  public readonly b: unknown

  constructor(a: unknown, b: unknown) {
    super(
      BeaconErrorType.UNKNOWN_ERROR,
      `Invalid peer.version comparison: a=${JSON.stringify(a)}, b=${JSON.stringify(b)}`,
      BEACON_ERROR_CODES.INVALID_BEACON_VERSION
    )
    this.a = a
    this.b = b
  }
}
