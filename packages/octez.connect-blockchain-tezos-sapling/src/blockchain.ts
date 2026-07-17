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
import { TezosSaplingPermissionResponse } from './types/messages/permission-response'
import { bundledWalletRegistry as bundledTezosSaplingRegistry } from './data/bundled-wallet-registry'

let walletListsPromise: Promise<WalletLists> | undefined

// Fetch-first with bundled fallback: the live list comes from the
// wallet-list repo's CDN, so new wallets reach dApps without an SDK
// release; the generated snapshot keeps the alert working offline. A
// failed fetch is not cached, so the next call retries.
const resolveWalletLists = (): Promise<WalletLists> => {
  walletListsPromise ??= fetchWalletListsFromGitHub('tezos-sapling').then((registry) => {
    if (registry === null) {
      walletListsPromise = undefined
    }

    return loadWalletLists(registry ?? bundledTezosSaplingRegistry)
  })

  return walletListsPromise
}

export class TezosSaplingBlockchain implements Blockchain {
  public readonly identifier: string = 'tezos-sapling'

  async validateRequest(_input: BlockchainMessage): Promise<void> {
    // No special validation required
  }

  async handleResponse(_input: ResponseInput): Promise<void> {
    // No special response handling required.
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
    permissionResponse: TezosSaplingPermissionResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by Blockchain interface; Sapling's wire shape does not vary on peer.version.
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
      publicKey: account.viewingKey ?? '', // Public key or viewing key is not shared in permission request for privacy reasons
      network: account.network,
      scopes: []
    }))
  }
}
