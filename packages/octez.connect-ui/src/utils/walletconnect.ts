// Replaces @walletconnect/utils parseUri(...).symKey usage to avoid pulling crypto shims into octez.connect-ui.
export const hasWalletConnectSymKey = (uri: unknown): boolean => {
  // #32: inside a Firefox MV3 content script the peer-info value can cross an
  // Xray compartment boundary that strips string methods, so `uri` may arrive as
  // a non-string. Tolerate it (return false) instead of throwing
  // `uri.startsWith is not a function`, which previously broke web-wallet pairing.
  if (typeof uri !== 'string') {
    return false
  }

  if (!uri.startsWith('wc:')) {
    return false
  }

  const queryStart = uri.indexOf('?')
  if (queryStart === -1) {
    return false
  }

  return Boolean(new URLSearchParams(uri.slice(queryStart + 1)).get('symKey'))
}
