# UmoyaPool — pitch deck outline (Canton hackathon)

Track: **Private DeFi & Capital Markets** (also touches Agentic Commerce). Use this
as the script for the slides and the 3-minute video. One idea per slide.

---

**Slide 1 — Title.**
UmoyaPool — *private group savings & agent-managed yield on Canton.*
"Umoya" = spirit/air (isiZulu). Built for African markets and institutions alike.

**Slide 2 — The problem.**
Stokvels (rotating group savings) move billions across Africa — informally, on
trust and spreadsheets. DeFi could formalize them, but public chains **leak every
balance and position**. No institution or family group wants their savings and
counterparties on a public ledger.

**Slide 3 — The insight.**
Privacy isn't a feature you bolt on — on Canton it's the ledger model. Make each
member's stake a contract *signed by only that member and the operator*. Others
see the pool; no one sees each other.

**Slide 4 — What we built.**
- Private **yield vault**: ERC4626-style shares, guardrails enforced on-ledger.
- Private **stokvel**: group savings with **M-of-N** payout approval.
- **Agent-managed capital**: KYA-authorized agents deploy within drawdown /
  position-size / whitelist limits — agentic commerce, safely.
All in Daml, live on Canton Devnet.

**Slide 5 — Privacy, shown.**
Navigator screenshot: as **Alice** you see your position; **Bob's is invisible**.
Same ledger, different projections. That's the whole pitch in one image.

**Slide 6 — Guardrails on-ledger.**
Deploying capital checks whitelist + position cap; closing checks the drawdown
floor — inside the Daml choice, before state changes. Institutional risk posture,
not frontend theatre.

**Slide 7 — Live on Devnet.**
Participant id, party ids, a `Vault` contract id, `totalAssets` read back from the
ledger. Proof it runs on-ledger, not in a sandbox.

**Slide 8 — Why it matters / who uses it.**
Savings groups, community lenders, and treasurers who need pooled capital with
per-member confidentiality and auditable, atomic settlement. Real users, real
money, real privacy.

**Slide 9 — Roadmap.**
Tokenized-deposit settlement asset, member-facing wallet UI over the JSON Ledger
API, agent marketplace, external audit.

**Slide 10 — Ask / close.**
One line: *UmoyaPool brings the trust of the stokvel on-chain — without putting
anyone's money on display.*

---

## 3-minute video beats
0:00 hook — the stokvel problem + privacy leak. 0:30 the Canton insight. 1:00 live
demo: deposit as Alice, show Bob can't see it in Navigator. 1:45 agent deploys
within guardrails; stokvel M-of-N payout. 2:30 show it live on Devnet (console
query). 2:50 close line.

## Submission checklist (hackathon requirements)
- [ ] Public repository (this repo)
- [ ] Presentation deck (from this outline)
- [ ] 3-minute video pitch w/ demo
- [ ] Link to live product
- [ ] **Deployed live on Canton Devnet** — DAR uploaded + `Setup:initialize` run
      against the Devnet participant (see DEPLOY_CANTON.md); capture ids as proof
