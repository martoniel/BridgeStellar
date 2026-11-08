use soroban_sdk::{contracttype, Address, Env, Vec};

use crate::errors::FactBridgeError;
use crate::invoice::{InvoiceToken, Position};

/// Ledgers are ~5 seconds, so 518_400 ledgers is roughly 30 days.
pub const TTL_THRESHOLD: u32 = 518_400;
/// Extend persistent entries to roughly 90 days when they are touched.
pub const TTL_EXTEND_TO: u32 = 1_555_200;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Invoice(u64),
    InvoiceCount,
    InvoiceList,
    Position(u64, Address),
    Funders(u64),
}

/// Persistent storage entries expire. Every read and write bumps the entry so
/// invoice and position data stays live for the life of the protocol.
fn bump(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

/// Keep the contract instance (and its code) alive whenever it is used.
pub fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn next_invoice_id(env: &Env) -> u64 {
    let count: u64 = env
        .storage()
        .persistent()
        .get(&DataKey::InvoiceCount)
        .unwrap_or(0);
    let next = count + 1;
    env.storage()
        .persistent()
        .set(&DataKey::InvoiceCount, &next);
    bump(env, &DataKey::InvoiceCount);
    next
}

pub fn get_invoice_count(env: &Env) -> u64 {
    env.storage()
        .persistent()
        .get(&DataKey::InvoiceCount)
        .unwrap_or(0)
}

pub fn get_invoice(env: &Env, id: u64) -> Result<InvoiceToken, FactBridgeError> {
    let key = DataKey::Invoice(id);
    let invoice: InvoiceToken = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(FactBridgeError::NotFound)?;
    bump(env, &key);
    Ok(invoice)
}

pub fn store_invoice(env: &Env, invoice: &InvoiceToken) {
    let key = DataKey::Invoice(invoice.id);
    env.storage().persistent().set(&key, invoice);
    bump(env, &key);
}

pub fn append_invoice_id(env: &Env, id: u64) {
    let key = DataKey::InvoiceList;
    let mut list: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));
    list.push_back(id);
    env.storage().persistent().set(&key, &list);
    bump(env, &key);
}

pub fn get_invoice_list(env: &Env) -> Vec<u64> {
    let key = DataKey::InvoiceList;
    let list = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));
    if env.storage().persistent().has(&key) {
        bump(env, &key);
    }
    list
}

/// Returns the funder's position, or a zeroed position if they never funded.
pub fn get_position(env: &Env, invoice_id: u64, funder: &Address) -> Position {
    let key = DataKey::Position(invoice_id, funder.clone());
    match env.storage().persistent().get::<DataKey, Position>(&key) {
        Some(position) => {
            bump(env, &key);
            position
        }
        None => Position {
            contributed: 0,
            shares: 0,
        },
    }
}

pub fn store_position(env: &Env, invoice_id: u64, funder: &Address, position: &Position) {
    let key = DataKey::Position(invoice_id, funder.clone());
    env.storage().persistent().set(&key, position);
    bump(env, &key);
}

pub fn get_funders(env: &Env, invoice_id: u64) -> Vec<Address> {
    let key = DataKey::Funders(invoice_id);
    let funders = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));
    if env.storage().persistent().has(&key) {
        bump(env, &key);
    }
    funders
}

pub fn append_funder(env: &Env, invoice_id: u64, funder: &Address) {
    let key = DataKey::Funders(invoice_id);
    let mut funders: Vec<Address> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(Vec::new(env));
    funders.push_back(funder.clone());
    env.storage().persistent().set(&key, &funders);
    bump(env, &key);
}
