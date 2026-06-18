import { BeaconBaseMessage } from '../BeaconBaseMessage'
import { BeaconMessageType } from '../BeaconMessageType'
import { Network } from '../Network'
import { PartialTezosOperation } from '../../tezos/PartialTezosOperation'

/**
 * @category Message
 */
export interface OperationRequest extends BeaconBaseMessage {
  type: BeaconMessageType.OperationRequest
  /**
   * Network on which the operation will be broadcast. Legacy path: a Network
   * object. Multi-network path: a CAIP-2 chain id string. Wallet handlers
   * discriminate via `typeof`.
   */
  network: Network | string
  operationDetails: PartialTezosOperation[] // Partial TezosOperation that may lack certain information like counter and fee. Those will be added by the wallet.
  sourceAddress: string
}
