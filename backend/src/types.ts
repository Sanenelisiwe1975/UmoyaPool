// All monetary amounts are strings of stroops (1 XLM = 10^7 stroops) so they
// survive JSON round-trips without bigint/precision issues.

// ── Vault ─────────────────────────────────────────────────────────────────────

export interface Guardrails {
  maxDrawdownBps: number;      // e.g. 2000 = 20%
  dailySpendingCap: string;    // '0' = unlimited
  timeLockSeconds: number;
  whitelistedProtocols: string[];
  maxPositionSizeBps: number;  // 0 = unlimited
  emergencyStop: boolean;
}

export interface Vault {
  id: string;
  name: string;
  asset: string;               // asset code, e.g. 'XLM'
  admin: string;               // Stellar G... address
  totalShares: string;
  totalAssets: string;
  deployedAssets: string;
  apyBps: number;              // advertised APY in basis points
  riskLevel: 'low' | 'medium' | 'high';
  paused: boolean;
  guardrails: Guardrails;
  createdAt: number;
}

export interface VaultPosition {
  vaultId: string;
  owner: string;               // Stellar address
  shares: string;
  costBasis: string;           // assets contributed, for PnL display
}

export type StrategyKind = 'lending' | 'liquidity' | 'staking' | 'arbitrage' | 'other';

export interface AgentPosition {
  id: string;
  vaultId: string;
  agent: string;
  protocol: string;
  amount: string;
  entryValue: string;
  strategy: StrategyKind;
  openedAt: number;
  expiresAt: number | null;
  isOpen: boolean;
}

// ── Agent registry ────────────────────────────────────────────────────────────

export type AgentLevel = 0 | 1 | 2 | 3; // KYA reputation levels

export interface Agent {
  address: string;             // Stellar G... address
  name: string;
  owner: string;
  level: AgentLevel;
  allowlisted: boolean;
  registeredAt: number;
  metadata: Record<string, string>;
}

// ── Strategy marketplace ──────────────────────────────────────────────────────

export interface Strategy {
  id: string;
  name: string;
  author: string;              // Stellar address
  description: string;
  kind: StrategyKind;
  feeBps: number;              // performance fee routed to author
  riskLevel: 'low' | 'medium' | 'high';
  vaultId: string;             // vault whose capital it executes against
  subscribers: number;
  active: boolean;
  createdAt: number;
}

// ── Stokvel (group savings) ───────────────────────────────────────────────────

export interface StokvelMember {
  address: string;
  contributed: string;
  joinedAt: number;
}

export interface StokvelProposal {
  id: string;
  kind: 'payout' | 'invest' | 'withdraw';
  recipient: string;
  amount: string;
  approvals: string[];         // member addresses that approved
  executed: boolean;
  createdAt: number;
}

export interface Stokvel {
  id: string;
  name: string;
  creator: string;
  members: StokvelMember[];
  approvalThreshold: number;   // M of N members required
  balance: string;
  yieldVaultId: string | null; // vault this pool deposits into, if any
  proposals: StokvelProposal[];
  createdAt: number;
}

// ── Payments (x402-style machine-to-machine) ─────────────────────────────────

export interface Payment {
  id: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  memo: string;
  status: 'pending' | 'settled' | 'expired';
  createdAt: number;
  expiresAt: number;
}
