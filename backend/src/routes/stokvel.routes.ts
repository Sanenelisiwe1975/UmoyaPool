import { Router } from 'express';
import { z } from 'zod';
import { stokvelService } from '../services/stokvel.service';
import { validateBody } from '../middleware/validate';

const router = Router();

const amount = z.string().regex(/^\d+$/, 'amount must be an integer string (stroops)');
const address = z.string().min(3);

const createSchema = z.object({
  name: z.string().min(1).max(80),
  creator: address,
  approvalThreshold: z.number().int().min(1),
});

const joinSchema = z.object({ address });
const contributeSchema = z.object({ address, amount });
const yieldVaultSchema = z.object({ requester: address, vaultId: z.string().min(1) });

const proposeSchema = z.object({
  proposer: address,
  kind: z.enum(['payout', 'invest', 'withdraw']),
  recipient: address,
  amount,
});

const approveSchema = z.object({ approver: address });

router.get('/', (_req, res) => {
  res.json({ stokvels: stokvelService.list() });
});

router.post('/', validateBody(createSchema), (req, res) => {
  res.status(201).json({ stokvel: stokvelService.create(req.body) });
});

router.get('/:id', (req, res) => {
  res.json({ stokvel: stokvelService.get(req.params.id) });
});

router.post('/:id/join', validateBody(joinSchema), (req, res) => {
  res.json({ stokvel: stokvelService.join(req.params.id, req.body.address) });
});

router.post('/:id/contribute', validateBody(contributeSchema), (req, res) => {
  res.json({ stokvel: stokvelService.contribute(req.params.id, req.body.address, req.body.amount) });
});

router.post('/:id/yield-vault', validateBody(yieldVaultSchema), (req, res) => {
  res.json({ stokvel: stokvelService.setYieldVault(req.params.id, req.body.requester, req.body.vaultId) });
});

router.post('/:id/proposals', validateBody(proposeSchema), (req, res) => {
  const { proposer, ...params } = req.body;
  res.status(201).json({ proposal: stokvelService.propose(req.params.id, proposer, params) });
});

router.post('/:id/proposals/:proposalId/approve', validateBody(approveSchema), (req, res) => {
  res.json(stokvelService.approve(req.params.id, req.params.proposalId, req.body.approver));
});

export default router;
