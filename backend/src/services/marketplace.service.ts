import { randomUUID } from 'node:crypto';
import { Strategy, StrategyKind } from '../types';
import { HttpError } from '../utils/http-error';

const MAX_FEE_BPS = 3000; // authors may take at most 30%

export class MarketplaceService {
  private strategies = new Map<string, Strategy>();

  snapshot(): unknown {
    return { strategies: [...this.strategies.values()] };
  }

  restore(data: unknown): void {
    const state = data as { strategies: Strategy[] };
    this.strategies = new Map(state.strategies.map((s) => [s.id, s]));
  }

  publish(params: {
    name: string;
    author: string;
    description: string;
    kind: StrategyKind;
    feeBps: number;
    riskLevel: Strategy['riskLevel'];
    vaultId: string;
  }): Strategy {
    if (params.feeBps < 0 || params.feeBps > MAX_FEE_BPS) {
      throw HttpError.badRequest(`feeBps must be between 0 and ${MAX_FEE_BPS}`);
    }
    const strategy: Strategy = {
      id: randomUUID(),
      subscribers: 0,
      active: true,
      createdAt: Date.now(),
      ...params,
    };
    this.strategies.set(strategy.id, strategy);
    return strategy;
  }

  list(filter?: { vaultId?: string; activeOnly?: boolean }): Strategy[] {
    let all = [...this.strategies.values()];
    if (filter?.vaultId) all = all.filter((s) => s.vaultId === filter.vaultId);
    if (filter?.activeOnly) all = all.filter((s) => s.active);
    return all;
  }

  get(id: string): Strategy {
    const strategy = this.strategies.get(id);
    if (!strategy) throw HttpError.notFound(`strategy ${id} not found`);
    return strategy;
  }

  subscribe(id: string): Strategy {
    const strategy = this.get(id);
    if (!strategy.active) throw HttpError.conflict('strategy is not active');
    strategy.subscribers += 1;
    return strategy;
  }

  deactivate(id: string, requester: string): Strategy {
    const strategy = this.get(id);
    if (strategy.author !== requester) {
      throw HttpError.forbidden('only the author may deactivate a strategy');
    }
    strategy.active = false;
    return strategy;
  }
}

export const marketplaceService = new MarketplaceService();
