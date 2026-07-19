#![no_std]

//! # UmoyaPool — shared yield engine
//!
//! An ERC4626-style single-asset vault with on-chain risk guardrails. Depositors
//! receive shares proportional to the pool; allowlisted agents deploy idle
//! capital into whitelisted protocols within per-position and drawdown limits.
//!
//! Trust model:
//! - `admin` (set at init) controls guardrails, agent allowlisting, pause, and
//!   emergency stop. Admin auth is required on every privileged entrypoint.
//! - `agent` addresses must be allowlisted by admin before deploying capital,
//!   and must authorize their own open/close calls.
//! - depositors authorize their own deposits/withdrawals; shares are per-address.
//!
//! Amounts are `i128` in the asset's smallest unit. This contract manages the
//! accounting; actual token transfers are handled by the caller/host in this
//! cut (a `token::Client` transfer wires in without changing the share math).

mod error;
mod shares;
mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

use error::Error;
use types::{Guardrails, Position, StrategyKind, VaultData};

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    /// Initializes the vault. Callable exactly once.
    pub fn initialize(
        env: Env,
        admin: Address,
        asset: String,
        max_drawdown_bps: u32,
        whitelisted_protocols: Vec<String>,
        max_position_size_bps: u32,
    ) -> Result<(), Error> {
        if storage::has_vault(&env) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        if max_drawdown_bps > 10_000 || max_position_size_bps > 10_000 {
            return Err(Error::InvalidAmount);
        }
        let vault = VaultData {
            admin,
            asset,
            total_shares: 0,
            total_assets: 0,
            deployed_assets: 0,
            paused: false,
            guardrails: Guardrails {
                max_drawdown_bps,
                whitelisted_protocols,
                max_position_size_bps,
                emergency_stop: false,
            },
            next_position_id: 1,
        };
        storage::save_vault(&env, &vault);
        Ok(())
    }

    /// Deposits `assets`, mints and credits shares to `from`. Requires `from` auth.
    pub fn deposit(env: Env, from: Address, assets: i128) -> Result<i128, Error> {
        from.require_auth();
        if assets <= 0 {
            return Err(Error::InvalidAmount);
        }
        let mut vault = storage::load_vault(&env)?;
        Self::assert_active(&vault)?;

        let minted = shares::shares_for_assets(assets, vault.total_shares, vault.total_assets)?;
        vault.total_shares = vault
            .total_shares
            .checked_add(minted)
            .ok_or(Error::MathOverflow)?;
        vault.total_assets = vault
            .total_assets
            .checked_add(assets)
            .ok_or(Error::MathOverflow)?;

        let balance = storage::get_shares(&env, &from)
            .checked_add(minted)
            .ok_or(Error::MathOverflow)?;
        storage::set_shares(&env, &from, balance);
        storage::save_vault(&env, &vault);

        env.events()
            .publish((soroban_sdk::symbol_short!("deposit"), from), (assets, minted));
        Ok(minted)
    }

    /// Burns `shares` from `owner` and returns the underlying assets. Requires
    /// `owner` auth. Only idle (non-deployed) liquidity can be withdrawn.
    pub fn withdraw(env: Env, owner: Address, shares_to_burn: i128) -> Result<i128, Error> {
        owner.require_auth();
        if shares_to_burn <= 0 {
            return Err(Error::InvalidAmount);
        }
        let mut vault = storage::load_vault(&env)?;
        if vault.guardrails.emergency_stop {
            return Err(Error::VaultHalted);
        }

        let balance = storage::get_shares(&env, &owner);
        if shares_to_burn > balance {
            return Err(Error::InsufficientShares);
        }

        let assets = shares::assets_for_shares(shares_to_burn, vault.total_shares, vault.total_assets)?;
        let idle = vault
            .total_assets
            .checked_sub(vault.deployed_assets)
            .ok_or(Error::MathOverflow)?;
        if assets > idle {
            return Err(Error::InsufficientLiquidity);
        }

        vault.total_shares -= shares_to_burn;
        vault.total_assets -= assets;
        storage::set_shares(&env, &owner, balance - shares_to_burn);
        storage::save_vault(&env, &vault);

        env.events()
            .publish((soroban_sdk::symbol_short!("withdraw"), owner), (assets, shares_to_burn));
        Ok(assets)
    }

    /// Admin: allow or revoke an agent's ability to deploy capital.
    pub fn set_agent(env: Env, agent: Address, allowed: bool) -> Result<(), Error> {
        let vault = storage::load_vault(&env)?;
        vault.admin.require_auth();
        storage::set_agent_allowlisted(&env, &agent, allowed);
        Ok(())
    }

    /// Allowlisted agent: deploy `amount` of idle capital into `protocol`,
    /// subject to whitelist and position-size guardrails. Returns the position id.
    pub fn open_position(
        env: Env,
        agent: Address,
        protocol: String,
        amount: i128,
        strategy: StrategyKind,
    ) -> Result<u64, Error> {
        agent.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if !storage::is_agent_allowlisted(&env, &agent) {
            return Err(Error::NotAuthorized);
        }

        let mut vault = storage::load_vault(&env)?;
        Self::assert_active(&vault)?;
        Self::assert_whitelisted(&vault, &protocol)?;
        if !shares::within_position_cap(amount, vault.total_assets, vault.guardrails.max_position_size_bps)? {
            return Err(Error::PositionTooLarge);
        }

        let idle = vault
            .total_assets
            .checked_sub(vault.deployed_assets)
            .ok_or(Error::MathOverflow)?;
        if amount > idle {
            return Err(Error::InsufficientLiquidity);
        }

        let id = vault.next_position_id;
        let position = Position {
            id,
            agent: agent.clone(),
            protocol,
            entry_value: amount,
            strategy,
            opened_at: env.ledger().timestamp(),
            is_open: true,
        };
        vault.deployed_assets += amount;
        vault.next_position_id += 1;
        storage::save_position(&env, &position);
        storage::save_vault(&env, &vault);

        env.events()
            .publish((soroban_sdk::symbol_short!("pos_open"), agent), (id, amount));
        Ok(id)
    }

    /// Allowlisted agent: close a position, realizing `return_amount` back into
    /// the pool. Rejected if the loss breaches the drawdown guardrail.
    pub fn close_position(env: Env, agent: Address, position_id: u64, return_amount: i128) -> Result<(), Error> {
        agent.require_auth();
        if return_amount < 0 {
            return Err(Error::InvalidAmount);
        }
        let mut position = storage::get_position(&env, position_id)?;
        if !position.is_open {
            return Err(Error::PositionClosed);
        }
        if position.agent != agent {
            return Err(Error::NotAuthorized);
        }

        let mut vault = storage::load_vault(&env)?;
        if !shares::within_drawdown(return_amount, position.entry_value, vault.guardrails.max_drawdown_bps)? {
            return Err(Error::DrawdownExceeded);
        }

        // Release the entry value from deployment, then apply realized PnL to the
        // pool. Shares are unchanged, so profit/loss moves the per-share price.
        vault.deployed_assets = vault
            .deployed_assets
            .checked_sub(position.entry_value)
            .ok_or(Error::MathOverflow)?;
        vault.total_assets = vault
            .total_assets
            .checked_sub(position.entry_value)
            .and_then(|n| n.checked_add(return_amount))
            .ok_or(Error::MathOverflow)?;

        position.is_open = false;
        storage::save_position(&env, &position);
        storage::save_vault(&env, &vault);

        env.events()
            .publish((soroban_sdk::symbol_short!("pos_close"), agent), (position_id, return_amount));
        Ok(())
    }

    /// Admin: set or lift the emergency stop (also pauses new deposits/deploys).
    pub fn set_emergency_stop(env: Env, stop: bool) -> Result<(), Error> {
        let mut vault = storage::load_vault(&env)?;
        vault.admin.require_auth();
        vault.guardrails.emergency_stop = stop;
        vault.paused = stop;
        storage::save_vault(&env, &vault);
        Ok(())
    }

    /// Admin: update mutable guardrail parameters.
    pub fn set_guardrails(env: Env, max_drawdown_bps: u32, max_position_size_bps: u32) -> Result<(), Error> {
        if max_drawdown_bps > 10_000 || max_position_size_bps > 10_000 {
            return Err(Error::InvalidAmount);
        }
        let mut vault = storage::load_vault(&env)?;
        vault.admin.require_auth();
        vault.guardrails.max_drawdown_bps = max_drawdown_bps;
        vault.guardrails.max_position_size_bps = max_position_size_bps;
        storage::save_vault(&env, &vault);
        Ok(())
    }

    // ── Views ──────────────────────────────────────────────────────────────

    pub fn get_vault(env: Env) -> Result<VaultData, Error> {
        storage::load_vault(&env)
    }

    pub fn shares_of(env: Env, owner: Address) -> i128 {
        storage::get_shares(&env, &owner)
    }

    pub fn get_position(env: Env, id: u64) -> Result<Position, Error> {
        storage::get_position(&env, id)
    }

    /// Assets currently claimable per the caller's shares, at the live pool price.
    pub fn assets_of(env: Env, owner: Address) -> Result<i128, Error> {
        let vault = storage::load_vault(&env)?;
        let shares = storage::get_shares(&env, &owner);
        shares::assets_for_shares(shares, vault.total_shares, vault.total_assets)
    }

    // ── Internal guards ────────────────────────────────────────────────────

    fn assert_active(vault: &VaultData) -> Result<(), Error> {
        if vault.paused || vault.guardrails.emergency_stop {
            return Err(Error::VaultHalted);
        }
        Ok(())
    }

    fn assert_whitelisted(vault: &VaultData, protocol: &String) -> Result<(), Error> {
        let list = &vault.guardrails.whitelisted_protocols;
        if list.is_empty() || list.iter().any(|p| &p == protocol) {
            return Ok(());
        }
        Err(Error::ProtocolNotWhitelisted)
    }
}
