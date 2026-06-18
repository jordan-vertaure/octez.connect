/**
 * One per-network account entry in a v4 multi-network permission response's
 * `blockchainData.accounts` map (keyed by CAIP-2 chain id). All fields are
 * optional; missing values fall back to the envelope-level `blockchainData`.
 *
 * @category Message
 */
export interface PermissionResponseAccount {
  publicKey?: string
  address?: string
  name?: string
  rpcUrl?: string
}

/**
 * The v4 multi-network fanout map: CAIP-2 chain id → per-network account.
 *
 * @category Message
 */
export type PermissionResponseAccounts = Record<string, PermissionResponseAccount>
