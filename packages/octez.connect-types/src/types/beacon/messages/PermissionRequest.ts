import { BeaconBaseMessage } from '../BeaconBaseMessage'
import { BeaconMessageType } from '../BeaconMessageType'
import { PermissionScope } from '../PermissionScope'
import { AppMetadata } from '../AppMetadata'
import { Network } from '../Network'
import { RequestPermissionNetwork } from '../../RequestPermissionInput'

/**
 * @category Message
 */
export interface PermissionRequest extends BeaconBaseMessage {
  type: BeaconMessageType.PermissionRequest
  appMetadata: AppMetadata // Some additional information about the DApp
  network: Network // Default network on which the permissions are requested. To request permissions on multiple networks in a single call, use the `networks` field below (v4+ wallets); legacy wallets only honor this single network per request.

  /**
   * Optional multi-network permission request. When non-empty, an upgraded
   * wallet (`peer.version >= '4'`) returns an `accounts` map keyed by
   * chainId; legacy wallets ignore the field.
   */
  networks?: RequestPermissionNetwork[]
  scopes: PermissionScope[] // The permission scopes that the DApp is asking for
}
