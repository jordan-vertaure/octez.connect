import {
  Blockchain,
  BlockchainMessage,
  ResponseInput,
  ExtensionApp,
  DesktopApp,
  WebApp,
  App,
  Network,
  PermissionScope
} from '@tezos-x/octez.connect-types'
import { SubstratePermissionResponse } from './types/messages/permission-response'
import bundledSubstrateRegistry from '@tezos-x/octez.connect-ui/data/substrate.json'
import { loadWalletLists } from '@tezos-x/octez.connect-utils'

const { desktopList, extensionList, iOSList, webList } = loadWalletLists(bundledSubstrateRegistry)

export class SubstrateBlockchain implements Blockchain {
  public readonly identifier: string = 'substrate'

  async validateRequest(input: BlockchainMessage): Promise<void> {
    // TODO: Validation
    if (input) {
      return
    }
  }
  async handleResponse(input: ResponseInput): Promise<void> {
    // TODO: Validation
    if (input) {
      return
    }
  }

  async getWalletLists(): Promise<{
    extensionList: ExtensionApp[]
    desktopList: DesktopApp[]
    webList: WebApp[]
    iOSList: App[]
  }> {
    return {
      extensionList: extensionList,
      desktopList: desktopList,
      webList: webList,
      iOSList: iOSList
    }
  }

  async getAccountInfosFromPermissionResponse(
    permissionResponse: SubstratePermissionResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by Blockchain interface; Substrate's wire shape does not vary on peer.version.
    _peerVersion: string
  ): Promise<{
    accountId: string;
    address: string;
    publicKey: string;
    network?: Network;
    scopes: PermissionScope[];
  }[]> {
    return permissionResponse.blockchainData.accounts.map((account) => ({
      accountId: account.accountId,
      address: account.address,
      publicKey: account.publicKey,
      network: account.network as any,
      scopes: permissionResponse.blockchainData.scopes as any
    }))
  }
}
