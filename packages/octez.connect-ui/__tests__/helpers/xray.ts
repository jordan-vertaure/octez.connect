// Deterministic simulation of Firefox MV3 content-script Xray-wrapper effects,
// with no browser. Reproduces the two hazards behind issue #32:
//
//   1. Method stripping — values read across the compartment boundary lose their
//      function-valued properties, so `value.startsWith(...)` / `provider.request(...)`
//      throw "x is not a function".
//   2. Broken iteration — iterating a wrapped collection throws, so `new Map(value)`
//      / `value.entries()` fail with "Iterator value undefined is not an entry object".
//
// These let the deterministic Jest layer (CI-blocking) reproduce the membrane bug
// that Chromium does NOT exhibit, so a regression is caught without a real Firefox.

/** Wrap a value so its function-valued properties read as `undefined` (Hazard 1). */
export const stripMethods = <T extends object>(value: T): T =>
  new Proxy(value, {
    get(target, prop, receiver) {
      const actual = Reflect.get(target, prop, receiver)
      return typeof actual === 'function' ? undefined : actual
    }
  })

/**
 * A boxed string whose string methods have been stripped — models a peer-info
 * URI that crossed the Xray boundary and is no longer a usable primitive string
 * (`typeof` is `'object'`, and `.startsWith` reads as `undefined`).
 */
export const membraneString = (value: string): String => stripMethods(new String(value))

/** A promise that resolves to a method-stripped value, as peer-info would arrive. */
export const membraneResolved = <T extends object>(value: T): Promise<T> =>
  Promise.resolve(stripMethods(value))

/** Wrap an iterable so iterating it throws, reproducing the `new Map(...)` hazard (Hazard 2). */
export const breakIteration = <T extends object>(value: T): T =>
  new Proxy(value, {
    get(target, prop, receiver) {
      if (prop === Symbol.iterator || prop === 'entries' || prop === 'values') {
        return () => {
          throw new TypeError('Iterator value undefined is not an entry object')
        }
      }
      return Reflect.get(target, prop, receiver)
    }
  })
