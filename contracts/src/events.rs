use soroban_sdk::{Address, Env, Symbol};

use crate::invoice::InvoiceToken;

pub fn emit_invoice_created(env: &Env, invoice: &InvoiceToken) {
    env.events()
        .publish((Symbol::new(env, "invoice_created"),), invoice.clone());
}

pub fn emit_invoice_funded(
    env: &Env,
    invoice_id: u64,
    funder: &Address,
    amount: i128,
    shares: u32,
) {
    env.events().publish(
        (Symbol::new(env, "invoice_funded"), invoice_id),
        (funder.clone(), amount, shares),
    );
}

pub fn emit_shares_purchased(
    env: &Env,
    invoice_id: u64,
    investor: &Address,
    share_count: u32,
    cost: i128,
) {
    env.events().publish(
        (Symbol::new(env, "shares_purchased"), invoice_id),
        (investor.clone(), share_count, cost),
    );
}

pub fn emit_invoice_settled(env: &Env, invoice: &InvoiceToken) {
    env.events()
        .publish((Symbol::new(env, "invoice_settled"), invoice.id), invoice.clone());
}

pub fn emit_distribution(env: &Env, invoice_id: u64, funder: &Address, amount: i128) {
    env.events().publish(
        (Symbol::new(env, "settlement_distributed"), invoice_id),
        (funder.clone(), amount),
    );
}

pub fn emit_invoice_defaulted(env: &Env, invoice: &InvoiceToken) {
    env.events()
        .publish((Symbol::new(env, "invoice_defaulted"), invoice.id), invoice.clone());
}
