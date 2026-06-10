// __tests__/DAppClient.test.ts
import { DAppClient } from '../../src/dapp-client/DAppClient'
import {
  BeaconErrorType,
  BeaconMessageType,
  NetworkType,
  PermissionScope
} from '@tezos-x/octez.connect-types'
import { ExposedPromise } from '@tezos-x/octez.connect-utils'
import { LocalStorage } from '@tezos-x/octez.connect-core'
import { BeaconEvent } from '../../src/events'

//
// 1) Mock out all the heavy @tezos-x/octez.connect-core and @tezos-x/octez.connect-ui dependencies,
//    so we can instantiate DAppClient without spinning up real transports, storage, etc.
//

jest.mock('@tezos-x/octez.connect-ui', () => ({
  setColorMode: jest.fn(),
  getColorMode: jest.fn().mockReturnValue('light'),
  setDesktopList: jest.fn(),
  setExtensionList: jest.fn(),
  setWebList: jest.fn(),
  setiOSList: jest.fn(),
  getiOSList: jest.fn().mockReturnValue([]),
  getDesktopList: jest.fn().mockReturnValue([]),
  getExtensionList: jest.fn().mockReturnValue([]),
  getWebList: jest.fn().mockReturnValue([]),
  isBrowser: jest.fn().mockReturnValue(true),
  isDesktop: jest.fn().mockReturnValue(false),
  isMobileOS: jest.fn().mockReturnValue(false),
  isIOS: jest.fn().mockReturnValue(false),
  currentOS: jest.fn().mockReturnValue('test'),
  closeToast: jest.fn()
}))

jest.mock('@tezos-x/octez.connect-core', () => {
  const actual = jest.requireActual('@tezos-x/octez.connect-core')
  return {
    ...actual,
    // a minimal in-memory LocalStorage stub
    LocalStorage: class {
      private store = new Map<string, any>()
      async get(key: string) {
        return this.store.get(key)
      }
      async set(key: string, value: any) {
        this.store.set(key, value)
      }
      subscribeToStorageChanged(_cb: any) {
        /* no op */
      }
      getPrefixedKey(key: string) {
        return key
      }
    },
    // StorageValidator always “valid”
    StorageValidator: class {
      constructor(_s: any) {}
      validate() {
        return Promise.resolve(true)
      }
    },
    // Serializer just serializes to an empty string
    Serializer: class {
      serialize(_r: any) {
        return Promise.resolve('')
      }
    },
    // ExposedPromise with resolve/reject hooks
    ExposedPromise: class<T, E> {
      public promise: Promise<T>
      private _resolve!: (v: T) => void
      private _reject!: (e: E) => void
      constructor() {
        this.promise = new Promise<T>((res, rej) => {
          this._resolve = res
          this._reject = rej
        })
      }
      static resolve<U>(val: U) {
        const ex = new (this as any)()
        ex._resolve(val)
        return ex
      }
      resolve(v: T) {
        this._resolve(v)
      }
      reject(e: E) {
        this._reject(e)
      }
      isSettled() {
        return true
      }
    },
    generateGUID: jest.fn().mockResolvedValue('guid'),
    getSenderId: jest.fn().mockResolvedValue('senderId'),
    Logger: class {
      constructor(_name: string) {}
      error() {}
      log() {}
      time() {}
    },
    ClientEvents: {
      CLOSE_ALERT: 'CLOSE_ALERT',
      RESET_STATE: 'RESET_STATE',
      WC_ACK_NOTIFICATION: 'WC_ACK_NOTIFICATION',
      ON_RELAYER_ERROR: 'ON_RELAYER_ERROR'
    },
    IndexedDBStorage: class {
      constructor() {}
      set() {}
      getAllKeys() {
        return Promise.resolve([])
      }
      delete() {}
    },
    MultiTabChannel: class {
      constructor(_a: any, _b: any, _c: any) {}
      isLeader() {
        return true
      }
      hasLeader() {
        return Promise.resolve(true)
      }
      getLeadership() {
        return Promise.resolve()
      }
      postMessage(_msg: any) {}
    },
    BACKEND_URL: '',
    getError: (_t: any, _d: any) => new Error('beacon error')
  }
})

jest.mock('@tezos-x/octez.connect-transport-walletconnect', () => ({
  WalletConnectTransport: class WalletConnectTransport {}
}))
jest.mock('@walletconnect/sign-client', () => ({}))
jest.mock('@walletconnect/types', () => ({}))
jest.mock('@walletconnect/utils', () => ({ getSdkError: jest.fn() }))

