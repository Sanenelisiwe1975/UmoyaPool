# UmoyaPool — Canton

**Private group savings & agent-managed yield, where who-sees-what is enforced by the ledger.** *(Umoya — isiZulu/isiXhosa for "spirit / breath / air".)*

Built for the **Private DeFi** track: confidential DeFi for real users and institutions. On a public chain every balance and position leaks. On Canton, UmoyaPool makes each member's stake a contract private to that member and the pool operator — other members see the pool, never each other.

## Why Canton

- **Per-member privacy is structural.** `MemberPosition` and `MemberStake` are signed by the operator and one member only, so balances and cost bases are confidential *by construction* — not by hiding them in a frontend.
- **Multi-party workflows settle atomically.** Deposits, agent capital deployment, and M-of-N stokvel payouts are single Daml transactions with explicit signatory/observer authorization.
- **Guardrails on-ledger.** Protocol whitelist, position-size cap, and drawdown floor are enforced inside choice bodies before capital moves — the same risk posture institutions require.

## What's on-ledger

| Template | Privacy | Purpose |
|---|---|---|
| `Vault` | operator signs; members observe | Shared yield pool + guardrails |
| `MemberPosition` | operator + member only | A member's private shares/cost basis |
| `AgentRight` | operator + agent | KYA authorization to deploy capital |
| `DeployedPosition` | operator + agent | Capital deployed into a protocol |
| `Stokvel` | operator signs; members observe | Group savings pool |
| `MemberStake` | operator + member only | A member's private contribution |
| `PayoutProposal` / `Approval` | members observe; each approval member-signed | M-of-N payout voting |

Deposits, withdrawals, deployment, and contributions use a **request → operator-accept** pattern so each transaction carries exactly the authority it needs to mint jointly-signed, privacy-scoped contracts.

## Build & run locally

```bash
daml start     # build + sandbox + Navigator + run UmoyaPool.Setup:initialize
```

Open Navigator (http://localhost:7500) and switch parties: as **Alice** you see
your own `MemberPosition` but **not Bob's** — the privacy guarantee, visible.

## Deploy to Canton Devnet

See **[DEPLOY_CANTON.md](DEPLOY_CANTON.md)**. Short version: `daml build`, upload
the DAR to your Devnet participant, allocate parties, run `UmoyaPool.Setup:initialize`
against Devnet, verify in the Canton console.

## Layout

```
daml/UmoyaPool/
  Types.daml     -- guardrails, share math (pure)
  Vault.daml     -- Vault, MemberPosition, Agent rights, deploy/close, deposit/withdraw
  Stokvel.daml   -- group savings + M-of-N payout approval
  Setup.daml     -- Daml Script: allocate parties + seed a full lifecycle
```
