#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    Address, Env, String, Vec,
};

use crate::error::Error;
use crate::types::StrategyKind;
use crate::{VaultContract, VaultContractClient};

struct Setup {
    env: Env,
    client: VaultContractClient<'static>,
    admin: Address,
}

// All host objects (String, Vec, Address) must be created in the SAME Env that
// registers the contract — passing an object built in another Env across the
// boundary yields a "mis-tagged object reference" host error.
fn setup_with(max_drawdown_bps: u32, protocol_names: &[&str], max_position_bps: u32) -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let asset = String::from_str(&env, "XLM");

    let mut protocols = Vec::new(&env);
    for name in protocol_names {
        protocols.push_back(String::from_str(&env, name));
    }

    client.initialize(&admin, &asset, &max_drawdown_bps, &protocols, &max_position_bps);
    Setup { env, client, admin }
}

fn basic() -> Setup {
    setup_with(2_000, &[], 0) // empty whitelist = allow any protocol
}

#[test]
fn initialize_sets_state() {
    let s = basic();
    let vault = s.client.get_vault();
    assert_eq!(vault.admin, s.admin);
    assert_eq!(vault.total_shares, 0);
    assert_eq!(vault.next_position_id, 1);
}

#[test]
fn cannot_initialize_twice() {
    let s = basic();
    let asset = String::from_str(&s.env, "XLM");
    let empty = Vec::<String>::new(&s.env);
    let err = s
        .client
        .try_initialize(&s.admin, &asset, &2_000, &empty, &0)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::AlreadyInitialized);
}

#[test]
fn first_deposit_mints_one_to_one() {
    let s = basic();
    let alice = Address::generate(&s.env);
    let minted = s.client.deposit(&alice, &1_000);
    assert_eq!(minted, 1_000);
    assert_eq!(s.client.shares_of(&alice), 1_000);
    assert_eq!(s.client.get_vault().total_assets, 1_000);
}

#[test]
fn second_depositor_shares_track_price() {
    let s = basic();
    let alice = Address::generate(&s.env);
    let bob = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    // Simulate yield: an agent deploys then returns a profit, lifting share price.
    let agent = Address::generate(&s.env);
    s.client.set_agent(&agent, &true);
    let pid = s.client.open_position(&agent, &String::from_str(&s.env, "blend"), &1_000, &StrategyKind::Lending);
    s.client.close_position(&agent, &pid, &2_000); // 1000 -> 2000, pool now 2000 assets / 1000 shares
    // Bob deposits 1000 at 2:1 price -> 500 shares.
    let minted = s.client.deposit(&bob, &1_000);
    assert_eq!(minted, 500);
}

#[test]
fn withdraw_returns_assets_and_burns_shares() {
    let s = basic();
    let alice = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    let assets = s.client.withdraw(&alice, &400);
    assert_eq!(assets, 400);
    assert_eq!(s.client.shares_of(&alice), 600);
}

#[test]
fn cannot_withdraw_more_than_owned() {
    let s = basic();
    let alice = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    let err = s.client.try_withdraw(&alice, &1_001).err().unwrap().unwrap();
    assert_eq!(err, Error::InsufficientShares);
}

#[test]
fn cannot_withdraw_deployed_liquidity() {
    let s = basic();
    let alice = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    let agent = Address::generate(&s.env);
    s.client.set_agent(&agent, &true);
    s.client.open_position(&agent, &String::from_str(&s.env, "blend"), &900, &StrategyKind::Lending);
    // Only 100 idle; withdrawing 500 assets worth of shares must fail.
    let err = s.client.try_withdraw(&alice, &500).err().unwrap().unwrap();
    assert_eq!(err, Error::InsufficientLiquidity);
}

#[test]
fn non_allowlisted_agent_cannot_deploy() {
    let s = basic();
    let alice = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    let agent = Address::generate(&s.env);
    let err = s
        .client
        .try_open_position(&agent, &String::from_str(&s.env, "blend"), &100, &StrategyKind::Lending)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::NotAuthorized);
}

#[test]
fn protocol_whitelist_is_enforced() {
    let s = setup_with(2_000, &["blend"], 0);
    let alice = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    let agent = Address::generate(&s.env);
    s.client.set_agent(&agent, &true);
    // Allowed protocol works.
    s.client.open_position(&agent, &String::from_str(&s.env, "blend"), &100, &StrategyKind::Lending);
    // Off-list protocol is rejected.
    let err = s
        .client
        .try_open_position(&agent, &String::from_str(&s.env, "sketchy"), &100, &StrategyKind::Lending)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::ProtocolNotWhitelisted);
}

#[test]
fn position_size_cap_is_enforced() {
    let s = setup_with(2_000, &[], 2_500); // 25% cap
    let alice = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    let agent = Address::generate(&s.env);
    s.client.set_agent(&agent, &true);
    // 250 is exactly 25% — allowed.
    s.client.open_position(&agent, &String::from_str(&s.env, "blend"), &250, &StrategyKind::Lending);
    // 251 would exceed the cap.
    let err = s
        .client
        .try_open_position(&agent, &String::from_str(&s.env, "blend"), &251, &StrategyKind::Lending)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::PositionTooLarge);
}

#[test]
fn drawdown_guardrail_blocks_big_loss() {
    let s = basic(); // 20% max drawdown
    let alice = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    let agent = Address::generate(&s.env);
    s.client.set_agent(&agent, &true);
    let pid = s.client.open_position(&agent, &String::from_str(&s.env, "blend"), &1_000, &StrategyKind::Lending);
    // Returning 799 on a 1000 entry is a 20.1% loss — blocked.
    let err = s.client.try_close_position(&agent, &pid, &799).err().unwrap().unwrap();
    assert_eq!(err, Error::DrawdownExceeded);
    // 800 (exactly 20% loss) is allowed.
    s.client.close_position(&agent, &pid, &800);
    assert_eq!(s.client.get_vault().total_assets, 800);
}

#[test]
fn emergency_stop_halts_deposits() {
    let s = basic();
    s.client.set_emergency_stop(&true);
    let alice = Address::generate(&s.env);
    let err = s.client.try_deposit(&alice, &1_000).err().unwrap().unwrap();
    assert_eq!(err, Error::VaultHalted);
}

#[test]
fn only_owning_agent_can_close() {
    let s = basic();
    let alice = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    let agent = Address::generate(&s.env);
    let other = Address::generate(&s.env);
    s.client.set_agent(&agent, &true);
    s.client.set_agent(&other, &true);
    let pid = s.client.open_position(&agent, &String::from_str(&s.env, "blend"), &500, &StrategyKind::Lending);
    let err = s.client.try_close_position(&other, &pid, &500).err().unwrap().unwrap();
    assert_eq!(err, Error::NotAuthorized);
}

#[test]
fn assets_of_reflects_share_price() {
    let s = basic();
    let alice = Address::generate(&s.env);
    s.client.deposit(&alice, &1_000);
    assert_eq!(s.client.assets_of(&alice), 1_000);
    // Realize a profit and re-check.
    let agent = Address::generate(&s.env);
    s.client.set_agent(&agent, &true);
    let pid = s.client.open_position(&agent, &String::from_str(&s.env, "blend"), &1_000, &StrategyKind::Lending);
    s.client.close_position(&agent, &pid, &1_500);
    assert_eq!(s.client.assets_of(&alice), 1_500);
}
