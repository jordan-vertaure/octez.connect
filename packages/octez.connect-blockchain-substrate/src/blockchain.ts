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
import {
  fetchWalletListsFromGitHub,
  WalletLists,
  loadWalletLists
} from '@tezos-x/octez.connect-utils'
import { SubstratePermissionResponse } from './types/messages/permission-response'
import { bundledWalletRegistry as bundledSubstrateRegistry } from './data/bundled-wallet-registry'

let walletListsPromise: Promise<WalletLists> | undefined

// Fetch-first with bundled fallback: the live list comes from the
// wallet-list repo's CDN, so new wallets reach dApps without an SDK
// release; the generated snapshot keeps the alert working offline. A
// failed fetch is not cached, so the next call retries.
const resolveWalletLists = (): Promise<WalletLists> => {
  walletListsPromise ??= fetchWalletListsFromGitHub('substrate').then((registry) => {
    if (registry === null) {
      walletListsPromise = undefined
    }

    return loadWalletLists(registry ?? bundledSubstrateRegistry)
  })

  return walletListsPromise
}

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
    return resolveWalletLists()
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
