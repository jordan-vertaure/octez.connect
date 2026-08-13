import {
  BeaconMessageType,
  BeaconMessageWrapper,
  DisconnectMessage
} from '@tezos-x/octez.connect-types'
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
 * The peer's version as safe to feed into capability negotiation
 * ({@link negotiateEnvelopeVersion}, multi-network gating, minimum-version
 * enforcement).
 *
 * `peer.version` alone CANNOT be trusted: legacy wallets (octez.connect
 * 4.8.x and upstream beacon-sdk forks) build their pairing response with the
 * version field of the dApp's pairing REQUEST — they echo the dApp's own
 * version back instead of declaring theirs. A v5 dApp reading that echo sees
 * '4', serves a wrapped v4 envelope, and the legacy wallet silently drops it
 * after pairing ("Pairing complete! Waiting for permission request…").
 *
 * The reliable capability marker is `protocolVersion`: v5+ pairing responses
 * attach it on every transport that can carry it (P2P, PostMessage), legacy
 * responses never do, and it cannot be echoed (legacy constructors don't
 * know the field). A peer that DECLARES a version without a valid marker
 * (a positive protocol version, matching the protocol's minimum of 1) is
 * therefore treated as a legacy flat-v2 speaker regardless of its echoed
 * `version` — exactly the wire a 4.8.x dApp would have served it.
 *
 * A peer that declares NO version at all keeps the long-standing "unknown"
 * semantics and maps to `undefined` (WalletConnect pairings, where beacon
 * versions are never fabricated and capability is negotiated via session
 * namespaces): version gates treat unknown as allowed-through and response
 * handling falls back to the response envelope's version. The echo problem
 * by definition only exists for peers that DO carry a version.
 *
 * @category Utility
 */
export const effectivePeerVersion = (
  peer: { version?: string; protocolVersion?: unknown } | undefined
): string | undefined => {
  if (!peer || peer.version == null) {
    return undefined
  }
  // `Number(null)` is 0 (finite) — treat null like absent, not like v5.
  const protocolRaw = peer.protocolVersion == null ? Number.NaN : Number(peer.protocolVersion)

  // Positive protocol versions only (the protocol's minimum is 1): `0`,
  // negatives, and non-numeric noise are malformed markers and must stay on
  // the legacy path, like an absent marker.
  return Number.isFinite(protocolRaw) && protocolRaw >= 1 ? peer.version : LEGACY_ENVELOPE_VERSION
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

/**
 * Build a disconnect message in the peer's negotiated dialect: a wrapped
 * envelope for v3+ peers, the flat legacy shape for v2 peers. A legacy peer
 * routes on the top-level `type` and would silently ignore a wrapped
 * envelope — the goodbye must be spoken in the dialect the peer parses.
 *
 * @category Utility
 */
export const buildDisconnectMessage = (
  envelope: { id: string; senderId: string },
  peerVersion: string | undefined
): DisconnectMessage | BeaconMessageWrapper<{ type: BeaconMessageType.Disconnect }> => {
  const version = negotiateEnvelopeVersion(peerVersion)

  return usesWrappedMessages(version)
    ? wrapBeaconMessage(
        { id: envelope.id, version, senderId: envelope.senderId },
        { type: BeaconMessageType.Disconnect }
      )
    : {
        id: envelope.id,
        version,
        senderId: envelope.senderId,
        type: BeaconMessageType.Disconnect
      }
}
