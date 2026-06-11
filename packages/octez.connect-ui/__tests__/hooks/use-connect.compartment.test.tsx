import { renderHook, act, cleanup } from '@testing-library/react'
import useConnect from '../../src/ui/alert/hooks/useConnect'
import { NetworkType } from '@tezos-x/octez.connect-types'
import { OSLink } from '../../src/utils/wallets'
import { membraneResolved, membraneString } from '../helpers/xray'

jest.mock('../../src/utils/get-tzip10-link', () => ({
  getTzip10Link: jest.fn().mockReturnValue('https://example.com/tzip10')
}))

jest.mock('../../src/utils/platform', () => ({
  isTwBrowser: jest.fn().mockReturnValue(false),
  isAndroid: jest.fn().mockReturnValue(false),
  isMobileOS: jest.fn().mockReturnValue(false),
  isIOS: jest.fn().mockReturnValue(false)
}))

HTMLAnchorElement.prototype.click = jest.fn()

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})

// #32 / contract C5: peer-info promises created in a Firefox MV3 content script can
// resolve to method-stripped values across the Xray boundary. The UI consumption
// path must tolerate that and still reach a usable connection action instead of
// crashing with "x.startsWith is not a function".
describe('useConnect — cross-compartment peer-info (#32)', () => {
  const wcWallet = {
    key: 'multi',
    name: 'Multi Wallet',
    id: 'multi-id',
    // web + ios so handleClickWallet takes the wallet_connect branch (not the
    // single-type web shortcut), exercising `hasWalletConnectSymKey(await wcPayload)`.
    types: ['web', 'ios'],
    supportedInteractionStandards: ['wallet_connect'],
    links: {
      [OSLink.WEB]: 'https://example.com',
      [OSLink.IOS]: 'https://example-ios.com',
      [OSLink.EXTENSION]: 'https://extension.com',
      [OSLink.DESKTOP]: 'https://desktop.com'
    },
    image: 'https://example.com/icon.png'
  }

  const pairingPayload = {
    networkType: NetworkType.MAINNET,
    p2pSyncCode: Promise.resolve('p2p-sync'),
    postmessageSyncCode: Promise.resolve('post-sync'),
    // Cast: membraneString returns a boxed String to mimic a value that lost its
    // primitive-ness across the Xray boundary; the runtime type is intentionally "wrong".
    walletConnectSyncCode: membraneResolved(
      membraneString('wc:abc@2?symKey=deadbeef')
    ) as unknown as Promise<string>
  }

  it('does not throw when the WalletConnect sync code is a membrane-stripped value', async () => {
    const wallets = new Map<string, any>([['multi-id', wcWallet]])

    const { result } = renderHook(() =>
      useConnect(
        false,
        membraneResolved(membraneString('wc:abc@2?symKey=deadbeef')) as unknown as Promise<string>,
        Promise.resolve('p2p-sync'),
        Promise.resolve('post-sync'),
        wallets,
        jest.fn()
      )
    )

    // handleClickWallet is index 7. Before the hardening this rejected with
    // "uri.startsWith is not a function"; now it resolves cleanly.
    await act(async () => {
      await expect(
        result.current[7]('multi-id', { title: 'test', pairingPayload })
      ).resolves.toBeUndefined()
    })

    // WC couldn't validate (membrane value coerced to '' → no symKey), so the UI
    // reports WC not working rather than crashing — the web fallback action remains.
    expect(result.current[6]).toBe(false) // isWCWorking
    expect(result.current[1]).toBe(false) // isLoading settled
  })
})
