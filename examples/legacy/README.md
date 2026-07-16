# Legacy SDK fixture (v2 wire interop)

`octez.connect-4.8.6.min.js` is the **unmodified** browser bundle shipped inside the
published npm package:

- Package: `@tezos-x/octez.connect-sdk@4.8.6`
- File inside the tarball: `package/dist/octez.connect.min.js`
- Obtained via: `npm pack @tezos-x/octez.connect-sdk@4.8.6` (then extracted)
- SHA-256: `5e2d156eb7afd51c39cb2ce6d302803b42eb46905bdaf874ea2fa0d9c111f4e8`

It is loaded by `examples/dapp-legacy.html` and driven by
`e2e/legacy-interop.spec.ts` to prove that a dApp built against the last
flat-v2-wire release (4.8.x) still pairs and round-trips requests against a
wallet running the current SDK (negotiated wire: wrapped v3/v4 for capable
peers, flat v2 for legacy peers).

To reproduce/update the fixture:

```sh
npm pack @tezos-x/octez.connect-sdk@4.8.6
tar xzf tezos-x-octez.connect-sdk-4.8.6.tgz package/dist/octez.connect.min.js
cp package/dist/octez.connect.min.js examples/legacy/octez.connect-4.8.6.min.js
```
