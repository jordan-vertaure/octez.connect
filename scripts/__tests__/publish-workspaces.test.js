'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getPrereleaseTag,
  hasExplicitTagArg,
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
