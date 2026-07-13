import { NetworksUnsupportedBeaconError } from '../../src/errors/NetworksUnsupportedBeaconError'
import { BeaconError } from '../../src/errors/BeaconError'
import { BEACON_ERROR_CODES } from '../../src/errors/error-codes'

describe('NetworksUnsupportedBeaconError', () => {
  it('extends BeaconError so existing catch blocks still trigger', () => {
    const err = new NetworksUnsupportedBeaconError({
      requestedNetworks: ['tezos:NetXsqzbfFenSTS'],
      unsupportedNetworks: ['tezos:NetXsqzbfFenSTS']
    })
    expect(err).toBeInstanceOf(BeaconError)
    expect(err).toBeInstanceOf(NetworksUnsupportedBeaconError)
  })

  it('carries the structured errorCode for programmatic discrimination', () => {
    const err = new NetworksUnsupportedBeaconError({
      requestedNetworks: [],
      unsupportedNetworks: []
    })
    expect(err.errorCode).toBe(BEACON_ERROR_CODES.NETWORKS_UNSUPPORTED)
    expect(err.name).toBe('NetworksUnsupportedBeaconError')
  })

  it('preserves requestedNetworks and unsupportedNetworks on the instance', () => {
    const requested = ['tezos:NetXsqzbfFenSTS', 'tezos:NetXY2oPPzkxUW1']
    const unsupported = ['tezos:NetXY2oPPzkxUW1']
    const err = new NetworksUnsupportedBeaconError({
      requestedNetworks: requested,
      unsupportedNetworks: unsupported
    })
    expect(err.requestedNetworks).toEqual(requested)
    expect(err.unsupportedNetworks).toEqual(unsupported)
  })

  it('default message names the unsupported networks', () => {
    const err = new NetworksUnsupportedBeaconError({
      requestedNetworks: ['tezos:L1', 'tezos:L2'],
      unsupportedNetworks: ['tezos:L2']
    })
    expect(err.message).toContain('tezos:L2')
    expect(err.message.toLowerCase()).toContain('unsupported')
  })

  it('empty arrays produce the "ambiguous — specify network" message', () => {
    const err = new NetworksUnsupportedBeaconError({
      requestedNetworks: [],
      unsupportedNetworks: []
    })
    expect(err.message.toLowerCase()).toContain('multiple networks')
    expect(err.message.toLowerCase()).toContain('specify a network')
  })

  it('customMessage overrides the default template', () => {
    const err = new NetworksUnsupportedBeaconError({
      requestedNetworks: ['tezos:bad'],
      unsupportedNetworks: ['tezos:bad'],
      customMessage: 'Malformed CAIP-2 string: "tezos:bad".'
    })
    // BeaconError prepends "[UNKNOWN_ERROR]:"; the custom string follows verbatim.
    expect(err.message).toContain('Malformed CAIP-2 string: "tezos:bad".')
  })
})
