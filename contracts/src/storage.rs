use soroban_sdk::{contracttype, Env, Vec};

use crate::errors::FactBridgeError;
use crate::invoice::InvoiceToken;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Invoice(u64),
    InvoiceCount,
    InvoiceList,
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
    next
}

pub fn get_invoice(env: &Env, id: u64) -> Result<InvoiceToken, FactBridgeError> {
    env.storage()
        .persistent()
        .get(&DataKey::Invoice(id))
        .ok_or(FactBridgeError::NotFound)
}

pub fn store_invoice(env: &Env, invoice: &InvoiceToken) {
    env.storage()
        .persistent()
        .set(&DataKey::Invoice(invoice.id), invoice);
}

pub fn delete_invoice(env: &Env, id: u64) -> Result<(), FactBridgeError> {
    if !env.storage().persistent().has(&DataKey::Invoice(id)) {
        return Err(FactBridgeError::NotFound);
    }
    env.storage().persistent().remove(&DataKey::Invoice(id));
    Ok(())
}

pub fn append_invoice_id(env: &Env, id: u64) {
    let mut list: Vec<u64> = env
        .storage()
        .persistent()
        .get(&DataKey::InvoiceList)
        .unwrap_or(Vec::new(env));
    list.push_back(id);
    env.storage()
        .persistent()
        .set(&DataKey::InvoiceList, &list);
}

pub fn get_invoice_list(env: &Env) -> Vec<u64> {
    env.storage()
        .persistent()
        .get(&DataKey::InvoiceList)
        .unwrap_or(Vec::new(env))
}

pub fn increment_shares(
    env: &Env,
    id: u64,
    amount: u32,
) -> Result<InvoiceToken, FactBridgeError> {
    let mut invoice = get_invoice(env, id)?;
    invoice.shares_sold = invoice
        .shares_sold
        .checked_add(amount)
        .ok_or(FactBridgeError::Overflow)?;
    store_invoice(env, &invoice);
    Ok(invoice)
}