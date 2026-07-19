# UmoyaPool — submission

**Private and programmable yield for AI agents on Stellar.** *(Umoya — isiZulu/isiXhosa for "spirit / breath / air".)*

UmoyaPool lets people and autonomous agents deploy capital across Stellar DeFi with **risk guardrails enforced on-chain**, save together through **stokvels** (group savings with M-of-N approval), and settle **machine-to-machine payments** — mobile-first, low-fee, built for African markets and emerging economies.

---

## What's live

| Component | Status |
|---|---|
| Soroban `vault` contract (Rust/WASM) | Built + **deployed to Stellar testnet** · 18 passing tests |
| Backend API (Express + TypeScript) | Runs, file-persisted, wallet auth |
| Frontend (React + Vite) | Runs, wallet sessions, deposits/withdraws |

**Deployed vault contract (testnet):** `CDS4Z4MZMCZQXH43H6GJ2NSDTEZSEWS6QGL5A4KBEK2U4WMI4QHXGFC2`
**Network:** Stellar testnet (`Test SDF Network ; September 2015`)
**Explorer:** https://stellar.expert/explorer/testnet/contract/CDS4Z4MZMCZQXH43H6GJ2NSDTEZSEWS6QGL5A4KBEK2U4WMI4QHXGFC2

On-ledger transactions (all confirmed):

| Step | Tx hash |
|---|---|
| Upload WASM | `8f4ca7222c9583d0ef17ac5715ae4b994da1e4338e13b5c8dd0f438ef7015eee` |
| Create contract | `0726368037deb13e820ad49a09297a16d11c35ce773b4763d082695ebcb9487e` |
| Initialize | `f2339975613364ef23c2341f3bdc4ea8b7af02427d1f61070946baba7caa905d` |

Full record: [contracts/deploy/deployment.public.json](contracts/deploy/deployment.public.json).

**Proof it's live** — reading the contract back from testnet with `node contracts/deploy/verify.mjs` returns the initialized state:

```json
{
  "admin": "GBI5YWFSPPPTFEWERPK47DGGQVUJ3W4CJJNQEBW64DSOBSRS3KNUWT6N",
  "asset": "XLM",
  "total_shares": "0",
  "total_assets": "0",
  "deployed_assets": "0",
  "paused": false,
  "guardrails": {
    "max_drawdown_bps": 1000,
    "max_position_size_bps": 2500,
    "whitelisted_protocols": ["blend", "soroswap"],
    "emergency_stop": false
  },
  "next_position_id": "1"
}
```

---

## The wedge

Non-EVM smart-contract security is underserved and better-funded than the saturated EVM audit market. UmoyaPool is deliberately **Soroban-first**: the flagship on-chain artifact is a vault whose **risk limits live in the contract, not the frontend** — the exact posture the Stellar ecosystem's audit-readiness process rewards. The vault is also the reference target for a Soroban security scanner and a STRIDE threat model (next milestone).

---

## Architecture

```
┌────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│  Frontend  │ ──▶ │   Backend    │ ──▶ │  Soroban vault contract │
│ React/Vite │     │ Express/TS   │     │  (Rust/WASM, testnet)   │
└────────────┘     └──────────────┘     └─────────────────────────┘
   wallet            REST /api/*            ERC4626 shares +
   sessions          persisted state        on-chain guardrails
```

- **Vault engine** — ERC4626-style shares over a single asset. First deposit mints 1:1; later deposits mint at the live per-share price. Realized agent PnL moves the share *price*, not the count.
- **On-chain guardrails**, checked before capital leaves the vault: protocol whitelist, max position size (bps of TVL), max drawdown on close, emergency stop. Every privileged call uses `require_auth`; agents must be allowlisted and can only close their own positions.
- **Backend** mirrors the same domain model (vaults, agents, strategy marketplace, stokvel, x402-style payments) with file-persisted state and wallet-session JWT auth — structured so routes can call the on-chain contract next.
- **Frontend** — landing + Portfolio, Vaults (deposit/withdraw), Stokvel, Strategies, Agents. Connect a Stellar address to act as your own account.

---

## Run it (fresh clone)

```bash
# 1. Backend + frontend
npm run install:all
npm run dev            # backend :3000, frontend :5173  →  open http://localhost:5173

# 2. Contract tests (native Soroban test env — no wasm target needed)
cd contracts && cargo test          # 18 passing

# 3. Rebuild the deployable wasm
cargo build --release --target wasm32-unknown-unknown
# Lower to MVP encoding (Soroban's VM rejects the reference-types call_indirect
# that current Rust/LLVM emit by default):
wasm-opt target/wasm32-unknown-unknown/release/vault.wasm \
  --all-features --disable-gc --disable-reference-types -Oz \
  -o target/wasm32-unknown-unknown/release/vault.mvp.wasm

# 4. Re-deploy to testnet (funds a fresh keypair via friendbot)
cd deploy && node deploy.mjs ../target/wasm32-unknown-unknown/release/vault.mvp.wasm
node verify.mjs   # reads the deployed contract state back from chain
```

Dev API key: `umoyapool-dev-key` (see `backend/.env.example`). The backend seeds demo vaults/stokvels/agents on first run.

---

## Demo (5 minutes)

1. Open http://localhost:5173 → **Launch App**.
2. **Portfolio** — live TVL, deployed capital, average APY across seeded vaults.
3. **Connect Wallet** → *Use demo account* → your address appears; "My positions" populates.
4. **Vaults** → deposit into "Core XLM Yield"; shares mint at the live price. Withdraw part back — note only idle (non-deployed) liquidity is withdrawable.
5. **Agents** — the seeded agent is KYA-level 2 and allowlisted, the precondition for deploying vault capital.
6. **On-chain proof** — the same vault logic runs as the deployed testnet contract above; `cargo test` demonstrates each guardrail's reject path.

---

## Screenshots

Captured from the running app (`docs/screenshots/`):

| Page | File |
|---|---|
| Landing | [landing.png](docs/screenshots/landing.png) |
| Portfolio (TVL, deployed, APY, vault table) | [portfolio.png](docs/screenshots/portfolio.png) |
| Vaults (deposit / withdraw) | [vaults.png](docs/screenshots/vaults.png) |
| Stokvel (group savings) | [stokvel.png](docs/screenshots/stokvel.png) |
| Strategy marketplace | [strategies.png](docs/screenshots/strategies.png) |
| Agent registry (KYA levels) | [agents.png](docs/screenshots/agents.png) |

## Verification evidence

- **Contract, on-chain** — deployed to testnet; upload / create / initialize all confirmed (hashes above), and `verify.mjs` reads the initialized state back from the live contract.
- **Contract, tests** — `cargo test`: **18 passed** (4 share-math + 14 full-lifecycle/guardrail tests, each guardrail's reject path covered).
- **Backend** — challenge/response wallet auth verified end-to-end (good sig accepted; bad sig + replay rejected); file-persisted state survives restart.
- **Frontend** — production build clean; screenshots above captured live against the seeded backend.

## Deliberately out of scope for this cut

ZK prover, privacy pool, FHE strategy encryption, wiring backend routes to the on-chain contract, and additional contracts (stokvel, marketplace, agent-registry) which follow the `vault` pattern.
