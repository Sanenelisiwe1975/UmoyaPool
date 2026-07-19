import { randomUUID } from 'node:crypto';
import { Vault, VaultPosition, Guardrails, AgentPosition, StrategyKind } from '../types';
import { HttpError } from '../utils/http-error';
import { addAmounts, subAmounts, sharesForAssets, assetsForShares, toBig } from '../utils/amounts';

const DEFAULT_GUARDRAILS: Guardrails = {
  maxDrawdownBps: 2000,
  dailySpendingCap: '0',
  timeLockSeconds: 0,
  whitelistedProtocols: [],
  maxPositionSizeBps: 0,
  emergencyStop: false,
};

export interface CreateVaultParams {
  name: string;
  asset: string;
  admin: string;
  apyBps: number;
  riskLevel: Vault['riskLevel'];
  guardrails?: Partial<Guardrails>;
}

/**
 * Shared yield engine: ERC4626-style shares over a single asset pool, with
 * on-chain-style guardrails enforced before agent capital deployment.
 * Backed by in-memory state; a Soroban-backed implementation can replace the
 * storage without changing the route layer.
 */
export class VaultService {
  private vaults = new Map<string, Vault>();
  private positions: VaultPosition[] = [];
  private agentPositions = new Map<string, AgentPosition>();

  snapshot(): unknown {
    return {
      vaults: [...this.vaults.values()],
      positions: this.positions,
      agentPositions: [...this.agentPositions.values()],
    };
  }

  restore(data: unknown): void {
    const state = data as {
      vaults: Vault[];
      positions: VaultPosition[];
      agentPositions: AgentPosition[];
    };
    this.vaults = new Map(state.vaults.map((v) => [v.id, v]));
    this.positions = state.positions;
    this.agentPositions = new Map(state.agentPositions.map((p) => [p.id, p]));
  }

  createVault(params: CreateVaultParams): Vault {
    const vault: Vault = {
      id: randomUUID(),
      name: params.name,
      asset: params.asset,
      admin: params.admin,
      totalShares: '0',
      totalAssets: '0',
      deployedAssets: '0',
      apyBps: params.apyBps,
      riskLevel: params.riskLevel,
      paused: false,
      guardrails: { ...DEFAULT_GUARDRAILS, ...params.guardrails },
      createdAt: Date.now(),
    };
    this.vaults.set(vault.id, vault);
    return vault;
  }

  listVaults(): Vault[] {
    return [...this.vaults.values()];
  }

  getVault(id: string): Vault {
    const vault = this.vaults.get(id);
    if (!vault) throw HttpError.notFound(`vault ${id} not found`);
    return vault;
  }

  deposit(vaultId: string, owner: string, assets: string): { vault: Vault; shares: string } {
    const vault = this.getVault(vaultId);
    this.assertActive(vault);
    if (toBig(assets) === 0n) throw HttpError.badRequest('deposit must be positive');

    const shares = sharesForAssets(assets, vault.totalShares, vault.totalAssets);
    vault.totalShares = addAmounts(vault.totalShares, shares);
    vault.totalAssets = addAmounts(vault.totalAssets, assets);

    let position = this.positions.find((p) => p.vaultId === vaultId && p.owner === owner);
    if (!position) {
      position = { vaultId, owner, shares: '0', costBasis: '0' };
      this.positions.push(position);
    }
    position.shares = addAmounts(position.shares, shares);
    position.costBasis = addAmounts(position.costBasis, assets);

    return { vault, shares };
  }

  withdraw(vaultId: string, owner: string, shares: string): { vault: Vault; assets: string } {
    const vault = this.getVault(vaultId);
    if (vault.guardrails.emergencyStop) throw HttpError.forbidden('vault is in emergency stop');

    const position = this.positions.find((p) => p.vaultId === vaultId && p.owner === owner);
    if (!position || toBig(position.shares) < toBig(shares)) {
      throw HttpError.badRequest('insufficient shares');
    }

    const assets = assetsForShares(shares, vault.totalShares, vault.totalAssets);
    const idle = subAmounts(vault.totalAssets, vault.deployedAssets);
    if (toBig(assets) > toBig(idle)) {
      throw HttpError.conflict('insufficient idle liquidity; capital is deployed');
    }

    position.shares = subAmounts(position.shares, shares);
    vault.totalShares = subAmounts(vault.totalShares, shares);
    vault.totalAssets = subAmounts(vault.totalAssets, assets);

    return { vault, assets };
  }

