use crate::error::Error;

const BPS_DENOMINATOR: i128 = 10_000;

/// shares minted = assets * total_shares / total_assets, 1:1 on first deposit.
/// Rounds down so the vault never mints more shares than assets back them.
pub fn shares_for_assets(assets: i128, total_shares: i128, total_assets: i128) -> Result<i128, Error> {
    if total_shares == 0 || total_assets == 0 {
        return Ok(assets);
    }
    assets
        .checked_mul(total_shares)
        .map(|n| n / total_assets)
        .ok_or(Error::MathOverflow)
}

/// assets returned = shares * total_assets / total_shares. Rounds down.
pub fn assets_for_shares(shares: i128, total_shares: i128, total_assets: i128) -> Result<i128, Error> {
    if total_shares == 0 {
        return Ok(0);
    }
    shares
        .checked_mul(total_assets)
        .map(|n| n / total_shares)
        .ok_or(Error::MathOverflow)
}

/// The drawdown floor a position close must clear:
/// return * 10_000 >= entry * (10_000 - max_drawdown_bps).
pub fn within_drawdown(return_amount: i128, entry_value: i128, max_drawdown_bps: u32) -> Result<bool, Error> {
    let floor_bps = BPS_DENOMINATOR - max_drawdown_bps as i128;
    let lhs = return_amount.checked_mul(BPS_DENOMINATOR).ok_or(Error::MathOverflow)?;
    let rhs = entry_value.checked_mul(floor_bps).ok_or(Error::MathOverflow)?;
    Ok(lhs >= rhs)
}

/// Position-size cap: amount <= total_assets * max_position_size_bps / 10_000.
/// A `max_position_size_bps` of 0 disables the cap.
pub fn within_position_cap(amount: i128, total_assets: i128, max_position_size_bps: u32) -> Result<bool, Error> {
    if max_position_size_bps == 0 {
        return Ok(true);
    }
    let cap = total_assets
        .checked_mul(max_position_size_bps as i128)
        .map(|n| n / BPS_DENOMINATOR)
        .ok_or(Error::MathOverflow)?;
    Ok(amount <= cap)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_deposit_is_one_to_one() {
        assert_eq!(shares_for_assets(1_000, 0, 0).unwrap(), 1_000);
    }

    #[test]
    fn shares_track_pool_ratio() {
        // Pool holds 2000 assets for 1000 shares (2:1). 500 assets -> 250 shares.
        assert_eq!(shares_for_assets(500, 1_000, 2_000).unwrap(), 250);
        assert_eq!(assets_for_shares(250, 1_000, 2_000).unwrap(), 500);
    }

    #[test]
    fn drawdown_floor() {
        // 20% max drawdown: entry 1000, floor is 800.
        assert!(within_drawdown(800, 1_000, 2_000).unwrap());
        assert!(!within_drawdown(799, 1_000, 2_000).unwrap());
        assert!(within_drawdown(1_500, 1_000, 2_000).unwrap()); // profit always ok
    }

    #[test]
    fn position_cap() {
        assert!(within_position_cap(2_500, 10_000, 2_500).unwrap()); // 25% cap, exactly at
        assert!(!within_position_cap(2_501, 10_000, 2_500).unwrap());
        assert!(within_position_cap(i128::MAX / 2, 10_000, 0).unwrap()); // 0 = disabled
    }
}
