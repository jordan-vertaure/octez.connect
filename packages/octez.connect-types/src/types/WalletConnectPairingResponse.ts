import { PeerInfo } from './PeerInfo'

/**
 * @internalapi
 */
export class WalletConnectPairingResponse implements PeerInfo {
  readonly type: string = 'walletconnect-pairing-response'
  id: string
  name: string
  icon?: string | undefined
  appUrl?: string | undefined
  publicKey: string
  // Never fabricated for WalletConnect: WC has no beacon-level version
  // handshake, so the peer's version stays undefined ("unknown") and
  // version-gated features fall back to the legacy path.
  public version?: string
  protocolVersion?: number

  constructor(
    id: string,
    name: string,
    publicKey: string,
    version: string | undefined,
    protocolVersion?: number,
    icon?: string,
    appUrl?: string
  ) {
    this.id = id
    this.name = name
    this.icon = icon
    this.appUrl = appUrl
    this.publicKey = publicKey
    this.version = version
    this.protocolVersion = protocolVersion
  }
}

/**
 * @internalapi
 */
export class ExtendedWalletConnectPairingResponse extends WalletConnectPairingResponse {
  senderId: string
  extensionId: string

  constructor(
    id: string,
    name: string,
    publicKey: string,
    version: string | undefined,
    senderId: string,
    extensionId: string,
    protocolVersion?: number,
    icon?: string,
    appUrl?: string
  ) {
    super(id, name, publicKey, version, protocolVersion, icon, appUrl)
    this.senderId = senderId
    this.extensionId = extensionId
  }
}
// TODO: Rename to "WalletPeerInfo"?
