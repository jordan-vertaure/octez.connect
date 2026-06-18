import { NetworkType } from './NetworkType'

export interface Network {
  type: NetworkType
  name?: string
  rpcUrl?: string
  /**
   * Optional CAIP-2 chain id (e.g. `tezos:NetXsqzbfFenSTS`). Populated on the
   * v4 multi-network path; absent on the legacy single-network path.
   */
  chainId?: string
}