  positionsForOwner(owner: string): (VaultPosition & { currentValue: string })[] {
    return this.positions
      .filter((p) => p.owner === owner && toBig(p.shares) > 0n)
      .map((p) => {
        const vault = this.getVault(p.vaultId);
        return {
          ...p,
          currentValue: assetsForShares(p.shares, vault.totalShares, vault.totalAssets),
        };
      });
  }

  // ── Agent capital deployment, gated by guardrails ──────────────────────────

  openAgentPosition(params: {
    vaultId: string;
    agent: string;
    protocol: string;
    amount: string;
    strategy: StrategyKind;
    expiresAt?: number;
  }): AgentPosition {
    const vault = this.getVault(params.vaultId);
    this.assertActive(vault);
    this.enforceGuardrails(vault, params.protocol, params.amount);

    const idle = subAmounts(vault.totalAssets, vault.deployedAssets);
    if (toBig(params.amount) > toBig(idle)) {
      throw HttpError.conflict('insufficient idle liquidity');
    }

    const position: AgentPosition = {
      id: randomUUID(),
      vaultId: params.vaultId,
      agent: params.agent,
      protocol: params.protocol,
      amount: params.amount,
      entryValue: params.amount,
      strategy: params.strategy,
      openedAt: Date.now(),
      expiresAt: params.expiresAt ?? null,
      isOpen: true,
    };
    vault.deployedAssets = addAmounts(vault.deployedAssets, params.amount);
    this.agentPositions.set(position.id, position);
    return position;
  }

  closeAgentPosition(positionId: string, returnAmount: string): AgentPosition {
    const position = this.agentPositions.get(positionId);
    if (!position) throw HttpError.notFound(`position ${positionId} not found`);
    if (!position.isOpen) throw HttpError.conflict('position already closed');

    const vault = this.getVault(position.vaultId);
    const returned = toBig(returnAmount);
    const entry = toBig(position.entryValue);

    // Drawdown guardrail: a close below the allowed floor is rejected.
    const floorBps = BigInt(10_000 - vault.guardrails.maxDrawdownBps);
    if (returned * 10_000n < entry * floorBps) {
      throw HttpError.forbidden('close would exceed max drawdown guardrail');
    }

    vault.deployedAssets = subAmounts(vault.deployedAssets, position.entryValue);
    // Profit or loss adjusts the pool; shares stay constant, so share price moves.
    vault.totalAssets = addAmounts(subAmounts(vault.totalAssets, position.entryValue), returnAmount);

    position.isOpen = false;
    position.amount = returnAmount;
    return position;
  }

  listAgentPositions(vaultId?: string): AgentPosition[] {
    const all = [...this.agentPositions.values()];
    return vaultId ? all.filter((p) => p.vaultId === vaultId) : all;
  }

  setEmergencyStop(vaultId: string, stop: boolean): Vault {
    const vault = this.getVault(vaultId);
    vault.guardrails.emergencyStop = stop;
    vault.paused = stop;
    return vault;
  }

  updateGuardrails(vaultId: string, patch: Partial<Guardrails>): Vault {
    const vault = this.getVault(vaultId);
    vault.guardrails = { ...vault.guardrails, ...patch };
    return vault;
  }

  private assertActive(vault: Vault): void {
    if (vault.paused) throw HttpError.forbidden('vault is paused');
    if (vault.guardrails.emergencyStop) throw HttpError.forbidden('vault is in emergency stop');
  }

  private enforceGuardrails(vault: Vault, protocol: string, amount: string): void {
    const g = vault.guardrails;
    if (g.whitelistedProtocols.length > 0 && !g.whitelistedProtocols.includes(protocol)) {
      throw HttpError.forbidden(`protocol ${protocol} is not whitelisted`);
    }
    if (g.maxPositionSizeBps > 0) {
      const cap = (toBig(vault.totalAssets) * BigInt(g.maxPositionSizeBps)) / 10_000n;
      if (toBig(amount) > cap) {
        throw HttpError.forbidden('position exceeds max position size guardrail');
      }
    }
  }
}

export const vaultService = new VaultService();
