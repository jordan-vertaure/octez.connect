import {
  BeaconRequestOutputMessage,
  BeaconMessageType,
  PermissionRequestOutput,
  AppMetadata,
  OperationRequestOutput,
  SignPayloadRequestOutput,
  BroadcastRequestOutput,
  ProofOfEventChallengeRequestOutput,
  ConnectionContext,
  BeaconRequestMessage,
  BeaconMessageWrapper,
  BlockchainRequestV3,
  PermissionRequestV3,
  BeaconBaseMessage
  // EncryptPayloadRequestOutput
} from '@tezos-x/octez.connect-types'
import {
  AppMetadataManager,
  Logger,
  usesWrappedMessages,
  isMultiNetworkVersion,
  assertNever
} from '@tezos-x/octez.connect-core'
import { SimulatedProofOfEventChallengeRequestOutput } from '@tezos-x/octez.connect-types/dist/esm/types/beacon/messages/BeaconRequestOutputMessage'

const logger = new Logger('IncomingRequestInterceptor')

interface IncomingRequestInterceptorOptions {
  message: BeaconRequestMessage | BeaconMessageWrapper<BeaconBaseMessage>
  connectionInfo: ConnectionContext
  appMetadataManager: AppMetadataManager
  interceptorCallback(message: BeaconRequestOutputMessage, connectionInfo: ConnectionContext): void
}

// Annotation stamped onto the message so downstream wallet code can read the
// resolved peer.version directly rather than re-deriving it (and avoid
// confusing it with the inner `message.version` legacy-compat stamp).
type MessageWithPeerVersion = (
  | BeaconRequestMessage
  | BeaconMessageWrapper<BeaconBaseMessage>
) & {
  peerVersion?: string
}

interface IncomingRequestInterceptorOptionsV2 extends IncomingRequestInterceptorOptions {
  message: BeaconRequestMessage
}

interface IncomingRequestInterceptorOptionsV3 extends IncomingRequestInterceptorOptions {
  message: BeaconMessageWrapper<BeaconBaseMessage>
}
/**
 * @internalapi
 *
 * The IncomingRequestInterceptor is used in the WalletClient to intercept an incoming request and enrich it with data, like app metadata.
 */
