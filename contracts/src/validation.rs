use soroban_sdk::{Env, String};

use crate::errors::FactBridgeError;

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