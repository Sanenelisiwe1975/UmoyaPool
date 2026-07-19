# Deploying UmoyaPool to Canton Devnet

The hackathon requires **Daml contracts live on Canton Devnet** (LocalNet/sandbox
does not qualify). This guide is the exact path from source to on-ledger.

## 0. Prerequisites

- **JDK 17+** (`java -version`).
- **Daml SDK** matching `sdk-version` in `daml.yaml` (`daml version`).
  Install: `curl -sSL https://get.daml.com/ | sh -s 2.9.5` (macOS/Linux) or the
  Windows installer from the Daml releases page.
- **A Canton Devnet participant/validator you can reach** — this is the gating
  requirement. Get one of:
  - the hackathon's provided **Devnet validator** (see the workshop recordings /
    #canton Discord), or
  - your own **validator node** onboarded to the Devnet Global Synchronizer, or
  - a **Seaport**-provisioned participant (fine to build with — but you must
    still upload the DAR to the **Devnet** validator, not LocalNet).

  You need three things from it: the **Ledger API host:port**, an **access
  token** (JWT) if auth is enabled, and permission to **allocate parties**.

## 1. Build the DAR

```bash
daml build
# → .daml/dist/umoyapool-0.1.0.dar
```

## 2. Point at your Devnet participant

Export the connection details from your validator:

```bash
export LEDGER_HOST=<devnet-participant-host>
export LEDGER_PORT=<ledger-api-port>        # commonly 6865
export TOKEN_FILE=./devnet-token.jwt         # if the participant requires auth
```

## 3. Upload the DAR to Devnet

```bash
daml ledger upload-dar \
  --host $LEDGER_HOST --port $LEDGER_PORT \
  --access-token-file $TOKEN_FILE \
  .daml/dist/umoyapool-0.1.0.dar
```

(Equivalently, from the Canton console: `participant.dars.upload(".daml/dist/umoyapool-0.1.0.dar")`.)

## 4. Allocate parties (once)

Either via the Canton console:

```scala
val operator = participant.parties.enable("Operator")
val alice    = participant.parties.enable("Alice")
val bob      = participant.parties.enable("Bob")
val agent    = participant.parties.enable("Agent")
```

…or let the init script allocate them (step 5) if your participant permits it.

## 5. Run the init script on Devnet

```bash
daml script \
  --dar .daml/dist/umoyapool-0.1.0.dar \
  --script-name UmoyaPool.Setup:initialize \
  --ledger-host $LEDGER_HOST --ledger-port $LEDGER_PORT \
  --access-token-file $TOKEN_FILE
```

This creates the vault, two private member positions, an authorized agent, a
deployed-then-closed position (profit lifts the share price), and a stokvel with
an M-of-N payout — all on-ledger.

## 6. Verify it's live

- **Canton console:** `participant.ledger_api.acs.of_all()` — you should see
  `Vault`, `MemberPosition`, `Stokvel`, etc.
- **JSON API / Navigator:** query the `UmoyaPool.Vault:Vault` contract and read
  `totalAssets` / `totalShares`.
- Record the **participant id / party ids / a contract id** for the submission —
  that is the "live on Devnet" evidence judges want.

## Local dry run first (recommended)

Before touching Devnet, prove the whole flow locally:

```bash
daml start          # compiles, starts sandbox + Navigator, runs Setup:initialize
# open Navigator (http://localhost:7500) and step through as each party to see
# that members CANNOT see each other's MemberPosition — the privacy story.
```

> Local is for confidence only. The submission must be uploaded and initialized
> against the **Devnet** participant (steps 3–6).
