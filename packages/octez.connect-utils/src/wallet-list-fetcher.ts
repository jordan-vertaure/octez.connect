import { ExtensionApp, DesktopApp, WebApp, App } from '@tezos-x/octez.connect-types'

// jsDelivr serves the committed dist/ folder of the wallet-list repo's git
// tree; @latest resolves to the newest semver tag, so publishing a
// wallet-list release reaches dApps without an SDK release (~12h edge cache).
const JSDELIVR_BASE_URL = 'https://cdn.jsdelivr.net/gh/trilitech/octez.connect-wallet-list@latest'
const FETCH_TIMEOUT = 5000

export interface WalletRegistry {
  version: string
  updated: string
  extensionList: ExtensionApp[]
  desktopList: DesktopApp[]
  webList: WebApp[]
  iOSList: App[]
}

// Logos are already base64 in both bundled and GitHub JSON, no conversion needed

/**
 * Fetch wallet lists from GitHub (jsDelivr CDN)
 * Returns null on error (caller should use bundled fallback)
 */
export const fetchWalletListsFromGitHub = async (
  blockchain: string
): Promise<WalletRegistry | null> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    const response = await fetch(`${JSDELIVR_BASE_URL}/dist/${blockchain}.json`, {
      signal: controller.signal,
      cache: 'default' // Use browser's HTTP cache
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to fetch wallet list from GitHub: ${response.status}`)

      return null
    }

    const registry: WalletRegistry = await response.json()

    // eslint-disable-next-line no-console
    console.log(
      `Loaded wallet list from GitHub (version ${registry.version}, updated ${registry.updated})`
    )

    return registry
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // eslint-disable-next-line no-console
      console.warn('Wallet list fetch timed out, using bundled version')
    } else {
      // eslint-disable-next-line no-console
      console.warn('Failed to fetch wallet list from GitHub, using bundled version:', error)
    }

    return null
  }
}
