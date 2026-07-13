/**
 * CAIP-2 chain id helpers, scoped to the Tezos namespace (`tezos:<reference>`).
 *
 * The wire format accepts both the bare reference (`NetXsqzbfFenSTS`) and the
 * full CAIP-2 string (`tezos:NetXsqzbfFenSTS`); SDK code consistently stores
 * and routes on the full form.
 */
import { Network, NetworkType } from '@tezos-x/octez.connect-types'

const TEZOS_CAIP2_PREFIX = 'tezos:'

const TEZOS_CAIP2_RE = /^tezos:[A-Za-z0-9]+$/

/**
 * Returns `chainId` with the `tezos:` prefix added if absent. No validation
 * is performed; use `isValidTezosCaip2` at API boundaries.
 */
export const normalizeTezosCaip2 = (chainId: string): string =>
  chainId.startsWith(TEZOS_CAIP2_PREFIX) ? chainId : `${TEZOS_CAIP2_PREFIX}${chainId}`

/**
 * Whether `value` is a syntactically valid Tezos CAIP-2 chain id
 * (`tezos:<alphanumeric reference>`).
 */
export const isValidTezosCaip2 = (value: string): boolean => TEZOS_CAIP2_RE.test(value)

/**
 * Build the minimal `Network` for a Tezos CAIP-2 chain id. Single source of
 * truth for the `{ type: CUSTOM, chainId, ... }` shape, so the network used
 * to derive an account identifier is constructed identically everywhere
 * (permission storage, operation-request lookup, stale-scheme scan). `name`
 * defaults to the chain id when the wallet supplies no human label.
 */
export const networkFromTezosCaip2 = (
  chainId: string,
  opts?: { name?: string; rpcUrl?: string }
): Network => ({
  type: NetworkType.CUSTOM,
  name: opts?.name ?? chainId,
  rpcUrl: opts?.rpcUrl,
  chainId
})
