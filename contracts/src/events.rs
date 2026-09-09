use soroban_sdk::{Env, Symbol};

use crate::invoice::InvoiceToken;

pub fn emit_invoice_created(env: &Env, invoice: &InvoiceToken) {
    env.events()
        .publish((Symbol::new(env, "invoice_created"),), invoice.clone());
}

pub fn emit_invoice_funded(env: &Env, invoice: &InvoiceToken, amount: i128) {
    env.events().publish(
        (Symbol::new(env, "invoice_funded"),),
        (invoice.id, amount),
    );
}

pub fn emit_invoice_settled(env: &Env, invoice: &InvoiceToken) {
    env.events()
        .publish((Symbol::new(env, "invoice_settled"),), invoice.clone());
}

pub fn emit_invoice_defaulted(env: &Env, invoice: &InvoiceToken) {
    env.events()
        .publish((Symbol::new(env, "invoice_defaulted"),), invoice.clone());
}

pub fn emit_shares_purchased(env: &Env, invoice: &InvoiceToken, share_count: u32) {
    env.events().publish(
        (Symbol::new(env, "shares_purchased"),),
        (invoice.id, share_count),
    );
}