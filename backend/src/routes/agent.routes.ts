import { Router } from 'express';
import { z } from 'zod';
import { agentRegistryService } from '../services/agent-registry.service';
import { requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

const registerSchema = z.object({
  address: z.string().min(3),
  name: z.string().min(1).max(80),
  owner: z.string().min(3),
  metadata: z.record(z.string()).optional(),
});

const levelSchema = z.object({ level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]) });
const allowlistSchema = z.object({ allowlisted: z.boolean() });

router.get('/', (_req, res) => {
  res.json({ agents: agentRegistryService.list() });
});

router.post('/', validateBody(registerSchema), (req, res) => {
  res.status(201).json({ agent: agentRegistryService.register(req.body) });
});

router.get('/:address', (req, res) => {
  res.json({ agent: agentRegistryService.get(req.params.address) });
});

router.patch('/:address/level', requireAdmin, validateBody(levelSchema), (req, res) => {
  res.json({ agent: agentRegistryService.setLevel(req.params.address, req.body.level) });
});

router.patch('/:address/allowlist', requireAdmin, validateBody(allowlistSchema), (req, res) => {
  res.json({ agent: agentRegistryService.setAllowlisted(req.params.address, req.body.allowlisted) });
});

export default router;
