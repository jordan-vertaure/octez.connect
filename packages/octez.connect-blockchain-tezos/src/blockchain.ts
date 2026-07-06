import {
  Blockchain,
  BlockchainMessage,
  PermissionResponseV3,
  PermissionResponseAccounts,
  ResponseInput,
  App,
  DesktopApp,
  ExtensionApp,
  WebApp,
  Network,
  NetworkType,
  PermissionScope
} from '@tezos-x/octez.connect-types'
import {
  getAccountIdentifier,
  isMultiNetworkVersion,
  isValidTezosCaip2,
  Logger,
  networkFromTezosCaip2,
  normalizeTezosCaip2
} from '@tezos-x/octez.connect-core'
import bundledTezosRegistry from '@tezos-x/octez.connect-ui/data/tezos.json'
import { loadWalletLists } from '@tezos-x/octez.connect-utils'

const { desktopList, extensionList, iOSList, webList } = loadWalletLists(bundledTezosRegistry)

const logger = new Logger('TezosBlockchain')

interface TezosPermissionBlockchainData {
  scopes?: PermissionScope[]
  publicKey?: string
  address?: string
  network?: Network
  accounts?: PermissionResponseAccounts
}

export class TezosBlockchain implements Blockchain {
  // CAIP-2 namespace. Must match the `blockchainIdentifier` field on the
  // wire (PermissionRequestV3/PermissionResponseV3 — see
  // packages/octez.connect-types/src/types/beaconV3/PermissionRequest.ts)
  // and the Substrate handler's `'substrate'` convention. Previously this was
  // the coin ticker `'xtz'`, which silently broke every registry lookup
  // keyed on the wire identifier (the wallet's OutgoingResponseInterceptor
  // and the dApp's v4 fanout parser both go through `blockchains.get`).
  public readonly identifier: string = 'tezos'
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
    permissionResponse: PermissionResponseV3<'tezos'>,
    peerVersion: string
  ): Promise<{
    accountId: string
    address: string
    publicKey: string
    network?: Network
    scopes: PermissionScope[]
  }[]> {
    const data = (permissionResponse.blockchainData ?? {}) as TezosPermissionBlockchainData
    const scopes = data.scopes ?? []
    const wirePublicKey: string = data.publicKey ?? ''
    const wireAddress: string = data.address ?? ''

    const isV4Session = isMultiNetworkVersion(peerVersion)
    const hasAccountsFanout =
      data.accounts && typeof data.accounts === 'object' && !Array.isArray(data.accounts)

    if (isV4Session && hasAccountsFanout && data.accounts) {
      // Reject malformed chain-id keys at ingest: a normalized key that is not
      // a valid Tezos CAIP-2 string would persist an account that no operation
      // request could ever target (resolveOperationNetwork requires CAIP-2),
      // i.e. a permanently-unusable account. Drop and log it instead.
      const validEntries = Object.entries(data.accounts).filter(([chainId]) => {
        const ok = isValidTezosCaip2(normalizeTezosCaip2(chainId))
        if (!ok) {
          logger.warn(
            'getAccountInfosFromPermissionResponse',
            `Dropping account under malformed CAIP-2 chain id "${chainId}"`
          )
        }

        return ok
      })

      return Promise.all(
        validEntries.map(async ([chainId, raw]) => {
          const normalizedChainId = normalizeTezosCaip2(chainId)
          const publicKey: string = raw?.publicKey ?? wirePublicKey
          const address: string = raw?.address ?? wireAddress
          const network = networkFromTezosCaip2(normalizedChainId, {
            name: raw?.name,
            rpcUrl: raw?.rpcUrl
          })

          return {
            accountId: await getAccountIdentifier(address, network),
            address,
            publicKey,
            network,
            scopes
          }
        })
      )
    }

    const legacyNetwork: Network | undefined = data.network
    const fallbackNetwork: Network = legacyNetwork ?? {
      type: NetworkType.CUSTOM,
      name: 'tezos'
    }

    return [
      {
        accountId: await getAccountIdentifier(wireAddress, fallbackNetwork),
        address: wireAddress,
        publicKey: wirePublicKey,
        network: legacyNetwork,
        scopes
      }
    ]
  }
}
