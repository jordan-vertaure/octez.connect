import {
  BeaconMessage,
  BeaconMessageType,
  Network,
  PermissionScope,
  PermissionEntity
} from '@tezos-x/octez.connect-types'
import { getAccountIdentifier } from '../utils/get-account-identifier'
import { networkFromTezosCaip2 } from '../utils/caip2'

/**
 * @internalapi
 *
 * The PermissionValidator is used to check if permissions for a certain message type have been given
 */
export class PermissionValidator {
  /**
   * Check if permissions were given for a certain message type.
   *
   * PermissionRequest and BroadcastRequest will always return true.
   *
   * @param message octez.connect message
   */
  public static async hasPermission(
    message: BeaconMessage,
    getOne: (id: string) => Promise<PermissionEntity | undefined>,
    getAll: () => Promise<PermissionEntity[]>
  ): Promise<boolean> {
    switch (message.type) {
      case BeaconMessageType.PermissionRequest:
      case BeaconMessageType.BroadcastRequest: {
        return true
      }
      case BeaconMessageType.OperationRequest: {
        // operation_request.network is now `Network | string`: on the v4 path
        // the wire carries a CAIP-2 string, which we coerce to the minimal
        // Network used to derive the account identifier (same helper the
        // permission-storage side uses, so the two ids match).
        const networkForId: Network =
          typeof message.network === 'string'
            ? networkFromTezosCaip2(message.network)
            : message.network
        const accountIdentifier: string = await getAccountIdentifier(
          message.sourceAddress,
          networkForId
        )

        const permission: PermissionEntity | undefined = await getOne(accountIdentifier)
        if (!permission) {
          return false
        }

        return permission.scopes.includes(PermissionScope.OPERATION_REQUEST)
      }
      case BeaconMessageType.SignPayloadRequest: {
        const permissions: PermissionEntity[] = await getAll()
        const filteredPermissions: PermissionEntity[] = permissions.filter(
          (permission: PermissionEntity) => permission.address === message.sourceAddress
        )

        if (filteredPermissions.length === 0) {
          return false
        }

        return filteredPermissions.some((permission: PermissionEntity) =>
          permission.scopes.includes(PermissionScope.SIGN)
        )
      }
      default:
        throw new Error('Message not handled')
    }
  }
}
