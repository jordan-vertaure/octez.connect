import { test, expect, Page, BrowserContext } from '@playwright/test'
import { pairWithBeaconWallet } from './utils'

/**
 * Backward-compatibility interop: the REAL published 4.8.6 dApp bundle
 * (examples/dapp-legacy.html, flat v2 wire only) against a wallet running
 * THIS branch's SDK (examples/wallet.html).
 *
 * The negotiated wire must serve the legacy peer transparently:
 *   flat v2 request -> new wallet handles it -> flat v2 response -> old dApp
 *   parses it. No code change on the 4.8.6 side.
 */

let dapp: Page = {} as unknown as Page
let dappCtx: BrowserContext = {} as unknown as BrowserContext
let walletCtx: BrowserContext = {} as unknown as BrowserContext

test.beforeEach(async ({ browser }) => {
  ;[dapp, dappCtx, , walletCtx] = await pairWithBeaconWallet(browser, {
    dappPath: 'dapp-legacy.html'
  })
})

test.afterEach(async () => {
  await Promise.all([dappCtx.close(), walletCtx.close()])
})

test('legacy 4.8.6 dApp pairs and receives a flat v2 permission response', async () => {
  // pairWithBeaconWallet already asserted #activeAccount shows the wallet's
  // address; re-assert here so the test is self-describing.
  await expect(dapp.locator('#activeAccount')).toHaveText('tz1RAf7CZDoa5Z94RdE2VMwfrRWeyiNAXTrw', {
    timeout: 30_000
  })
  await expect(dapp.locator('#activeAccountTransport')).toHaveText('p2p', { timeout: 30_000 })

  // The 4.8.6 requestPermissions output spreads the wallet's wire response,
  // so `version` is the dialect the wallet answered in. A current wallet
  // must have echoed the legacy dApp's flat v2 dialect.
  await expect
    .poll(
      () =>
        dapp.evaluate(
          () =>
            (window as unknown as { __lastPermissionResponse?: { version?: string } })
              .__lastPermissionResponse?.version
        ),
      { timeout: 30_000 }
    )
    .toBe('2')
})

test('legacy 4.8.6 dApp sign-payload request round-trips', async () => {
  await dapp.click('#signPayloadRaw')

  // The wallet harness (examples/wallet.html) answers sign requests with an
  // Aborted ErrorResponse (same contract p2p-flow.spec.ts locks in). What
  // this proves for interop: the flat v2 request was served by the new
  // wallet pipeline and the flat v2 ErrorResponse came back AND was parsed
  // by the 4.8.6 client into its typed error (errorType visible in the DOM,
  // toast rendered by the 4.8.6 UI) instead of hanging until timeout.
  await dapp.waitForSelector('p.toast-label', { state: 'visible', timeout: 30_000 })
  await expect(dapp.locator('#signResult')).toHaveText('error:ABORTED_ERROR', {
    timeout: 30_000
  })
})

test('legacy 4.8.6 dApp operation request round-trips', async () => {
  await dapp.click('#sendToSelf')

  // Same contract as the sign round-trip: wallet.html aborts classic
  // single-network operations, and the 4.8.6 dApp must parse the flat v2
  // ErrorResponse into its typed error.
  await dapp.waitForSelector('p.toast-label', { state: 'visible', timeout: 30_000 })
  await expect(dapp.locator('#operationResult')).toHaveText('error:ABORTED_ERROR', {
    timeout: 30_000
  })
})
