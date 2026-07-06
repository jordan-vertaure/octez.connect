/* eslint-disable prefer-arrow/prefer-arrow-functions */

/**
 * Exhaustiveness guard for if/else chains and switch/cases.
 *
 * Compile time: passing anything but `never` is a type error, so adding a new
 * union member without handling it fails to build. Runtime: an untrusted value
 * (e.g. an unknown message or error type from the wire) can still reach the
 * default branch, so throw an actionable error naming that value instead of
 * silently returning — callers previously received `undefined` and failed
 * later with no context.
 *
 * @param empty The value that should be unreachable
 */
export function assertNever(empty: never): never {
  let repr: string
  try {
    repr = JSON.stringify(empty) ?? String(empty)
  } catch {
    repr = String(empty)
  }
  if (repr.length > 200) {
    repr = `${repr.slice(0, 200)}…`
  }

  throw new Error(`assertNever: reached unreachable case with unexpected value: ${repr}`)
}

/* eslint-enable prefer-arrow/prefer-arrow-functions */
