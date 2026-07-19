import { Router } from 'express';
import { z } from 'zod';
import { vaultService } from '../services/vault.service';
import { agentRegistryService } from '../services/agent-registry.service';
import { requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

const amount = z.string().regex(/^\d+$/, 'amount must be an integer string (stroops)');
const stellarAddress = z.string().min(3);

const createSchema = z.object({
  name: z.string().min(1).max(80),
  asset: z.string().min(1).max(12),
  admin: stellarAddress,
  apyBps: z.number().int().min(0).max(50_000),
  riskLevel: z.enum(['low', 'medium', 'high']),
});

const depositSchema = z.object({ owner: stellarAddress, assets: amount });
const withdrawSchema = z.object({ owner: stellarAddress, shares: amount });

const openPositionSchema = z.object({
  agent: stellarAddress,
  protocol: z.string().min(1),
  amount,
  strategy: z.enum(['lending', 'liquidity', 'staking', 'arbitrage', 'other']),
  expiresAt: z.number().int().positive().optional(),
});

const closePositionSchema = z.object({ returnAmount: amount });

const guardrailsSchema = z.object({
  maxDrawdownBps: z.number().int().min(0).max(10_000).optional(),
  dailySpendingCap: amount.optional(),
  timeLockSeconds: z.number().int().min(0).optional(),
  whitelistedProtocols: z.array(z.string()).optional(),
  maxPositionSizeBps: z.number().int().min(0).max(10_000).optional(),
});

router.get('/', (_req, res) => {
  res.json({ vaults: vaultService.listVaults() });
});

router.post('/', validateBody(createSchema), (req, res) => {
  res.status(201).json({ vault: vaultService.createVault(req.body) });
});

router.get('/positions', (req, res) => {
  const owner = String(req.query.owner ?? '');
  res.json({ positions: owner ? vaultService.positionsForOwner(owner) : [] });
});

router.get('/:id', (req, res) => {
  res.json({ vault: vaultService.getVault(req.params.id) });
});

router.post('/:id/deposit', validateBody(depositSchema), (req, res) => {
  const { owner, assets } = req.body;
  const result = vaultService.deposit(req.params.id, owner, assets);
  res.json({ vault: result.vault, sharesReceived: result.shares });
});

router.post('/:id/withdraw', validateBody(withdrawSchema), (req, res) => {
  const { owner, shares } = req.body;
  const result = vaultService.withdraw(req.params.id, owner, shares);
  res.json({ vault: result.vault, assetsReceived: result.assets });
});

router.get('/:id/agent-positions', (req, res) => {
  res.json({ positions: vaultService.listAgentPositions(req.params.id) });
});

router.post('/:id/agent-positions', validateBody(openPositionSchema), (req, res) => {
  agentRegistryService.assertMayDeploy(req.body.agent);
  const position = vaultService.openAgentPosition({ vaultId: req.params.id, ...req.body });
  res.status(201).json({ position });
});

router.post('/:id/agent-positions/:positionId/close', validateBody(closePositionSchema), (req, res) => {
  const position = vaultService.closeAgentPosition(req.params.positionId, req.body.returnAmount);
  res.json({ position });
});

router.post('/:id/emergency-stop', requireAdmin, (req, res) => {
  const stop = req.body?.stop !== false;
  res.json({ vault: vaultService.setEmergencyStop(req.params.id, stop) });
});

router.patch('/:id/guardrails', requireAdmin, validateBody(guardrailsSchema), (req, res) => {
  res.json({ vault: vaultService.updateGuardrails(req.params.id, req.body) });
});

export default router;
