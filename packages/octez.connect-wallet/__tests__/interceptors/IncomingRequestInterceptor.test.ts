import { BeaconMessageType } from '@tezos-x/octez.connect-types'
import { IncomingRequestInterceptor } from '../../src/interceptors/IncomingRequestInterceptor'

describe('IncomingRequestInterceptor.intercept()', () => {
  let interceptorCallback: jest.Mock
  let appMetadataManager: { getAppMetadata: jest.Mock; addAppMetadata: jest.Mock }

  beforeEach(() => {
    interceptorCallback = jest.fn()
    appMetadataManager = {
      getAppMetadata: jest.fn().mockResolvedValue({ senderId: 'sender', name: 'app' }),
      addAppMetadata: jest.fn().mockResolvedValue(undefined)
    }
  })

  const intercept = (message: unknown) =>
    IncomingRequestInterceptor.intercept({
      message: message as never,
      connectionInfo: {} as never,
      appMetadataManager: appMetadataManager as never,
      interceptorCallback: interceptorCallback as never
    })

  describe('malformed version guard (negotiated wire)', () => {
    it.each([
      ['malformed', 'NaN'],
      ['hostile probe', '<script>'],
      ['absent', undefined]
    ])('drops a %s version without throwing or dispatching', async (_label, version) => {
      await expect(
        intercept({ version, senderId: 'sender', type: 'permission_request', id: 'id1' })
      ).resolves.toBeUndefined()
      expect(interceptorCallback).not.toHaveBeenCalled()
    })
  })

  describe('legacy flat v2 dialect (backward compatibility)', () => {
    it('enriches and dispatches a flat v2 permission request unchanged', async () => {
      const message = {
        version: '2',
        senderId: 'sender',
        type: BeaconMessageType.PermissionRequest,
        id: 'id1',
        appMetadata: { senderId: 'sender', name: 'legacy dApp' },
        network: { type: 'mainnet' },
        scopes: ['sign']
      }
      await intercept(message)

      expect(appMetadataManager.addAppMetadata).toHaveBeenCalledWith(message.appMetadata)
      expect(interceptorCallback).toHaveBeenCalledWith(message, expect.anything())
    })

    it('enriches a flat v2 operation request with stored app metadata', async () => {
      await intercept({
        version: '2',
        senderId: 'sender',
        type: BeaconMessageType.OperationRequest,
        id: 'id2',
        network: { type: 'mainnet' },
        operationDetails: [{ kind: 'transaction' }],
        sourceAddress: 'tz1abc'
      })

      expect(interceptorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: BeaconMessageType.OperationRequest,
          appMetadata: { senderId: 'sender', name: 'app' },
          operationDetails: [{ kind: 'transaction' }]
        }),
        expect.anything()
      )
    })
  })

  describe('flat-output normalization (Tezos wallet-app API unchanged)', () => {
    it('normalizes a wrapped Tezos permission request to the flat output shape', async () => {
      await intercept({
        id: 'req-1',
        version: '4',
        senderId: 'real-sender',
        message: {
          blockchainIdentifier: 'tezos',
          type: BeaconMessageType.PermissionRequest,
          blockchainData: {
            appMetadata: { senderId: 'spoofed-sender', name: 'dApp' },
            scopes: ['sign'],
            network: { type: 'mainnet' },
            networks: [{ chainId: 'tezos:NetXdQprcVkpaWU' }]
          }
        }
      })

      expect(appMetadataManager.addAppMetadata).toHaveBeenCalledWith({
        // senderId must come from the envelope, not the dApp's claim.
        senderId: 'real-sender',
        name: 'dApp'
      })
      expect(interceptorCallback).toHaveBeenCalledWith(
        {
          type: BeaconMessageType.PermissionRequest,
          id: 'req-1',
          version: '4',
          senderId: 'real-sender',
          appMetadata: { senderId: 'real-sender', name: 'dApp' },
          scopes: ['sign'],
          network: { type: 'mainnet' },
          networks: [{ chainId: 'tezos:NetXdQprcVkpaWU' }]
        },
        expect.anything()
      )
    })

    it('normalizes a wrapped Tezos operation request to the flat output shape', async () => {
      await intercept({
        id: 'req-2',
        version: '4',
        senderId: 'sender',
        message: {
          blockchainIdentifier: 'tezos',
          type: BeaconMessageType.BlockchainRequest,
          accountId: 'acc',
          blockchainData: {
            type: 'operation_request',
            scope: 'operation_request',
            network: 'tezos:NetXdQprcVkpaWU',
            operationDetails: [{ kind: 'transaction' }],
            sourceAddress: 'tz1abc'
          }
        }
      })

      expect(interceptorCallback).toHaveBeenCalledWith(
        {
          type: BeaconMessageType.OperationRequest,
          id: 'req-2',
          version: '4',
          senderId: 'sender',
          appMetadata: { senderId: 'sender', name: 'app' },
          network: 'tezos:NetXdQprcVkpaWU',
          operationDetails: [{ kind: 'transaction' }],
          sourceAddress: 'tz1abc'
        },
        expect.anything()
      )
    })

    it('passes non-Tezos blockchain requests through wrapped (generic chain API)', async () => {
      const wrapped = {
        id: 'req-3',
        version: '3',
        senderId: 'sender',
        message: {
          blockchainIdentifier: 'substrate',
          type: BeaconMessageType.BlockchainRequest,
          accountId: 'acc',
          blockchainData: { type: 'transfer_request', scope: 'transfer' }
        }
      }
      await intercept(wrapped)

      expect(interceptorCallback).toHaveBeenCalledWith(wrapped, expect.anything())
    })
  })
})
