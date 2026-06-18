import {
  resolveRequiredMinimumVersion,
  DEFAULT_REQUIRED_MINIMUM_VERSION
} from '../../src/utils/required-minimum-version'
import { InvalidRequiredMinimumVersionError } from '../../src/errors/InvalidRequiredMinimumVersionError'

describe('resolveRequiredMinimumVersion', () => {
  it('defaults to the permissive lowest version when undefined', () => {
    expect(resolveRequiredMinimumVersion(undefined)).toBe(DEFAULT_REQUIRED_MINIMUM_VERSION)
    expect(DEFAULT_REQUIRED_MINIMUM_VERSION).toBe('2')
  })

  it('returns a valid in-range value unchanged', () => {
    expect(resolveRequiredMinimumVersion('2')).toBe('2')
    expect(resolveRequiredMinimumVersion('3')).toBe('3')
    expect(resolveRequiredMinimumVersion('4')).toBe('4')
  })

  // Regression: a leading-zero or > MAX_SAFE_INTEGER value used to slip past
  // the loose `/^\d+$/` guard and throw InvalidBeaconVersionError from the
  // inner compareBeaconVersion. Every rejection must be the contracted type.
  it.each([
    ['leading zero', '007'],
    ['leading zero (two digit)', '04'],
    ['above MAX_SAFE_INTEGER', '99999999999999999999'],
    ['decimal', '4.5'],
    ['non-numeric', 'four'],
    ['empty', ''],
    ['below 1', '0'],
    ['above BEACON_VERSION', '5']
  ])('throws InvalidRequiredMinimumVersionError for %s', (_label, value) => {
    expect(() => resolveRequiredMinimumVersion(value)).toThrow(InvalidRequiredMinimumVersionError)
  })
})