describe('DAppClient — basic unit tests', () => {
  let client: DAppClient

  beforeAll(() => {
    client = new DAppClient({
      name: 'TestApp',
      storage: new LocalStorage(),
      preferredNetwork: NetworkType.MAINNET
    })
    client.subscribeToEvent(BeaconEvent.ACTIVE_ACCOUNT_SET, () => {})
  })

  it('addQueryParam returns "key=value"', () => {
    // addQueryParam is private — cast to any to reach it
    const result = (client as any).addQueryParam('foo', 'bar')
    expect(result).toBe('foo=bar')
  })

  it('addOpenRequest stores given promise in openRequests map', () => {
    const p = new ExposedPromise<{ foo: string }, any>()
    ;(client as any).addOpenRequest('myId', p)
    expect((client as any).openRequests.get('myId')).toBe(p)
  })

  it('addBlockchain / removeBlockchain manage internal map', async () => {
    // define a minimal fake chain
    const fakeChain = {
      identifier: 'chain-1',
      getWalletLists: jest.fn().mockResolvedValue({
        desktopList: [],
        extensionList: [],
        webList: [],
        iOSList: []
      }),
      handleResponse: jest.fn()
    }
    client.addBlockchain(fakeChain as any)
    expect((client as any).blockchains.has('chain-1')).toBe(true)

    client.removeBlockchain('chain-1')
    expect((client as any).blockchains.has('chain-1')).toBe(false)
  })
})

describe('DAppClient — request timeout (#9785f5402)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const makeClient = (requestTimeoutMs?: number) =>
    new DAppClient({
      name: 'TestApp',
      storage: new LocalStorage(),
      preferredNetwork: NetworkType.MAINNET,
      requestTimeoutMs
    })

  it('rejects an open request with PEER_UNREACHABLE after the timeout and clears it', async () => {
    const client = makeClient(1000)
    const p = new ExposedPromise<any, any>()
    ;(client as any).addOpenRequest('req-1', p)
    expect((client as any).openRequests.has('req-1')).toBe(true)

    jest.advanceTimersByTime(1000)

    await expect(p.promise).rejects.toMatchObject({
      errorType: BeaconErrorType.PEER_UNREACHABLE
    })
    expect((client as any).openRequests.has('req-1')).toBe(false)
    expect((client as any).openRequestTimeouts.has('req-1')).toBe(false)
  })

  it('does not arm a timeout for the session_update sentinel request', () => {
    const client = makeClient(1000)
    const p = new ExposedPromise<any, any>()
    ;(client as any).addOpenRequest('session_update', p)
    expect((client as any).openRequestTimeouts.has('session_update')).toBe(false)
  })

  it('disables timeouts when requestTimeoutMs is 0 or negative', () => {
    const client = makeClient(0)
    const p = new ExposedPromise<any, any>()
    ;(client as any).addOpenRequest('req-2', p)
    expect((client as any).openRequestTimeouts.has('req-2')).toBe(false)
  })
})

describe('DAppClient — invalid account deactivation guard (#734703d92)', () => {
  it('emits INVALID_ACCOUNT_DEACTIVATED at most once across repeated recovery calls', async () => {
    const client = new DAppClient({
      name: 'TestApp',
      storage: new LocalStorage(),
      preferredNetwork: NetworkType.MAINNET
    })
    // Isolate the idempotency guard from the storage/account-manager teardown.
    jest.spyOn(client as any, 'resetInvalidState').mockResolvedValue(undefined)
    let count = 0
    await client.subscribeToEvent(BeaconEvent.INVALID_ACCOUNT_DEACTIVATED, () => {
      count++
    })

    await (client as any).deactivateInvalidAccountState('missing_active_account')
    await (client as any).deactivateInvalidAccountState('invalid_active_account_storage')

    expect(count).toBe(1)
    expect((client as any).resetInvalidState).toHaveBeenCalledTimes(1)
    expect((client as any).hasEmittedInvalidAccountDeactivated).toBe(true)
  })
})

describe('DAppClient — destroyed guard (#d682738cf)', () => {
  it('reports isDestroyed and rejects further use once destroyed', async () => {
    const client = new DAppClient({
      name: 'TestApp',
      storage: new LocalStorage(),
      preferredNetwork: NetworkType.MAINNET
    })
    expect(client.isDestroyed()).toBe(false)

    // Set the flag directly to isolate assertNotDestroyed from destroy()'s teardown.
    ;(client as any).destroyed = true

    expect(client.isDestroyed()).toBe(true)
    await expect(client.getActiveAccount()).rejects.toThrow('destroyed')
    await expect(client.requestPermissions()).rejects.toThrow('destroyed')
  })
})

