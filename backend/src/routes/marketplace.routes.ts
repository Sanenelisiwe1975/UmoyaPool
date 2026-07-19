import { Router } from 'express';
import { z } from 'zod';
import { marketplaceService } from '../services/marketplace.service';
import { validateBody } from '../middleware/validate';

const router = Router();

const publishSchema = z.object({
  name: z.string().min(1).max(80),
  author: z.string().min(3),
  description: z.string().max(2000),
  kind: z.enum(['lending', 'liquidity', 'staking', 'arbitrage', 'other']),
  feeBps: z.number().int().min(0),
  riskLevel: z.enum(['low', 'medium', 'high']),
  vaultId: z.string().min(1),
});

const deactivateSchema = z.object({ requester: z.string().min(3) });

router.get('/', (req, res) => {
  res.json({
    strategies: marketplaceService.list({
      vaultId: req.query.vaultId ? String(req.query.vaultId) : undefined,
      activeOnly: req.query.active === 'true',
    }),
  });
});

router.post('/', validateBody(publishSchema), (req, res) => {
  res.status(201).json({ strategy: marketplaceService.publish(req.body) });
});

router.get('/:id', (req, res) => {
  res.json({ strategy: marketplaceService.get(req.params.id) });
});

router.post('/:id/subscribe', (req, res) => {
  res.json({ strategy: marketplaceService.subscribe(req.params.id) });
});

router.post('/:id/deactivate', validateBody(deactivateSchema), (req, res) => {
  res.json({ strategy: marketplaceService.deactivate(req.params.id, req.body.requester) });
});

export default router;
