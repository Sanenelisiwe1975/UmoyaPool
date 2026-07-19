# UmoyaPool Soroban contracts

Rust/WASM smart contracts for the UmoyaPool yield engine. This is the on-chain
core the TypeScript backend mirrors off-chain today and will call into next.

## `vault` — shared yield engine

An ERC4626-style single-asset vault with on-chain risk guardrails.

- **Shares:** depositors receive shares proportional to the pool; the first
  deposit mints 1:1, later deposits mint at the live per-share price. Realized
  agent PnL moves the share price, not the share count.
- **Guardrails, enforced in-contract before capital leaves the vault:**
  - protocol whitelist (empty = allow any),
  - max position size (bps of total assets; 0 = unlimited),
  - max drawdown on position close (bps),
  - emergency stop / pause.
- **Roles:** `admin` (guardrails, agent allowlist, pause) and allowlisted
  `agent`s (deploy/close capital). Every privileged entrypoint calls
  `require_auth`; agents must be allowlisted before deploying and can only
  close their own positions.
- **Storage:** instance storage for the vault aggregate, persistent storage for
  per-address share ledgers, positions, and the agent allowlist, each with TTL
  bumps on write so an active vault never expires.

### Entry points

`initialize`, `deposit`, `withdraw`, `set_agent`, `open_position`,
`close_position`, `set_emergency_stop`, `set_guardrails`, and views
`get_vault` / `shares_of` / `assets_of` / `get_position`.

## Build & test

Uses the local Rust toolchain (cargo 1.96, soroban-sdk 22). `Cargo.lock` pins a
known-good transitive tree (notably `ed25519-dalek` 2.x — newer 3.x breaks
`soroban-env-host`).

```bash
# from contracts/
cargo test                                              # 18 tests, native Soroban test env
cargo build --release --target wasm32-unknown-unknown   # raw wasm

# Soroban's VM rejects the reference-types call_indirect encoding that current
# Rust/LLVM emit by default, so lower the module to MVP with binaryen:
wasm-opt target/wasm32-unknown-unknown/release/vault.wasm \
  --all-features --disable-gc --disable-reference-types -Oz \
  -o target/wasm32-unknown-unknown/release/vault.mvp.wasm

# Deploy (funds a fresh keypair via friendbot, uploads, creates, initializes):
cd deploy && node deploy.mjs ../target/wasm32-unknown-unknown/release/vault.mvp.wasm
node verify.mjs   # read the deployed state back from testnet
```

The `wasm32-unknown-unknown` target must be installed for the release build;
`cargo test` runs natively and needs no wasm target. A live testnet deployment
already exists — see [deploy/deployment.public.json](deploy/deployment.public.json).

## Security notes (for the case study)

This contract is the flagship input for the UmoyaPool security work: it is the
subject of the STRIDE threat model and the first real target for the Soroban
scanner. Deliberate properties worth auditing: share-price rounding always
favors the pool, drawdown is checked before state mutation, and withdrawals are
capped at idle (non-deployed) liquidity. Token transfers are intentionally out
of scope in this cut — the contract does share accounting; a `token::Client`
transfer wires in without changing the math.
