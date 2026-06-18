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
  network: Network // Network on which the permissions are requested. Only one network can be specified. In case you need permissions on multiple networks, you need to request permissions multiple times

  /**
   * Optional multi-network permission request. When non-empty, an upgraded
   * wallet (`peer.version >= '4'`) returns an `accounts` map keyed by
   * chainId; legacy wallets ignore the field.
   */
  networks?: RequestPermissionNetwork[]
  scopes: PermissionScope[] // The permission scopes that the DApp is asking for
}
