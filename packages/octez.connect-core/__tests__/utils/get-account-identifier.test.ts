import { getAccountIdentifier } from '../../src/utils/get-account-identifier'
import { NetworkType } from '@tezos-x/octez.connect-types'

describe('getAccountIdentifier — chainId-keyed v4 identity', () => {
  const address = 'tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb'

  it('keys on (address, chainId) and ignores name/rpcUrl when a chainId is present', async () => {
    // The wallet labels a chain at permission time; the dApp sees only the
    // bare CAIP-2 string at operation time. Both must derive the same id.
    const atPermissionTime = await getAccountIdentifier(address, {
      type: NetworkType.CUSTOM,
      chainId: 'tezos:NetXsqzbfFenSTS',
      name: 'Tezos L1',
      rpcUrl: 'https://rpc.example'
    })
    const atOperationTime = await getAccountIdentifier(address, {
      type: NetworkType.CUSTOM,
      chainId: 'tezos:NetXsqzbfFenSTS',
      name: 'tezos:NetXsqzbfFenSTS'
    })
    expect(atPermissionTime).toBe(atOperationTime)
  })

  it('distinguishes two chains that share an address and name', async () => {
    const onL1 = await getAccountIdentifier(address, {
      type: NetworkType.CUSTOM,
      chainId: 'tezos:NetXsqzbfFenSTS',
      name: 'My Account'
    })
    const onL2 = await getAccountIdentifier(address, {
      type: NetworkType.CUSTOM,
      chainId: 'tezos:NetXY2oPPzkxUW1',
      name: 'My Account'
    })
    expect(onL1).not.toBe(onL2)
    expect(onL1).toBeTruthy()
    expect(onL2).toBeTruthy()
  })

  it('preserves the legacy (type/name/rpcUrl) scheme when no chainId is present', async () => {
    const mainnet = await getAccountIdentifier(address, { type: NetworkType.MAINNET })
    const ghostnet = await getAccountIdentifier(address, { type: NetworkType.GHOSTNET })
    expect(mainnet).not.toBe(ghostnet)

    // Distinct names still produce distinct legacy identifiers (back-compat).
    const named = await getAccountIdentifier(address, {
      type: NetworkType.CUSTOM,
      name: 'A'
    })
    const otherNamed = await getAccountIdentifier(address, {
      type: NetworkType.CUSTOM,
      name: 'B'
    })
    expect(named).not.toBe(otherNamed)
  })
})
