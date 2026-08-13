import { BeaconEvent, BeaconEventType, BeaconEventHandlerFunction } from '../events'
import { BlockExplorer } from '../utils/block-explorer'
import {
  Storage,
  NetworkType,
  ColorMode,
  NodeDistributions,
  AnalyticsInterface,
  Network
} from '@tezos-x/octez.connect-types'

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

/**
 * @category DApp
 */
export interface DAppClientOptions {
  /**
   * Name of the application
   */
  name: string

  /**
   * Description of the application
   */
  description?: string

  /**
   * A URL to the icon of the application
   */
  iconUrl?: string

  /**
   * A URL to the website of the application
   */
  appUrl?: string

  /**
   * The storage that will be used by the SDK
   */
  storage?: Storage

  /**
   * An object that will be used to overwrite default event handler behaviour.
   *
   * If you plan to overwrite all default events, use "disableDefaultEvents" instead.
   *
   * This will overwrite the default event handler, so this can lead to unexpected behavior in some cases.
   * We recommend that you overwrite all handlers if you want to use your own UI.
   *
   * If you simply want to be notified of events happening, but do not want to overwrite the default behavior,
   * please use `subscribeToEvent()` on the DAppClient instead.
   */
  eventHandlers?: {
    [key in BeaconEvent]?: {
      handler: BeaconEventHandlerFunction<BeaconEventType[key]>
    }
  }

  /**
   * Disable all default Events and UI elements. If passed together with "eventHandlers",
   * the default eventHandlers will be removed, and the ones passed by the user will be added.
   */
  disableDefaultEvents?: boolean

  /**
   * A list of matrix nodes to connect to. If a non-empty array is passed, the default options will be overwritten.
   * One node will be randomly selected based on the local keypair and the other nodes will be used as a fallback in case the primary node goes down.
   *
   * Only provide the hostname, no https:// prefix. Eg. { [Regions.EU1]: ['matrix.example.com'] }
   */
  matrixNodes?: NodeDistributions

  /**
   * The block explorer used by the SDK
   */
  blockExplorer?: BlockExplorer

  /**
   * Indicates on which network the DApp is running on.
   */
  network?: Network

  /**
   * @deprecated Please use "network" instead.
   * Indicates on which network the DApp is planning to run. This is currently used to adjust the URLs of web-wallets in the pairing alert if they use different URLs for testnets.
   * You will still have to define the network you intend to use during the permission request.
   */
  preferredNetwork?: NetworkType

  /**
   * Set the color mode for the UI elements (alerts and toasts)
   */
  colorMode?: ColorMode

  /**
   * A URL to the Terms & Conditions page that will be displayed in the pairing modal
   */
  termsAndConditionsUrl?: string

  /**
   * A URL to the Privacy Policy page that will be displayed in the pairing modal
   */
  privacyPolicyUrl?: string

  /**
   * A list of contracts that the DApp is using. Allows to attach human readable error messages for to error codes
   */
  errorMessages?: Record<string, Record<string | number, string>>

  /**
   * Configuration that is passed to the WalletConnect transport.
   *
   * This is required to enable WalletConnect connections.
   */
  walletConnectOptions?: RequireAtLeastOne<{
    /**
     * The projectId of the application. Has to be obtained from https://cloud.walletconnect.com/
     */
    projectId?: string

    /**
     * The relay server to connect to
     */
    relayUrl?: string
  }>

  /**
   * Explicitly disable the WalletConnect transport.
   *
   * WalletConnect is opt-in (it is only built when `walletConnectOptions` is
   * provided). This additive flag lets a DApp that does provide
   * `walletConnectOptions` still turn the transport off without removing that
   * configuration. When `true`, no WalletConnect transport is constructed or
   * listened to. Absence preserves current behavior. Use it for environments
   * where the WalletConnect provider cannot run (e.g. a Firefox MV3
   * content-script compartment).
   */
  disableWalletConnect?: boolean

  /**
   * The analytics instance that will be used by the SDK
   */
  analytics?: AnalyticsInterface

  /**
   * The wallets that will be featured in the UI.
   */
  featuredWallets?: string[]

  /**
   * Automatically switch between apps on Mobile Devices (Enabled by Default)
   */
  enableAppSwitching?: boolean

  /**
   * Enable metrics tracking (Disabled by Default)
   */
  enableMetrics?: boolean

  /**
   * Minimum wallet version the dApp will accept. The gate is opt-in: it
   * defaults to the lowest supported protocol version, so every wallet the
   * SDK can talk to is accepted and upgrading the SDK never rejects existing
   * v2/v3 wallets. Set `'4'` to require the v4 multi-network protocol. Must
   * be a decimal-integer string in `[1, BEACON_VERSION]`; otherwise
   * `InvalidRequiredMinimumVersionError` is thrown at construction. A wallet
   * below this minimum is rejected with `VersionUnsupportedBeaconError` when
   * a request is sent.
   *
   * The version compared against this minimum is the wallet's EFFECTIVE
   * version, not the raw `peer.version`: legacy wallets echo the dApp's own
   * version at pairing, so a declared version is only trusted when the
   * pairing response carried the v5 `protocolVersion` capability marker —
   * marker-less wallets that declared a version count as `'2'` (and are
   * therefore rejected by a minimum of `'3'` or `'4'`, even though their
   * echoed `peer.version` may read higher). A wallet that reports no version
   * at all (WalletConnect pairings) is still treated as unknown and allowed,
   * so those pairings keep working.
   */
  requiredMinimumVersion?: string
}
