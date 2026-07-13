import { BeaconErrorType } from '@tezos-x/octez.connect-types'

import { BEACON_ERROR_CODES } from './error-codes'
import { BeaconError } from './BeaconError'

const defaultMessage = (input: {
  requestedNetworks: string[]
  unsupportedNetworks: string[]
}): string => {
  if (input.requestedNetworks.length === 0 && input.unsupportedNetworks.length === 0) {
    return 'Multiple networks are available in this session; specify a network argument on requestOperation.'
  }

  return `The wallet cannot serve all requested networks. Unsupported: ${input.unsupportedNetworks.join(', ')}.`
}

/**
 * Raised by the dApp-side SDK when a wallet cannot serve every requested
 * network, or when `requestOperation({ network })` targets a network not in
 * the current session. SDK-internal; never emitted on the wire. Distinct
 * from the wire-level `NetworkNotSupportedBeaconError` (singular).
 *
 * @category Error
 */
export class NetworksUnsupportedBeaconError extends BeaconError {
  public name: string = 'NetworksUnsupportedBeaconError'
  public title: string = 'Networks not supported'

  public readonly errorCode = BEACON_ERROR_CODES.NETWORKS_UNSUPPORTED
  public readonly requestedNetworks: string[]
  public readonly unsupportedNetworks: string[]

  constructor(input: {
    requestedNetworks: string[]
    unsupportedNetworks: string[]
    customMessage?: string
  }) {
    super(
      BeaconErrorType.UNKNOWN_ERROR,
      input.customMessage ?? defaultMessage(input),
      BEACON_ERROR_CODES.NETWORKS_UNSUPPORTED
    )
    this.requestedNetworks = input.requestedNetworks
    this.unsupportedNetworks = input.unsupportedNetworks
  }
}
