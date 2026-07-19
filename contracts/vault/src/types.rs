use soroban_sdk::{contracttype, Address, String, Vec};

/// On-chain risk limits enforced before agent capital leaves the vault.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Guardrails {
    /// Max loss tolerated on a position close, in basis points (2000 = 20%).
    pub max_drawdown_bps: u32,
    /// Whitelisted protocol identifiers; empty means "allow any".
    pub whitelisted_protocols: Vec<String>,
    /// Cap on a single position as bps of total assets; 0 means "unlimited".
    pub max_position_size_bps: u32,
    /// Halts deposits and deployments; withdrawals of idle funds still allowed.
    pub emergency_stop: bool,
}

/// Immutable-ish vault configuration and running totals.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultData {
    pub admin: Address,
    pub asset: String,
    pub total_shares: i128,
    pub total_assets: i128,
    pub deployed_assets: i128,
    pub paused: bool,
    pub guardrails: Guardrails,
    pub next_position_id: u64,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum StrategyKind {
    Lending,
    Liquidity,
    Staking,
    Arbitrage,
    Other,
}

/// A tranche of capital an authorized agent has deployed into a protocol.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Position {
    pub id: u64,
    pub agent: Address,
    pub protocol: String,
    pub entry_value: i128,
    pub strategy: StrategyKind,
    pub opened_at: u64,
    pub is_open: bool,
}

/// Storage keys. Positions are keyed by id; the depositor ledger is keyed by
/// address so share balances persist independently of the aggregate totals.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Vault,
    Shares(Address),
    Position(u64),
    Agent(Address),
}
