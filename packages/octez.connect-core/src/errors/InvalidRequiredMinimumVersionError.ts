import { BeaconErrorType } from '@tezos-x/octez.connect-types'

import { BEACON_ERROR_CODES } from './error-codes'
import { BeaconError } from './BeaconError'

/**
 * Thrown at `DAppClient` construction time when `requiredMinimumVersion` is
 * not a parseable decimal-integer string, is below `1`, or exceeds the
 * SDK's own `BEACON_VERSION`. Configuration error; never emitted on the wire.
 *
 * @category Error
 */
export class InvalidRequiredMinimumVersionError extends BeaconError {
  public name: string = 'InvalidRequiredMinimumVersionError'
  public title: string = 'Invalid requiredMinimumVersion option'

  public readonly errorCode = BEACON_ERROR_CODES.INVALID_REQUIRED_MINIMUM_VERSION
  public readonly providedValue: string
  public readonly sdkBeaconVersion: string

  constructor(providedValue: string, sdkBeaconVersion: string, reason: string) {
    super(
      BeaconErrorType.UNKNOWN_ERROR,
      `Invalid requiredMinimumVersion "${providedValue}" (SDK BEACON_VERSION = "${sdkBeaconVersion}"): ${reason}`,
      BEACON_ERROR_CODES.INVALID_REQUIRED_MINIMUM_VERSION
    )
    this.providedValue = providedValue
    this.sdkBeaconVersion = sdkBeaconVersion
  }
}
