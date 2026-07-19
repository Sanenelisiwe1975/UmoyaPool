// Read the deployed vault's on-chain state by simulating get_vault().
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = (await import('node:module')).createRequire(resolve(here, '../../backend/package.json'));
const { Keypair, TransactionBuilder, Networks, Operation, BASE_FEE, rpc, scValToNative } = require('@stellar/stellar-sdk');

const { contractAddress } = JSON.parse(readFileSync(resolve(here, 'deployment.json'), 'utf8'));
const server = new rpc.Server('https://soroban-testnet.stellar.org');

// A throwaway funded source just to build the simulation envelope.
const kp = Keypair.random();
await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
const account = await server.getAccount(kp.publicKey());

const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.invokeContractFunction({ contract: contractAddress, function: 'get_vault', args: [] }))
  .setTimeout(30)
  .build();

const sim = await server.simulateTransaction(tx);
if (sim.error) {
  console.error('simulation error:', sim.error);
  process.exit(1);
}
const vault = scValToNative(sim.result.retval);
console.log('on-chain get_vault() returned:');
console.log(JSON.stringify(vault, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
