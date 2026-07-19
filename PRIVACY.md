# Privacy proof

The core claim of UmoyaPool on Canton: **on one shared ledger, no member can see
another member's balance.** This is proven programmatically, not asserted in
marketing.

## How it's enforced

`MemberPosition` (and `MemberStake`) are signed by the **operator and one member
only**:

```daml
template MemberPosition
  with operator : Party; vaultId : Text; member : Party; shares : Int; costBasis : Int
  where
    signatory operator, member   -- visible to exactly these two parties
```

On Canton, a contract is visible only to its stakeholders. So a member's shares
and cost basis are visible to that member and the operator — and to no one else.
There is no frontend hiding data; the ledger itself withholds it.

## The proof (`daml/UmoyaPool/PrivacyDemo.daml`)

After Alice deposits 1000 and Bob deposits 500 into the same vault, the script
**queries the ledger as each party** and asserts the visibility boundary:

```daml
aliceView <- query @MemberPosition alice   -- what Alice can see
bobView   <- query @MemberPosition bob     -- what Bob can see

assertMsg "Alice sees exactly her own position" (aliceMembers == [alice])
assertMsg "Bob sees exactly his own position"   (bobMembers == [bob])
assertMsg "Bob CANNOT see Alice's position"     (notElem alice bobMembers)
assertMsg "Alice CANNOT see Bob's position"     (notElem bob aliceMembers)
```

`query` returns only contracts the querying party is a stakeholder of, so Bob's
query **physically cannot** return Alice's `MemberPosition`.

## Result

```
$ daml test --files daml/UmoyaPool/PrivacyDemo.daml
daml/UmoyaPool/PrivacyDemo.daml:privacyDemo: ok, 3 active contracts, 5 transactions.
```

`ok` means **all four assertions held**. Had privacy leaked — had Bob's query
returned Alice's position — the script would have failed on the third assertion.

> For a live visual on Devnet: open the contract in Seaport/Navigator as Alice
> (her `MemberPosition` is present) and again as Bob (Alice's is absent). Same
> ledger, two different projections — that is the whole pitch, on screen.
