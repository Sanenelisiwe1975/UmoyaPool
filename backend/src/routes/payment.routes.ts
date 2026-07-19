import { Router } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment.service';
import { validateBody } from '../middleware/validate';

const router = Router();

const requestSchema = z.object({
  from: z.string().min(3),
  to: z.string().min(3),
  amount: z.string().regex(/^\d+$/, 'amount must be an integer string (stroops)'),
  asset: z.string().min(1).max(12),
  memo: z.string().max(64).optional(),
  ttlMs: z.number().int().positive().optional(),
});

router.get('/', (req, res) => {
  const address = req.query.address ? String(req.query.address) : undefined;
  res.json({ payments: paymentService.list(address) });
});

router.post('/', validateBody(requestSchema), (req, res) => {
  res.status(201).json({ payment: paymentService.request(req.body) });
});

router.get('/:id', (req, res) => {
  res.json({ payment: paymentService.get(req.params.id) });
});

router.post('/:id/settle', (req, res) => {
  res.json({ payment: paymentService.settle(req.params.id) });
});

router.post('/:id/consume', (req, res) => {
  res.json({ payment: paymentService.consume(req.params.id) });
});

export default router;