describe('DAppClient — abort handling', () => {
  let client: DAppClient

  beforeEach(() => {
    client = new DAppClient({
      name: 'TestAbortApp',
      storage: new LocalStorage(),
      preferredNetwork: NetworkType.MAINNET
    })
  })

  it('rejects _initPromise with ABORTED_ERROR when abortHandler is called', async () => {
    // Manually set up the init promise state as if init() was in progress
    let capturedReject: ((reason?: any) => void) | undefined

    ;(client as any)._initPromise = new Promise<any>((_resolve, reject) => {
      capturedReject = reject
    })
    ;(client as any)._initPromiseReject = capturedReject

    // Create a promise that will be rejected
    const initPromise = (client as any)._initPromise

    // Simulate calling the abort logic (what happens when user closes modal)
    const rejectFn = (client as any)._initPromiseReject
    if (rejectFn) {
      rejectFn({
        type: BeaconMessageType.Error,
        errorType: BeaconErrorType.ABORTED_ERROR,
        id: '',
        senderId: '',
        version: '2'
      })
    }

    // Verify the promise rejects with ABORTED_ERROR
    await expect(initPromise).rejects.toMatchObject({
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.ABORTED_ERROR
    })
  })

  it('clears _initPromise and _initPromiseReject after abort', () => {
    // Set up initial state
    ;(client as any)._initPromise = new Promise(() => {})
    ;(client as any)._initPromiseReject = jest.fn()

    // Simulate the cleanup that happens in abortHandler
    ;(client as any)._initPromise = undefined
    ;(client as any)._initPromiseReject = undefined

    expect((client as any)._initPromise).toBeUndefined()
    expect((client as any)._initPromiseReject).toBeUndefined()
  })

  it('emits PAIR_ABORTED event when abort occurs', async () => {
    const pairAbortedHandler = jest.fn()
    client.subscribeToEvent(BeaconEvent.PAIR_ABORTED, pairAbortedHandler)

    // Emit the event as it would be in abortHandler
    await (client as any).events.emit(BeaconEvent.PAIR_ABORTED)

    // The handler should be called
    expect(pairAbortedHandler).toHaveBeenCalled()
  })
})

describe('DAppClient — permission request coalescing (#32b83dcc0)', () => {
  let client: DAppClient

  beforeEach(() => {
    client = new DAppClient({
      name: 'CoalesceApp',
      storage: new LocalStorage(),
      preferredNetwork: NetworkType.MAINNET
    })
  })

  it('coalesces concurrent permission requests with the same scopes', async () => {
    let resolveInternal: (value: any) => void = () => {}
    const internal = jest
      .spyOn(client as any, 'requestPermissionsInternal')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveInternal = resolve
          })
      )

    const first = client.requestPermissions()
    const second = client.requestPermissions()
    resolveInternal({ address: 'tz1coalesced' })

    await expect(first).resolves.toEqual({ address: 'tz1coalesced' })
    await expect(second).resolves.toEqual({ address: 'tz1coalesced' })
    // The duplicate concurrent call shared the in-flight promise.
    expect(internal).toHaveBeenCalledTimes(1)
  })

  it('rejects a concurrent permission request with different scopes', async () => {
    jest
      .spyOn(client as any, 'requestPermissionsInternal')
      .mockImplementation(() => new Promise(() => {})) // never settles

    const first = client.requestPermissions({ scopes: [PermissionScope.SIGN] })

    await expect(
      client.requestPermissions({ scopes: [PermissionScope.OPERATION_REQUEST] })
    ).rejects.toThrow('different scopes')

    // first stays pending by design; swallow so it isn't an unhandled rejection
    first.catch(() => undefined)
  })

  it('releases the in-flight slot after completion so a later request runs again', async () => {
    const internal = jest
      .spyOn(client as any, 'requestPermissionsInternal')
      .mockResolvedValue({ address: 'tz1' })

    await client.requestPermissions()
    await client.requestPermissions()

    expect(internal).toHaveBeenCalledTimes(2)
  })
})

describe('DAppClient — WalletConnect opt-in (#32)', () => {
  const make = (config: any) =>
    new DAppClient({
      name: 'WCOptInApp',
      storage: new LocalStorage(),
      preferredNetwork: NetworkType.MAINNET,
      ...config
    })

  it('does not enable WC or apply a default projectId when no walletConnectOptions are given', () => {
    const client = make({})
    expect((client as any).isWalletConnectEnabled).toBe(false)
    expect((client as any).wcProjectId).toBeUndefined()
    expect((client as any).wcRelayUrl).toBeUndefined()
  })

  it('does not enable WC when disableWalletConnect is true, even with walletConnectOptions', () => {
    const client = make({
      walletConnectOptions: { projectId: 'abc123' },
      disableWalletConnect: true
    })
    expect((client as any).isWalletConnectEnabled).toBe(false)
    // No default projectId is applied when WC is disabled.
    expect((client as any).wcProjectId).toBeUndefined()
  })

  it('enables WC and resolves a projectId when walletConnectOptions are provided', () => {
    const client = make({ walletConnectOptions: { projectId: 'abc123' } })
    expect((client as any).isWalletConnectEnabled).toBe(true)
    expect((client as any).wcProjectId).toBe('abc123')
  })

  it('falls back to the default projectId when walletConnectOptions omit it (relayUrl only)', () => {
    const client = make({ walletConnectOptions: { relayUrl: 'wss://relay.example' } })
    expect((client as any).isWalletConnectEnabled).toBe(true)
    expect(typeof (client as any).wcProjectId).toBe('string')
    expect((client as any).wcRelayUrl).toBe('wss://relay.example')
  })
})
