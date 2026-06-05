'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  buildExpectedReleaseSet,
  findUnresolvableReleases,
  getPrereleaseTag,
  hasExplicitTagArg,
  resolvePublishCommand,
  resolvePublishTag
} = require('../helpers/publish-workspaces')

test('getPrereleaseTag returns the prerelease channel for octez.connect versions', () => {
  assert.equal(getPrereleaseTag('4.8.4-beta.1'), 'beta')
  assert.equal(getPrereleaseTag('4.8.4-rc.0'), 'rc')
  assert.equal(getPrereleaseTag('4.8.3'), undefined)
})

test('hasExplicitTagArg detects npm publish tag overrides', () => {
  assert.equal(hasExplicitTagArg(['--tag', 'latest']), true)
  assert.equal(hasExplicitTagArg(['--tag=latest']), true)
  assert.equal(hasExplicitTagArg(['--otp', '123456']), false)
})

test('resolvePublishTag defaults prereleases to their channel', () => {
  assert.equal(
    resolvePublishTag({
      version: '4.8.4-beta.1',
      extraArgs: [],
      env: {}
    }),
    'beta'
  )
})

test('resolvePublishTag honors release workflow latest override', () => {
  assert.equal(
    resolvePublishTag({
      version: '4.8.4-beta.1',
      extraArgs: ['--tag', 'latest'],
      env: {}
    }),
    undefined
  )

  assert.equal(
    resolvePublishTag({
      version: '4.8.4-beta.1',
      extraArgs: [],
      env: { NPM_DIST_TAG: 'latest' }
    }),
    'latest'
  )
})

test('resolvePublishCommand reuses npm_execpath when npm launched the script', () => {
  assert.deepEqual(
    resolvePublishCommand({
      publishArgs: ['publish', '--access', 'public', '--tag', 'latest'],
      env: {
        npm_execpath: '/tmp/octez-connect-npm11/node_modules/npm/bin/npm-cli.js'
      },
      nodeExecPath: '/usr/bin/node'
    }),
    {
      command: '/usr/bin/node',
      args: [
        '/tmp/octez-connect-npm11/node_modules/npm/bin/npm-cli.js',
        'publish',
        '--access',
        'public',
        '--tag',
        'latest'
      ]
    }
  )
})

test('buildExpectedReleaseSet lists every non-private workspace as name@version', () => {
  assert.deepEqual(
    buildExpectedReleaseSet([
      { manifest: { name: '@tezos-x/octez.connect-core', version: '5.0.0-beta.6' } },
      { manifest: { name: '@tezos-x/octez.connect-dapp', version: '5.0.0-beta.6' } },
      { manifest: { name: 'octez.connect-e2e', version: '5.0.0-beta.6', private: true } }
    ]),
    [
      { name: '@tezos-x/octez.connect-core', version: '5.0.0-beta.6' },
      { name: '@tezos-x/octez.connect-dapp', version: '5.0.0-beta.6' }
    ]
  )
})

test('findUnresolvableReleases flags packages that do not resolve to their exact version', () => {
  const expected = [
    { name: '@tezos-x/octez.connect-core', version: '5.0.0-beta.6' },
    { name: '@tezos-x/octez.connect-dapp', version: '5.0.0-beta.6' }
  ]
  // core resolves; dapp is missing (a partial publish left it unresolvable).
  const resolveVersion = (name) =>
    name === '@tezos-x/octez.connect-core' ? '5.0.0-beta.6' : null

  assert.deepEqual(findUnresolvableReleases({ expected, resolveVersion }), [
    { name: '@tezos-x/octez.connect-dapp', version: '5.0.0-beta.6' }
  ])
})

test('findUnresolvableReleases returns empty when every package resolves exactly', () => {
  const expected = [{ name: '@tezos-x/octez.connect-core', version: '5.0.0-beta.6' }]

  assert.deepEqual(
    findUnresolvableReleases({ expected, resolveVersion: () => '5.0.0-beta.6' }),
    []
  )
})

test('findUnresolvableReleases flags a stale resolution that is not the release version', () => {
  const expected = [{ name: '@tezos-x/octez.connect-core', version: '5.0.0-beta.6' }]
  // Registry still serves the previous release — not the one we just published.
  assert.deepEqual(
    findUnresolvableReleases({ expected, resolveVersion: () => '5.0.0-beta.5' }),
    [{ name: '@tezos-x/octez.connect-core', version: '5.0.0-beta.6' }]
  )
})

test('resolvePublishCommand falls back to npm on path outside npm-launched processes', () => {
  assert.deepEqual(
    resolvePublishCommand({
      publishArgs: ['publish', '--access', 'public'],
      env: {},
      nodeExecPath: '/usr/bin/node'
    }),
    {
      command: 'npm',
      args: ['publish', '--access', 'public']
    }
  )
})
