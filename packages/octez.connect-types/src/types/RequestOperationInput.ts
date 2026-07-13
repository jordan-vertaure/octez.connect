import { PartialTezosOperation } from './tezos/PartialTezosOperation'

/**
 * @category DApp
 */
export interface RequestOperationInput {
  operationDetails: PartialTezosOperation[]
  /**
   * Optional CAIP-2 chain id (e.g. `'tezos:NetXsqzbfFenSTS'`) targeting a
   * specific network in a multi-network session. Required when the session
   * has more than one network; defaults to the single session network when
   * exactly one is available. Must match `/^tezos:[A-Za-z0-9]+$/`.
   */
  network?: string
}
