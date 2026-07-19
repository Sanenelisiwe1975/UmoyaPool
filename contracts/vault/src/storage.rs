use soroban_sdk::{Address, Env};

use crate::error::Error;
use crate::types::{DataKey, Position, VaultData};

// TTL policy: the vault instance and its ledgers are bumped on access so an
// active vault never expires out from under its depositors. Values are in
// ledgers (~5s each on Stellar); ~30 days extended when under ~15 days left.
const BUMP_THRESHOLD: u32 = 15 * 24 * 60 * 60 / 5;
const BUMP_EXTEND: u32 = 30 * 24 * 60 * 60 / 5;

pub fn has_vault(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Vault)
}

pub fn load_vault(env: &Env) -> Result<VaultData, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Vault)
        .ok_or(Error::NotInitialized)
}

pub fn save_vault(env: &Env, vault: &VaultData) {
    env.storage().instance().set(&DataKey::Vault, vault);
    env.storage().instance().extend_ttl(BUMP_THRESHOLD, BUMP_EXTEND);
}

pub fn get_shares(env: &Env, owner: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Shares(owner.clone()))
        .unwrap_or(0)
}

pub fn set_shares(env: &Env, owner: &Address, shares: i128) {
    let key = DataKey::Shares(owner.clone());
    if shares == 0 {
        env.storage().persistent().remove(&key);
    } else {
        env.storage().persistent().set(&key, &shares);
        env.storage().persistent().extend_ttl(&key, BUMP_THRESHOLD, BUMP_EXTEND);
    }
}

pub fn get_position(env: &Env, id: u64) -> Result<Position, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Position(id))
        .ok_or(Error::PositionNotFound)
}

pub fn save_position(env: &Env, position: &Position) {
    let key = DataKey::Position(position.id);
    env.storage().persistent().set(&key, position);
    env.storage().persistent().extend_ttl(&key, BUMP_THRESHOLD, BUMP_EXTEND);
}

pub fn is_agent_allowlisted(env: &Env, agent: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Agent(agent.clone()))
        .unwrap_or(false)
}

pub fn set_agent_allowlisted(env: &Env, agent: &Address, allowed: bool) {
    let key = DataKey::Agent(agent.clone());
    if allowed {
        env.storage().persistent().set(&key, &true);
        env.storage().persistent().extend_ttl(&key, BUMP_THRESHOLD, BUMP_EXTEND);
    } else {
        env.storage().persistent().remove(&key);
    }
}
