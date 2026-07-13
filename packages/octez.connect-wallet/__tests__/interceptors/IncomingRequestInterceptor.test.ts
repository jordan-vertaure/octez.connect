import { IncomingRequestInterceptor } from '../../src/interceptors/IncomingRequestInterceptor'

describe('IncomingRequestInterceptor.intercept() — malformed peer.version guard', () => {
  let interceptorCallback: jest.Mock
  let appMetadataManager: { getAppMetadata: jest.Mock; addAppMetadata: jest.Mock }

  beforeEach(() => {
    interceptorCallback = jest.fn()
    appMetadataManager = {
      getAppMetadata: jest.fn().mockResolvedValue({ senderId: 'sender', name: 'app' }),
      addAppMetadata: jest.fn().mockResolvedValue(undefined)
    }
  })

  it('does NOT throw when peer.version is malformed', async () => {
    const message = {
      version: 'NaN',
      senderId: 'sender',
      type: 'permission_request',
      id: 'id1'
      // Routing decision is made on peer.version alone; body shape is unused.
    }
    await expect(
      IncomingRequestInterceptor.intercept({
        message: message as never,
        connectionInfo: {} as never,
        appMetadataManager: appMetadataManager as never,
        interceptorCallback: interceptorCallback as never
      })
    ).resolves.toBeUndefined()
  })

  it('does NOT throw when peer.version is "<script>" (hostile peer probe)', async () => {
    const message = {
      version: '<script>',
      senderId: 'sender',
      type: 'permission_request',
      id: 'id1'
    }
    await expect(
      IncomingRequestInterceptor.intercept({
        message: message as never,
        connectionInfo: {} as never,
        appMetadataManager: appMetadataManager as never,
        interceptorCallback: interceptorCallback as never
      })
    ).resolves.toBeUndefined()
  })

  it('routes a malformed version as below the v4 threshold (no V4 handler dispatch)', async () => {
    // peer.version='NaN' should land in the legacy (non-v4) routing path.
    // Since 'NaN' !== '2' and usesWrappedMessages('NaN') is false (Number('NaN') is NaN, not finite),
    // the routing should hit none of the three branches → interceptorCallback never called.
    const message = {
      version: 'NaN',
      senderId: 'sender',
      type: 'permission_request',
      id: 'id1'
    }
    await IncomingRequestInterceptor.intercept({
      message: message as never,
      connectionInfo: {} as never,
      appMetadataManager: appMetadataManager as never,
      interceptorCallback: interceptorCallback as never
    })
    expect(interceptorCallback).not.toHaveBeenCalled()
  })
})
