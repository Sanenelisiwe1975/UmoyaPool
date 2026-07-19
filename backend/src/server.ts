import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { persistence } from './storage/persistence';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth.routes';
import vaultRoutes from './routes/vault.routes';
import agentRoutes from './routes/agent.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import stokvelRoutes from './routes/stokvel.routes';
import paymentRoutes from './routes/payment.routes';

export function createServer(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Snapshot state after any successful mutating request.
  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      res.on('finish', () => {
        if (res.statusCode < 400) persistence.schedule();
      });
    }
    next();
  });

  app.use('/api/auth', authRoutes);

  // Everything else under /api requires a bearer token.
  app.use('/api', requireAuth);
  app.use('/api/vaults', vaultRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/stokvels', stokvelRoutes);
  app.use('/api/payments', paymentRoutes);

  app.use(errorHandler);
  return app;
}
