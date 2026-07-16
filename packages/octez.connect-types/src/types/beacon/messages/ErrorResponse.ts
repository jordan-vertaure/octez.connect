import { BeaconBaseMessage } from '../BeaconBaseMessage'
import { BeaconErrorType } from '../../BeaconErrorType'
import { BeaconMessageType } from '../BeaconMessageType'

/**
 * @category Message
 */
export interface ErrorResponse extends BeaconBaseMessage {
  type: BeaconMessageType.Error
  errorType: BeaconErrorType
  errorData?: any
  /**
   * Human-readable context for the error. Legacy parsers ignore unknown
   * fields, so it is safe on both wire dialects.
   */
  description?: string
}
