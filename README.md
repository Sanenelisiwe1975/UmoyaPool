# UmoyaPool

**Private and programmable yield for AI agents on Stellar.** *(Umoya — isiZulu/isiXhosa for "spirit / breath / air".)*

UmoyaPool lets people and autonomous agents deploy capital across Stellar DeFi with **risk guardrails enforced on-chain**, save together through **stokvels** (group savings with M-of-N approval), and settle **machine-to-machine payments** — mobile-first, low-fee, and built for African markets.

See [SUBMISSION.md](SUBMISSION.md) for the pitch, the live testnet contract address, and demo steps.

## Structure

- **contracts/** — Soroban (Rust/WASM) smart contracts. The `vault` contract is the on-chain yield engine: ERC4626-style shares with in-contract guardrails (protocol whitelist, position-size cap, drawdown floor, emergency stop), admin/agent roles via `require_auth`, and TTL-managed storage. 18 passing tests; deploys to Stellar testnet. See [contracts/README.md](contracts/README.md).
- **backend/** — Express + TypeScript API mirroring the domain model: vault engine, agent registry (KYA levels 0–3 + allowlist), strategy marketplace, stokvel (M-of-N approvals), and x402-style payments. File-persisted state; Bearer dev key or wallet-session JWT auth (admin routes need `x-admin-key`). Structured so routes can call the on-chain contract next.
- **frontend/** — Vite + React + TypeScript SPA: landing plus Portfolio, Vaults (deposit/withdraw), Stokvel, Strategies, and Agents. Wallet sessions persist across reloads. Dark theme, pure CSS, no UI framework.

## Run

```bash
npm run install:all    # backend + frontend deps
npm run dev            # backend on :3000, frontend on :5173  →  http://localhost:5173

cd contracts && cargo test    # 18 passing (native Soroban test env)
```

The backend seeds demo data in development. Default dev API key: `umoyapool-dev-key`; admin key: `umoyapool-admin-key` (see `backend/.env.example`).

## Not yet built (intentionally out of scope for this cut)

ZK prover, privacy pool, FHE strategy encryption, Ika dWallets, SEP-10 wallet auth, RWA/remittance modules, and wiring the backend routes to call the deployed `vault` contract (the service layer is structured so this slots in behind the existing routes). Additional contracts (stokvel, marketplace, agent registry) follow the `vault` pattern.
