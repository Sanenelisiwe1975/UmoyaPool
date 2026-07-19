use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// `initialize` called on an already-initialized instance.
    AlreadyInitialized = 1,
    /// A getter/mutator ran before `initialize`.
    NotInitialized = 2,
    /// Caller is not the admin for an admin-only entrypoint.
    NotAuthorized = 3,
    /// A deposit/withdraw/deploy amount was zero or negative.
    InvalidAmount = 4,
    /// Share balance (or pool) too small for the requested withdrawal.
    InsufficientShares = 5,
    /// Idle liquidity too small: capital is deployed in positions.
    InsufficientLiquidity = 6,
    /// Vault is paused or in emergency stop.
    VaultHalted = 7,
    /// Protocol is not on the guardrail whitelist.
    ProtocolNotWhitelisted = 8,
    /// Deployment would exceed the max-position-size guardrail.
    PositionTooLarge = 9,
    /// Close return is below the max-drawdown floor.
    DrawdownExceeded = 10,
    /// Referenced position id does not exist.
    PositionNotFound = 11,
    /// Position already closed.
    PositionClosed = 12,
    /// Arithmetic overflowed (defensive; should be unreachable).
    MathOverflow = 13,
}
