// Deploy the UmoyaPool vault contract to Stellar testnet using the JS SDK.
//
// Steps: generate + friendbot-fund a keypair, upload the compiled wasm,
// create a contract instance, then invoke `initialize`. Writes the resulting
// contract address to deploy/deployment.json.
//
// Usage (from contracts/deploy, with @stellar/stellar-sdk resolvable):
//   node deploy.mjs <path-to-vault.wasm>
//
// The SDK is reused from ../../backend/node_modules to avoid a second install.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = (await import('node:module')).createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../backend/package.json'),
);
const Stellar = require('@stellar/stellar-sdk');

const {
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  BASE_FEE,
  rpc,
  hash,
  xdr,
  Address,
  nativeToScVal,
} = Stellar;

const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL, { allowHttp: false });
const NETWORK = Networks.TESTNET;

const wasmPath = process.argv[2];
if (!wasmPath) {
  console.error('usage: node deploy.mjs <path-to-vault.wasm>');
  process.exit(1);
}

const log = (...a) => console.log('[deploy]', ...a);

async function fund(kp) {
  log('funding', kp.publicKey(), 'via friendbot');
  const res = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
  if (!res.ok && res.status !== 400) {
    throw new Error(`friendbot failed: ${res.status}`);
  }
  // 400 usually means "already funded" — tolerate it.
}

// Build, simulate, sign, send, and poll a single-operation transaction.
async function submit(kp, buildOp, description) {
  const account = await server.getAccount(kp.publicKey());
  const tx = new TransactionBuilder(account, { fee: (BASE_FEE * 100).toString(), networkPassphrase: NETWORK })
    .addOperation(buildOp())
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const sent = await server.sendTransaction(prepared);
  if (sent.status === 'ERROR') {
    throw new Error(`${description} submit error: ${JSON.stringify(sent.errorResult)}`);
  }

  let result = await server.getTransaction(sent.hash);
  for (let i = 0; i < 30 && result.status === 'NOT_FOUND'; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    result = await server.getTransaction(sent.hash);
  }
  if (result.status !== 'SUCCESS') {
    throw new Error(`${description} failed: ${result.status}`);
  }
  log(`${description} ok — tx ${sent.hash}`);
  return result;
}

async function main() {
  const wasm = readFileSync(resolve(wasmPath));
  log('wasm size', wasm.length, 'bytes');

  const kp = Keypair.random();
  await fund(kp);

  // 1. Upload wasm → returns the wasm hash.
  const wasmHash = hash(wasm);
  await submit(kp, () => Operation.uploadContractWasm({ wasm }), 'upload wasm');

  // 2. Create a contract instance from that wasm hash.
  const createResult = await submit(
    kp,
    () =>
      Operation.createCustomContract({
        address: new Address(kp.publicKey()),
        wasmHash,
        salt: hash(Buffer.from(`umoyapool-vault-${Date.now()}`)),
      }),
    'create contract',
  );

  // Pull the created contract address out of the transaction return value.
  const contractAddress = Address.fromScAddress(
    createResult.returnValue.address(),
  ).toString();
  log('contract address', contractAddress);

  // 3. initialize(admin, asset, max_drawdown_bps, whitelisted_protocols, max_position_size_bps)
  const admin = new Address(kp.publicKey()).toScVal();
  const asset = nativeToScVal('XLM', { type: 'string' });
  const maxDrawdown = nativeToScVal(1000, { type: 'u32' });
  const protocols = nativeToScVal(['blend', 'soroswap'], { type: 'string' });
  const maxPosition = nativeToScVal(2500, { type: 'u32' });

  await submit(
    kp,
    () =>
      Operation.invokeContractFunction({
        contract: contractAddress,
        function: 'initialize',
        args: [admin, asset, maxDrawdown, protocols, maxPosition],
      }),
    'initialize',
  );

  const deployment = {
    network: 'testnet',
    contractAddress,
    admin: kp.publicKey(),
    adminSecret: kp.secret(),
    wasmHash: wasmHash.toString('hex'),
    initializedAt: new Date().toISOString(),
  };
  const outPath = resolve(dirname(fileURLToPath(import.meta.url)), 'deployment.json');
  writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  log('wrote', outPath);
  console.log('\nDEPLOYED:', contractAddress);
}

main().catch((e) => {
  console.error('[deploy] FAILED:', e.message);
  process.exit(1);
});
