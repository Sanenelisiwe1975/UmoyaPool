import { vaultService } from './services/vault.service';
import { agentRegistryService } from './services/agent-registry.service';
import { marketplaceService } from './services/marketplace.service';
import { stokvelService } from './services/stokvel.service';
import { logger } from './utils/logger';

const ADMIN = 'GDEMOADMINADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const ALICE = 'GDEMOALICEADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const BOB = 'GDEMOBOBADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const AGENT = 'GDEMOAGENTADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** Populates the in-memory stores so the frontend has data on first run. */
export function seedDemoData(): void {
  const core = vaultService.createVault({
    name: 'Core XLM Yield',
    asset: 'XLM',
    admin: ADMIN,
    apyBps: 620,
    riskLevel: 'low',
    guardrails: { maxDrawdownBps: 1000, whitelistedProtocols: ['blend', 'soroswap'] },
  });
  const growth = vaultService.createVault({
    name: 'Growth USDC',
    asset: 'USDC',
    admin: ADMIN,
    apyBps: 1140,
    riskLevel: 'medium',
  });

  vaultService.deposit(core.id, ALICE, '2500000000');   // 250 XLM
  vaultService.deposit(core.id, BOB, '1000000000');     // 100 XLM
  vaultService.deposit(growth.id, ALICE, '5000000000'); // 500 USDC

  const agent = agentRegistryService.register({
    address: AGENT,
    name: 'Yield Scout',
    owner: ALICE,
    metadata: { model: 'demo', version: '1' },
  });
  agentRegistryService.setLevel(agent.address, 2);
  agentRegistryService.setAllowlisted(agent.address, true);

  vaultService.openAgentPosition({
    vaultId: core.id,
    agent: AGENT,
    protocol: 'blend',
    amount: '1200000000',
    strategy: 'lending',
  });

  marketplaceService.publish({
    name: 'Blend Lending Ladder',
    author: ALICE,
    description: 'Laddered lending positions on Blend with weekly rebalancing.',
    kind: 'lending',
    feeBps: 500,
    riskLevel: 'low',
    vaultId: core.id,
  });
  marketplaceService.publish({
    name: 'Soroswap LP Rotator',
    author: BOB,
    description: 'Rotates liquidity across the top Soroswap pools by volume.',
    kind: 'liquidity',
    feeBps: 1000,
    riskLevel: 'medium',
    vaultId: growth.id,
  });

  const stokvel = stokvelService.create({ name: 'Ubuntu Savers', creator: ALICE, approvalThreshold: 2 });
  stokvelService.join(stokvel.id, BOB);
  stokvelService.contribute(stokvel.id, ALICE, '500000000');
  stokvelService.contribute(stokvel.id, BOB, '500000000');
  stokvelService.setYieldVault(stokvel.id, ALICE, core.id);

  logger.info('seeded demo data', { vaults: 2, agents: 1, strategies: 2, stokvels: 1 });
}