export class IncomingRequestInterceptor {
  /**
   * The method that is called during the interception
   *
   * @param config
   */
  public static async intercept(config: IncomingRequestInterceptorOptions): Promise<void> {
    logger.log('INTERCEPTING REQUEST', config.message)

    // Route on the per-message envelope version, which carries the sender's
    // protocol version: a v4 SDK stamps its BEACON_VERSION on the outgoing
    // (wrapped) envelope, so v4 peers reach the multi-network branch while v2
    // and wrapped-v3 peers fall through to the legacy branches below. The
    // version is untrusted input, so isMultiNetworkVersion treats any
    // malformed value as below-threshold rather than crashing the pipeline.
    const peerVersion = config.message.version
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc requires the intersection cast to write `.peerVersion` onto the union type
    ;(config.message as MessageWithPeerVersion).peerVersion = peerVersion

    // Await each handler so rejections propagate back to WalletClient instead
    // of being dropped as floating promises.
    if (isMultiNetworkVersion(peerVersion)) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc requires this narrowing cast
      await IncomingRequestInterceptor.handleV4Message(config as IncomingRequestInterceptorOptionsV3)
    } else if (peerVersion === '2') {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc requires this narrowing cast
      await IncomingRequestInterceptor.handleV2Message(config as IncomingRequestInterceptorOptionsV2)
    } else if (usesWrappedMessages(peerVersion)) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc requires this narrowing cast
      await IncomingRequestInterceptor.handleV3Message(config as IncomingRequestInterceptorOptionsV3)
    }
  }

  private static async getAppMetadata(
    appMetadataManager: AppMetadataManager,
    senderId: string
  ): Promise<AppMetadata> {
    const appMetadata: AppMetadata | undefined = await appMetadataManager.getAppMetadata(senderId)
    if (!appMetadata) {
      throw new Error('AppMetadata not found')
    }

    return appMetadata
  }

  private static async handleV2Message(config: IncomingRequestInterceptorOptionsV2) {
    const {
      message,
      connectionInfo,
      appMetadataManager,
      interceptorCallback
    }: IncomingRequestInterceptorOptionsV2 = config

    switch (message.type) {
      case BeaconMessageType.PermissionRequest:
        {
          logger.log('PERMISSION REQUEST V*', message)
          // TODO: Remove v1 compatibility in later version
          if ((message.appMetadata as any).beaconId && !message.appMetadata.senderId) {
            message.appMetadata.senderId = (message.appMetadata as any).beaconId
            delete (message.appMetadata as any).beaconId
          }

          await appMetadataManager.addAppMetadata(message.appMetadata)
          const request: PermissionRequestOutput = message
          interceptorCallback(request, connectionInfo)
        }
        break
      case BeaconMessageType.OperationRequest:
        {
          const appMetadata: AppMetadata = await IncomingRequestInterceptor.getAppMetadata(
            appMetadataManager,
            message.senderId
          )
          const request: OperationRequestOutput = {
            appMetadata,
            ...message
          }
          interceptorCallback(request, connectionInfo)
        }
        break
      case BeaconMessageType.SignPayloadRequest:
        {
          const appMetadata: AppMetadata = await IncomingRequestInterceptor.getAppMetadata(
            appMetadataManager,
            message.senderId
          )
          const request: SignPayloadRequestOutput = {
            appMetadata,
            ...message
          }
          interceptorCallback(request, connectionInfo)
        }
        break
      // TODO: ENCRYPTION
      // case BeaconMessageType.EncryptPayloadRequest:
      //   {
      //     const appMetadata: AppMetadata = await IncomingRequestInterceptor.getAppMetadata(
      //       appMetadataManager,
      //       message.senderId
      //     )
      //     const request: EncryptPayloadRequestOutput = {
      //       appMetadata,
      //       ...message
      //     }
      //     interceptorCallback(request, connectionInfo)
      //   }
      //   break
      case BeaconMessageType.BroadcastRequest:
        {
          const appMetadata: AppMetadata = await IncomingRequestInterceptor.getAppMetadata(
            appMetadataManager,
            message.senderId
          )
          const request: BroadcastRequestOutput = {
            appMetadata,
            ...message
          }
          interceptorCallback(request, connectionInfo)
        }
        break
      case BeaconMessageType.ProofOfEventChallengeRequest:
        {
          const appMetadata: AppMetadata = await IncomingRequestInterceptor.getAppMetadata(
            appMetadataManager,
            message.senderId
          )
          const request: ProofOfEventChallengeRequestOutput = {
            appMetadata,
            ...message
          }
          interceptorCallback(request, connectionInfo)
        }
        break
      case BeaconMessageType.SimulatedProofOfEventChallengeRequest:
        {
          const appMetadata: AppMetadata = await IncomingRequestInterceptor.getAppMetadata(
            appMetadataManager,
            message.senderId
          )
          const request: SimulatedProofOfEventChallengeRequestOutput = {
            appMetadata,
            ...message
          }
          interceptorCallback(request, connectionInfo)
        }
        break
      default:
        logger.log('intercept', 'Message not handled')
        assertNever(message)
    }
  }

  /**
   * Multi-network protocol entry point (peer.version >= 4). The envelope
   * plumbing is shared with v3; per-blockchain handlers downstream consume
   * v4-specific fields without re-checking the version.
   */
  // v4 (multi-network) shares the v3 wrapped envelope: the multi-network data
  // (networks / CAIP-2 network) travels in the message body, which the v3
  // handler already passes through. This is the dedicated v4 entry point so
  // any future v4-only envelope handling has a single home.
  private static async handleV4Message(config: IncomingRequestInterceptorOptionsV3) {
    logger.log('INTERCEPTING REQUEST (peer.version >= 4, multi-network path)', config.message)
    await IncomingRequestInterceptor.handleV3Message(config)
  }

  private static async handleV3Message(config: IncomingRequestInterceptorOptionsV3) {
    const {
      message: msg,
      connectionInfo,
      appMetadataManager,
      interceptorCallback
    }: IncomingRequestInterceptorOptionsV3 = config

    const wrappedMessage:
      | BeaconMessageWrapper<PermissionRequestV3<string>>
      | BeaconMessageWrapper<BlockchainRequestV3<string>> = msg as any /* TODO: Remove any */

    const v3Message: PermissionRequestV3<string> | BlockchainRequestV3<string> =
      wrappedMessage.message

    switch (v3Message.type) {
      case BeaconMessageType.PermissionRequest:
        {
          await appMetadataManager.addAppMetadata({
            ...v3Message.blockchainData.appMetadata,
            senderId: msg.senderId
          }) // Make sure we use the actual senderId, not what the dApp told us
          const request: any /* PermissionRequestOutput */ = wrappedMessage
          interceptorCallback(request, connectionInfo)
        }
        break
      case BeaconMessageType.BlockchainRequest:
        {
          // const appMetadata: AppMetadata = await IncomingRequestInterceptor.getAppMetadata(
          //   appMetadataManager,
          //   msg.senderId
          // )
          const request: any /* BeaconMessageWrapper<BlockchainRequestV3<string>> */ = {
            ...wrappedMessage
          }
          interceptorCallback(request, connectionInfo)
        }
        break

      default:
        logger.log('intercept', 'Message not handled')
        assertNever(v3Message)
    }
  }
}


