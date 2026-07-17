export enum NetworkType {
  MAINNET = 'mainnet',
  /** @deprecated Ghostnet is succeeded by shadownet. */
  GHOSTNET = 'ghostnet',
  WEEKLYNET = 'weeklynet', // Testnet, resets every week
  DAILYNET = 'dailynet', // Testnet, resets every day
  /** @deprecated Seoulnet is succeeded by tallinnnet. */
  SEOULNET = 'seoulnet',
  SHADOWNET = 'shadownet',
  TALLINNNET = 'tallinnnet',
  TEZLINK_SHADOWNET = 'tezlink-shadownet',
  TEZOSX_PREVIEWNET = 'tezosx-previewnet',
  /** Tezos X L2 (Michelson runtime) — long-lived mainnet deployment. */
  TEZOSX_MAINNET = 'tezosx-mainnet',
  /** Tezos X L2 (Michelson runtime) — shadownet deployment. */
  TEZOSX_SHADOWNET = 'tezosx-shadownet',
  USHUAIANET = 'ushuaianet',
  CUSTOM = 'custom'
}
