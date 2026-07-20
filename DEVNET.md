# UmoyaPool — Canton Devnet record

Fill this in as you deploy; it's the "live on Devnet" evidence for the submission.

## Identity

- **DevNet wallet:** https://devnet.cantonloop.com
- **Party ID (operator / owner):**
  `85e6b495032bec7731de7412c4ea467e::122029fbbc1d1491e83986a52934f74e54c6ff4808823e280739107ef977193d2587`
  *(This is also the address used for the CC faucet. Public identifier — safe to share.)*
- **CC funded:** ☐ (paste faucet tx / balance screenshot)

## Deployment (via Seaport → `5n sandbox` validator)

- **Seaport app:** https://app.devnet.seaport.to
- **Validator:** `5n sandbox` (shared, pre-configured)
- **DAR built:** ☐  (name + build timestamp)
- **Deployed:** ☐  (deploy success screenshot)
- **Package ID / DAR hash:** _______________________________________________

## On-ledger proof (for judges)

- **Vault contract id:** ___________________________________________________
- **`totalAssets` / `totalShares` read back:** ____________________________
- **Screenshots:** wallet balance · Seaport deploy success · contract query

## Notes

- The `Setup.daml` script allocates demo parties (Operator/Alice/Bob/Agent) on
  the participant. If the sandbox validator blocks `allocateParty` via script,
  use your wallet Party ID above as the operator and pre-allocated demo parties.
