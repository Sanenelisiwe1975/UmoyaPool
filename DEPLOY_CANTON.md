# Deploying UmoyaPool to Canton Devnet (via Seaport)

The hackathon requires **Daml contracts live on Canton Devnet** (not LocalNet/
sandbox). The supported path for participants is **Seaport**, which builds and
deploys to a shared, pre-configured Devnet validator. No node to run yourself.

Key URLs:
- DevNet wallet: **https://devnet.cantonloop.com**
- Seaport app: **https://app.devnet.seaport.to**
- Seaport docs: https://devnet.seaport.to/ · guide: https://github.com/Jatinp26/Seaport-Guide

---

## Step 1 — Get your Devnet wallet + Party ID  (this is your "address")

1. Go to **https://devnet.cantonloop.com** and create a DevNet wallet.
2. Copy your **Party ID** from the wallet profile. It looks like:
   `umoyapool-abc123::1220f9a3...` — a `<hint>::<fingerprint>` string.

> This Party ID **is** the "Canton devnet address" the CC faucet asks for.
> **Do NOT use MetaMask or Phantom** — those are Ethereum/Solana and are not
> valid on Canton. Paste your **Party ID** into the faucet to receive CC.

## Step 2 — Fund it with CC

Paste your **Party ID** into the CC faucet and request CC. You'll need a little
CC to pay for Devnet transactions. Confirm the balance shows in your Loop wallet.

## Step 3 — Log into Seaport

Open **https://app.devnet.seaport.to** and sign in with your Loop DevNet wallet.
Your org's shared **`5n sandbox`** Devnet validator is set up automatically and
appears in the Validator dropdown the first time you deploy. (If your Party ID
needs to be added to the team org, an organizer does that — ask in #canton.)

## Step 4 — Get this project into Seaport

Two options — the first needs no GitHub:

**A. In-browser editor (recommended, no push needed).**
Create a new blank Daml project in Seaport and recreate these files (copy each
verbatim from this repo):
- `daml.yaml`
- `daml/UmoyaPool/Types.daml`
- `daml/UmoyaPool/Vault.daml`
- `daml/UmoyaPool/Stokvel.daml`
- `daml/UmoyaPool/Setup.daml`

**B. Connect GitHub.** If you push this repo to GitHub, click **Connect GitHub**
on the Seaport dashboard and import the repo/branch. (The hackathon also requires
a public repo for the final submission, so you'll do this eventually anyway.)

## Step 5 — Build

Click **Build Project** in Seaport's top bar. The output panel shows progress and
the resulting `.dar` on success. Fix any compile errors it reports (the contracts
were written to compile clean; if the SDK version differs, adjust `sdk-version`
in `daml.yaml` to match Seaport's).

## Step 6 — Deploy to Devnet

1. Click **Deploy**.
2. Select the built `.dar`.
3. Choose **`5n sandbox`** from the validator dropdown.
4. Confirm. Your `UmoyaPool` templates are now on Canton Devnet.

## Step 7 — Put contracts on-ledger + capture proof

Run the init script so there are live contracts to show (either via Seaport's
script runner if available, or `daml script` against the validator's Ledger API):

```
--script-name UmoyaPool.Setup:initialize
```

Capture for the submission: the **validator/participant**, your **Party ID**, and
a **contract id** (e.g. the `Vault`) with `totalAssets`/`totalShares` — that's the
"live on Devnet" evidence judges want. Screenshot the wallet + Seaport deploy
success + a contract query.

---

## Verify locally first (optional but recommended)

If you have the Daml SDK + JDK locally, prove the flow before Seaport:

```bash
daml start   # build + sandbox + Navigator + run Setup:initialize
# In Navigator (http://localhost:7500), switch to party Alice: you see your
# MemberPosition but NOT Bob's — the privacy guarantee, on screen.
```

> Local is confidence only. The submission must be **built and deployed through
> Seaport onto the `5n sandbox` Devnet validator**, with contracts on-ledger.
