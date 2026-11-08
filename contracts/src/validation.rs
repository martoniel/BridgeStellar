use soroban_sdk::{Env, String};

use crate::errors::FactBridgeError;

/// Maximum discount: 9,999 bps (99.99%). A 10,000 bps discount would mean the
/// invoice can be funded for zero principal, which is never valid.
pub const MAX_DISCOUNT_BPS: u32 = 9_999;
pub const BPS_DENOMINATOR: u32 = 10_000;

pub fn validate_positive_amount(amount: i128) -> Result<(), FactBridgeError> {
    if amount <= 0 {
        return Err(FactBridgeError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_metadata_uri(_env: &Env, uri: &String) -> Result<(), FactBridgeError> {
    if uri.len() == 0 {
        return Err(FactBridgeError::InvalidMetadata);
    }
    Ok(())
}

pub fn validate_maturity_date(env: &Env, maturity_date: u64) -> Result<(), FactBridgeError> {
    let now = env.ledger().timestamp();
    if maturity_date <= now {
        return Err(FactBridgeError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_share_count(count: u32) -> Result<(), FactBridgeError> {
    if count == 0 {
        return Err(FactBridgeError::InvalidAmount);
    }
    Ok(())
}

pub fn validate_discount_bps(discount_bps: u32) -> Result<(), FactBridgeError> {
    if discount_bps > MAX_DISCOUNT_BPS {
        return Err(FactBridgeError::InvalidDiscount);
    }
    Ok(())
}

/// The invoice creator and the buyer cannot be the same party.
pub fn validate_distinct_parties(
    creator: &soroban_sdk::Address,
    buyer: &soroban_sdk::Address,
) -> Result<(), FactBridgeError> {
    if creator == buyer {
        return Err(FactBridgeError::InvalidParties);
    }
    Ok(())
}

/// Principal required to fund an invoice with the given face value and discount.
pub fn funding_target(amount: i128, discount_bps: u32) -> Result<i128, FactBridgeError> {
    let bps = i128::from(BPS_DENOMINATOR - discount_bps);
    let target = amount
        .checked_mul(bps)
        .ok_or(FactBridgeError::Overflow)?
        / i128::from(BPS_DENOMINATOR);
    if target <= 0 {
        return Err(FactBridgeError::InvalidAmount);
    }
    Ok(target)
}
