export interface PeerInfo {
  id: string
  name: string
  type: string
  icon?: string
  appUrl?: string
  publicKey: string
  /**
   * The wallet's beacon protocol version negotiated at pairing. Undefined when
   * the transport cannot determine it (WalletConnect pairings, where version
   * negotiation happens at the session level, not per beacon message): version
   * gates treat unknown as "allowed through", and version-gated features (e.g.
   * the v4 multi-network protocol) stay on the legacy path. Transports must
   * never fabricate a value here. P2P and PostMessage pairings carry a real
   * wallet-declared version and keep this field required on their subclasses.
   */
  version?: string
  protocolVersion?: number
}

export interface ExtendedPeerInfo extends PeerInfo {
  senderId: string
}

export type PeerInfoType = PeerInfo | ExtendedPeerInfo
