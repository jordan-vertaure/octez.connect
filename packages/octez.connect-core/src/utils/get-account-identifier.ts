import bs58check from 'bs58check'
import { Network } from '@tezos-x/octez.connect-types'
import { hash } from '@stablelib/blake2b'
import { encode } from '@stablelib/utf8'

/**
 * @internalapi
 *
 * Generate a deterministic account identifier based on an address and a network
 *
 * @param address
 * @param network
 */
export const getAccountIdentifier = async (address: string, network: Network): Promise<string> => {
  // v4 multi-network accounts carry a CAIP-2 chainId. Key the identifier on
  // (address, chainId) alone: chainId is the canonical, stable network key,
  // whereas the human-facing `name`/`rpcUrl` differ between the wallet's
  // permission response and the dApp's later operation requests. Including
  // them would make the persisted identifier irreproducible at lookup time
  // (and collapse distinct chains that happen to share a name). Legacy
  // accounts (no chainId) keep the original scheme so their already-persisted
  // identifiers are unchanged.
  const data: string[] = []
  if (network.chainId) {
    data.push(address, `chainId:${network.chainId}`)
  } else {
    data.push(address, network.type)
    if (network.name) {
      data.push(`name:${network.name}`)
    }
    if (network.rpcUrl) {
      data.push(`rpc:${network.rpcUrl}`)
    }
  }

  const buffer = Buffer.from(hash(encode(data.join('-')), 10))

  return bs58check.encode(buffer)
}
