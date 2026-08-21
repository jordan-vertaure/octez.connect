import { hasWalletConnectSymKey } from '../../src/utils/walletconnect'
import { membraneString, stripMethods } from '../helpers/xray'

describe('hasWalletConnectSymKey (#32 cross-compartment hardening)', () => {
  it('detects a symKey in a well-formed wc: URI', () => {
    expect(hasWalletConnectSymKey('wc:abc@2?relay-protocol=irn&symKey=deadbeef')).toBe(true)
  })

  it('returns false for a wc: URI without a symKey', () => {
    expect(hasWalletConnectSymKey('wc:abc@2?relay-protocol=irn')).toBe(false)
  })

  it('returns false for a non-wc string', () => {
    expect(hasWalletConnectSymKey('https://example.com')).toBe(false)
  })

  it('returns false for the empty string (WalletConnect disabled via disableWalletConnect)', () => {
    expect(hasWalletConnectSymKey('')).toBe(false)
  })

  // FR-004a / contract C5: a peer-info value that crossed a Firefox Xray boundary
  // arrives method-stripped (typeof 'object', no `.startsWith`). Before the guard,
  // this threw "uri.startsWith is not a function" and broke web-wallet pairing.
  // This test fails (throws) if the `typeof uri !== 'string'` guard is reverted.
  it('tolerates a membrane-wrapped (method-stripped) URI without throwing', () => {
    const wrapped = membraneString('wc:abc@2?symKey=deadbeef')
    expect(() => hasWalletConnectSymKey(wrapped)).not.toThrow()
    expect(hasWalletConnectSymKey(wrapped)).toBe(false)
  })

  it('tolerates undefined / non-string peer-info without throwing', () => {
    expect(() => hasWalletConnectSymKey(undefined)).not.toThrow()
    expect(() => hasWalletConnectSymKey(stripMethods({}))).not.toThrow()
    expect(hasWalletConnectSymKey(undefined)).toBe(false)
  })
})
