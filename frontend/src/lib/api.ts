// Thin typed client for the UmoyaPool backend. Uses the wallet session JWT
// when connected, falling back to the backend's dev API key otherwise.

const DEV_API_KEY = 'umoyapool-dev-key';

let sessionToken: string | null = null;

export function setSessionToken(token: string | null): void {
  sessionToken = token;
}

export interface Guardrails {
  maxDrawdownBps: number;
  dailySpendingCap: string;
  timeLockSeconds: number;
  whitelistedProtocols: string[];
  maxPositionSizeBps: number;
  emergencyStop: boolean;
}

export interface Vault {
  id: string;
  name: string;
  asset: string;
  admin: string;
  totalShares: string;
  totalAssets: string;
  deployedAssets: string;
  apyBps: number;
  riskLevel: 'low' | 'medium' | 'high';
  paused: boolean;
  guardrails: Guardrails;
  createdAt: number;
}

export interface VaultPosition {
  vaultId: string;
  owner: string;
  shares: string;
  costBasis: string;
  currentValue: string;
}

export interface AgentPosition {
  id: string;
  vaultId: string;
  agent: string;
  protocol: string;
  amount: string;
  entryValue: string;
  strategy: string;
  openedAt: number;
  expiresAt: number | null;
  isOpen: boolean;
}

export interface Agent {
  address: string;
  name: string;
  owner: string;
  level: 0 | 1 | 2 | 3;
  allowlisted: boolean;
  registeredAt: number;
  metadata: Record<string, string>;
}

export interface Strategy {
  id: string;
  name: string;
  author: string;
  description: string;
  kind: string;
  feeBps: number;
  riskLevel: 'low' | 'medium' | 'high';
  vaultId: string;
  subscribers: number;
  active: boolean;
  createdAt: number;
}

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
  approvals: string[];
  executed: boolean;
  createdAt: number;
}

export interface Stokvel {
  id: string;
  name: string;
  creator: string;
  members: StokvelMember[];
  approvalThreshold: number;
  balance: string;
  yieldVaultId: string | null;
  proposals: StokvelProposal[];
  createdAt: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken ?? DEV_API_KEY}`,
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  devSession: (address: string) =>
    request<{ token: string; address: string }>('/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),

  listVaults: () => request<{ vaults: Vault[] }>('/api/vaults'),
  getVault: (id: string) => request<{ vault: Vault }>(`/api/vaults/${id}`),
  deposit: (id: string, owner: string, assets: string) =>
    request<{ vault: Vault; sharesReceived: string }>(`/api/vaults/${id}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ owner, assets }),
    }),
  withdraw: (id: string, owner: string, shares: string) =>
    request<{ vault: Vault; assetsReceived: string }>(`/api/vaults/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ owner, shares }),
    }),
  positions: (owner: string) =>
    request<{ positions: VaultPosition[] }>(`/api/vaults/positions?owner=${encodeURIComponent(owner)}`),
  agentPositions: (vaultId: string) =>
    request<{ positions: AgentPosition[] }>(`/api/vaults/${vaultId}/agent-positions`),

  listAgents: () => request<{ agents: Agent[] }>('/api/agents'),

  listStrategies: () => request<{ strategies: Strategy[] }>('/api/marketplace'),
  subscribe: (id: string) =>
    request<{ strategy: Strategy }>(`/api/marketplace/${id}/subscribe`, { method: 'POST' }),

  listStokvels: () => request<{ stokvels: Stokvel[] }>('/api/stokvels'),
  contribute: (id: string, address: string, amount: string) =>
    request<{ stokvel: Stokvel }>(`/api/stokvels/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ address, amount }),
    }),
};

/** Formats a stroops string as a decimal asset amount (1 unit = 10^7 stroops). */
export function formatAmount(stroops: string, decimals = 2): string {
  const value = Number(stroops) / 1e7;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}
