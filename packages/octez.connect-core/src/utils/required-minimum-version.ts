import { BEACON_VERSION } from '../constants'
import { InvalidRequiredMinimumVersionError } from '../errors/InvalidRequiredMinimumVersionError'
import { compareBeaconVersion } from './message-utils'

/**
 * Default minimum wallet version the dApp accepts when the option is omitted.
 *
 * Deliberately the lowest protocol version still supported, so the gate is
 * effectively opt-in: by default every wallet the SDK can talk to (v2/v3/v4)
 * is accepted, preserving backward compatibility. A dApp that needs the v4
 * multi-network protocol sets `requiredMinimumVersion: '4'` explicitly.
 */
export const DEFAULT_REQUIRED_MINIMUM_VERSION = '2'

// Same strict decimal-integer contract as compareBeaconVersion: a lone `0`
// or a non-zero leading digit, no leading zeros, no signs/decimals/exponents.
const DECIMAL_INTEGER_RE = /^(0|[1-9]\d*)$/

/**
 * Resolve a dApp's `requiredMinimumVersion` option against the SDK's
 * `BEACON_VERSION`. Returns {@link DEFAULT_REQUIRED_MINIMUM_VERSION} when
 * undefined; otherwise validates the supplied value is a decimal-integer
 * string in `[1, BEACON_VERSION]` and returns it unchanged.
 *
 * Throws `InvalidRequiredMinimumVersionError` for any malformed,
 * out-of-range, or future-version input.
 */
export const resolveRequiredMinimumVersion = (
  providedValue: string | undefined
): string => {
  if (providedValue === undefined) {
    return DEFAULT_REQUIRED_MINIMUM_VERSION
  }

  // Validate against the SAME strict contract compareBeaconVersion enforces,
  // up front, so every rejection here is an InvalidRequiredMinimumVersionError.
  // (A looser `/^\d+$/` would let leading-zero or > MAX_SAFE_INTEGER values
  // slip through and throw the wrong error type from compareBeaconVersion below.)
  if (!DECIMAL_INTEGER_RE.test(providedValue) || Number(providedValue) > Number.MAX_SAFE_INTEGER) {
    throw new InvalidRequiredMinimumVersionError(
      providedValue,
      BEACON_VERSION,
      'value must be a decimal-integer string (e.g. "3", "4")'
    )
  }

  if (Number(providedValue) < 1) {
    throw new InvalidRequiredMinimumVersionError(
      providedValue,
      BEACON_VERSION,
      'value must be >= 1'
    )
  }

  if (compareBeaconVersion(providedValue, BEACON_VERSION) > 0) {
    throw new InvalidRequiredMinimumVersionError(
      providedValue,
      BEACON_VERSION,
      `value cannot exceed the SDK's own BEACON_VERSION (${BEACON_VERSION})`
    )
  }

  return providedValue
}
