import { InvalidBeaconVersionError } from '../errors/InvalidBeaconVersionError'

export const MESSAGE_WRAPPED_FROM_VERSION = 3

// peer.version at or above which the multi-network (v4) protocol applies.
export const MULTI_NETWORK_FROM_VERSION = '4'

// Strict decimal-integer: a lone `0` or non-zero digit followed by digits.
// Rejects leading zeros on multi-digit values (e.g. `'04'`). A lone `0` is
// kept valid so legacy compat paths can use it as a fallback/unknown version.
const DECIMAL_INTEGER_RE = /^(0|[1-9]\d*)$/

const parseStrictDecimalInteger = (value: unknown): number | null => {
  if (typeof value !== 'string') {
    return null
  }
  if (!DECIMAL_INTEGER_RE.test(value)) {
    return null
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed > Number.MAX_SAFE_INTEGER) {
    return null
  }

  return parsed
}

/**
 * Compare two `peer.version` strings as strict decimal integers.
 *
 * Returns < 0 if `a < b`, 0 if equal, > 0 if `a > b` — same convention as
 * `Array.prototype.sort` comparators.
 *
 * Throws `InvalidBeaconVersionError` if either operand is not a decimal-
 * integer string in `[0, Number.MAX_SAFE_INTEGER]`. Leading signs, leading
 * zeros, decimal points, exponent notation, hex, whitespace, `'NaN'` and
 * `'Infinity'` all reject.
 *
 * @category Utility
 */
export const compareBeaconVersion = (a: unknown, b: unknown): number => {
  const na = parseStrictDecimalInteger(a)
  const nb = parseStrictDecimalInteger(b)

  if (na === null || nb === null) {
    throw new InvalidBeaconVersionError(a, b)
  }

  return na - nb
}

/**
 * Whether `version` is a valid peer.version at or above `threshold`.
 *
 * Single source of truth for the "is this peer at least version X" decision.
 * Returns `false` for an absent version and for any value that fails the
 * strict decimal-integer contract of `compareBeaconVersion` — i.e. malformed
 * or untrusted input is always treated as below the threshold, so a hostile
 * peer cannot trip a higher-version code path.
 *
 * @category Utility
 */
export const isAtLeastVersion = (version: string | undefined, threshold: string): boolean => {
  if (version === undefined) {
    return false
  }
  try {
    return compareBeaconVersion(version, threshold) >= 0
  } catch {
    return false
  }
}

/**
 * Whether `version` is at or above the multi-network (v4) threshold.
 *
 * @category Utility
 */
export const isMultiNetworkVersion = (version: string | undefined): boolean =>
  isAtLeastVersion(version, MULTI_NETWORK_FROM_VERSION)

export const usesWrappedMessages = (version?: string): boolean => {
  if (!version) {
    return false
  }

  const parsed = Number(version)

  return Number.isFinite(parsed) && parsed >= MESSAGE_WRAPPED_FROM_VERSION
}
