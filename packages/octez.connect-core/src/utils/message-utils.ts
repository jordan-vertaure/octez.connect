import { BeaconMessageWrapper } from '@tezos-x/octez.connect-types'
import { BEACON_VERSION } from '../constants'

// Structural stand-in for the beaconV3 BeaconBaseMessage ({ type: unknown }).
// The types barrel re-exports the flat BeaconBaseMessage (which also carries
// id/version/senderId) under the same name, so constraining on the barrel
// type would wrongly require envelope fields on the inner payload.
interface WrappedPayload { type: unknown }
import { InvalidBeaconVersionError } from '../errors/InvalidBeaconVersionError'

export const MESSAGE_WRAPPED_FROM_VERSION = 3

// peer.version at or above which the multi-network (v4) protocol applies.
export const MULTI_NETWORK_FROM_VERSION = '4'

// Strict decimal-integer: a lone `0` or non-zero digit followed by digits.
// Rejects leading zeros on multi-digit values (e.g. `'04'`). A lone `0` is
// kept valid so legacy compat paths can use it as a fallback/unknown version.
const DECIMAL_INTEGER_RE = /^(0|[1-9]\d*)$/

export const parseStrictDecimalInteger = (value: unknown): number | null => {
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
  // Use the same strict decimal-integer contract as compareBeaconVersion so
  // wrapped-message routing agrees with the v4/multi-network routing: a loose
  // value like '3.0', ' 3 ' or '03' (which Number() would accept) is treated
  // as malformed and routed as non-wrapped rather than inconsistently.
  const parsed = parseStrictDecimalInteger(version)

  return parsed !== null && parsed >= MESSAGE_WRAPPED_FROM_VERSION
}

/** The flat legacy wire dialect served to peers below the wrapped baseline. */
export const LEGACY_ENVELOPE_VERSION = '2'

/**
 * The envelope version to stamp on an outgoing message for a peer that
 * declared `peerVersion` at pairing: `min(peerVersion, BEACON_VERSION)` with
 * a floor at the flat legacy dialect ('2').
 *
 * This is the backward-compatibility pivot: a peer that declared '2' — or
 * never declared a version at all (legacy pairings, WalletConnect peers,
 * malformed values) — is served the flat v2 dialect it has always spoken; a
 * v3 peer receives '3' wrapped envelopes and never sees v4 payload fields;
 * a v4 peer gets the full wrapped v4 wire. Callers pick the message SHAPE
 * with `usesWrappedMessages(negotiated)` and gate v4 fields (`networks`/
 * `accounts`) on `isMultiNetworkVersion(negotiated)`.
 *
 * @category Utility
 */
export const negotiateEnvelopeVersion = (peerVersion: string | undefined): string => {
  if (!isAtLeastVersion(peerVersion, String(MESSAGE_WRAPPED_FROM_VERSION))) {
    return LEGACY_ENVELOPE_VERSION
  }

  return isAtLeastVersion(peerVersion, BEACON_VERSION) ? BEACON_VERSION : (peerVersion as string)
}

/**
 * Build a wrapped beacon envelope. Single source of truth for the
 * `{ id, version, senderId, message }` wire shape so senders cannot drift.
 *
 * @category Utility
 */
export const wrapBeaconMessage = <T extends WrappedPayload>(
  envelope: { id: string; version: string; senderId: string },
  message: T
): BeaconMessageWrapper<T> => ({
  id: envelope.id,
  version: envelope.version,
  senderId: envelope.senderId,
  message
})

/**
 * Extract the inner payload of a wrapped beacon envelope, or `undefined`
 * when the candidate's version does not follow the wrapped (v3+) contract.
 * Callers must treat `undefined` as "not a wrapped message" and drop or
 * tombstone it — never fall back to reading flat fields.
 *
 * @category Utility
 */
export const unwrapBeaconMessage = <T extends WrappedPayload>(candidate: {
  version?: string
  message?: T
}): T | undefined => (usesWrappedMessages(candidate.version) ? candidate.message : undefined)
