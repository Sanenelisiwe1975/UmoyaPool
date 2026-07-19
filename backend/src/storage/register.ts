import { persistence } from './persistence';
import { vaultService } from '../services/vault.service';
import { agentRegistryService } from '../services/agent-registry.service';
import { marketplaceService } from '../services/marketplace.service';
import { stokvelService } from '../services/stokvel.service';
import { paymentService } from '../services/payment.service';

export function registerStores(): void {
  persistence.register('vaults', vaultService);
  persistence.register('agents', agentRegistryService);
  persistence.register('marketplace', marketplaceService);
  persistence.register('stokvels', stokvelService);
  persistence.register('payments', paymentService);
}
