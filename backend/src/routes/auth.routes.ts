import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { authService } from '../services/auth.service';
import { validateBody } from '../middleware/validate';
import { HttpError } from '../utils/http-error';

const router = Router();

const address = z.string().regex(/^G[A-Z2-7]{55}$/, 'must be a Stellar public key');

const challengeSchema = z.object({ address });
const verifySchema = z.object({ address, signature: z.string().min(1) });
const devSessionSchema = z.object({ address });

// Step 1: obtain a nonce to sign.
router.post('/challenge', validateBody(challengeSchema), (req, res) => {
  res.json(authService.createChallenge(req.body.address));
});

// Step 2: prove key ownership, receive a session JWT.
router.post('/verify', validateBody(verifySchema), (req, res) => {
  const token = authService.verify(req.body.address, req.body.signature);
  res.json({ token, address: req.body.address, expiresIn: config.jwtTtlSeconds });
});

// Development shortcut: a session without a signature. Disabled in production.
router.post('/session', validateBody(devSessionSchema), (req, res, next) => {
  if (config.nodeEnv === 'production') {
    return next(HttpError.forbidden('dev sessions are disabled in production'));
  }
  const token = authService.issueToken(req.body.address);
  res.json({ token, address: req.body.address, expiresIn: config.jwtTtlSeconds });
});

export default router;
