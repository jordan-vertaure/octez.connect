import { PermissionScope } from './beacon/PermissionScope'

/**
 * One requested chain on a multi-network permission request. Read by the
 * wallet only on the `peer.version >= '4'` path; ignored by legacy handlers.
 * @category DApp
 */
export interface RequestPermissionNetwork {
  /** CAIP-2 chain identifier (e.g. `"tezos:NetXsqzbfFenSTS"`). */
  chainId: string

  /** Optional RPC endpoint hint. Wallets MAY prefer their own configured node. */
  rpcUrl?: string

  /** Optional human-readable name for the wallet's approval UI. */
  name?: string
}

/**
 * @category DApp
 */
export interface RequestPermissionInput {
  scopes?: PermissionScope[]

  /**
   * Optional list of chains the dApp wants access to. When non-empty, an
   * upgraded wallet (`peer.version >= '4'`) returns an `accounts` map keyed
   * by `chainId`; legacy wallets ignore the field.
   */
  networks?: RequestPermissionNetwork[]
}
