import { config } from './config';
import { createServer } from './server';
import { registerStores } from './storage/register';
import { persistence } from './storage/persistence';
import { seedDemoData } from './seed';
import { logger } from './utils/logger';

registerStores();
const restored = persistence.load();

if (!restored && config.nodeEnv !== 'production') {
  seedDemoData();
  persistence.saveNow();
}

const app = createServer();

app.listen(config.port, () => {
  logger.info('backend listening', { port: config.port, env: config.nodeEnv });
});

process.on('SIGINT', () => {
  persistence.saveNow();
  process.exit(0);
});
process.on('SIGTERM', () => {
  persistence.saveNow();
  process.exit(0);
});
