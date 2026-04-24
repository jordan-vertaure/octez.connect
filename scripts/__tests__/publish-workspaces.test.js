'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getPrereleaseTag,
  hasExplicitTagArg,
  resolvePublishCommand,
  resolvePublishTag
} = require('../helpers/publish-workspaces')

test('getPrereleaseTag returns the prerelease channel for octez.connect versions', () => {
  assert.equal(getPrereleaseTag('4.8.4-beta.1'), 'beta')
  assert.equal(getPrereleaseTag('4.8.4-rc.0'), 'rc')
  assert.equal(getPrereleaseTag('4.8.4'), undefined)
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
