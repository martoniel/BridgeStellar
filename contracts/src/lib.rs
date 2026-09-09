#![no_std]

mod errors;
mod events;
mod invoice;
mod storage;
mod validation;

#[cfg(test)]
mod tests;

use soroban_sdk::{contract, contractimpl, Address, Env, String};

use crate::errors::FactBridgeError;
use crate::events::*;
use crate::invoice::{InvoiceStatus, InvoiceToken};
use crate::storage::*;
use crate::validation::*;

#[contract]
pub struct FactBridge;

#[contractimpl]
impl FactBridge {
    pub fn create_invoice(
        env: Env,
        creator: Address,
        buyer: Address,
        amount: i128,
        denom: String,
        shares_total: u32,
        maturity_date: u64,
        metadata_uri: String,
    ) -> Result<u64, FactBridgeError> {
        validate_positive_amount(amount)?;
        validate_metadata_uri(&env, &metadata_uri)?;
        validate_maturity_date(&env, maturity_date)?;
        validate_share_count(shares_total)?;

        let id = next_invoice_id(&env);
        let now = env.ledger().timestamp();

        let invoice = InvoiceToken {
            id,
            creator,
            buyer,
            amount,
            denom,
            status: InvoiceStatus::Created,
            funded_amount: 0,
            shares_total,
            shares_sold: 0,
            created_at: now,
            maturity_date,
            metadata_uri,
        };

        store_invoice(&env, &invoice);
        append_invoice_id(&env, id);
        emit_invoice_created(&env, &invoice);

        Ok(id)
    }

    pub fn fund_invoice(
        env: Env,
        caller: Address,
        invoice_id: u64,
        amount: i128,
    ) -> Result<InvoiceToken, FactBridgeError> {
        caller.require_auth();
        validate_positive_amount(amount)?;

        let mut invoice = get_invoice(&env, invoice_id)?;

        if invoice.status != InvoiceStatus::Created {
            return Err(FactBridgeError::InvoiceAlreadySettled);
        }

        let remaining = invoice
            .amount
            .checked_sub(invoice.funded_amount)
            .ok_or(FactBridgeError::Overflow)?;

        if amount > remaining {
            return Err(FactBridgeError::InvalidAmount);
        }

        invoice.funded_amount = invoice
            .funded_amount
            .checked_add(amount)
            .ok_or(FactBridgeError::Overflow)?;

        if invoice.funded_amount >= invoice.amount {
            invoice.status = InvoiceStatus::Funded;
        }

        store_invoice(&env, &invoice);
        emit_invoice_funded(&env, &invoice, amount);

        Ok(invoice)
    }

    pub fn purchase_shares(
        env: Env,
        buyer: Address,
        invoice_id: u64,
        share_count: u32,
    ) -> Result<InvoiceToken, FactBridgeError> {
        buyer.require_auth();
        validate_share_count(share_count)?;

        let mut invoice = get_invoice(&env, invoice_id)?;

        if invoice.creator == buyer {
            return Err(FactBridgeError::NotBuyer);
        }

        let available = invoice
            .shares_total
            .checked_sub(invoice.shares_sold)
            .ok_or(FactBridgeError::Overflow)?;

        if share_count > available {
            return Err(FactBridgeError::SharesExhausted);
        }

        invoice.shares_sold = invoice
            .shares_sold
            .checked_add(share_count)
            .ok_or(FactBridgeError::Overflow)?;

        store_invoice(&env, &invoice);
        emit_shares_purchased(&env, &invoice, share_count);

        Ok(invoice)
    }

    pub fn settle_invoice(
        env: Env,
        caller: Address,
        invoice_id: u64,
    ) -> Result<InvoiceToken, FactBridgeError> {
        caller.require_auth();

        let mut invoice = get_invoice(&env, invoice_id)?;

        if caller != invoice.buyer {
            return Err(FactBridgeError::NotBuyer);
        }

        if invoice.status == InvoiceStatus::Settled {
            return Err(FactBridgeError::InvoiceAlreadySettled);
        }

        let now = env.ledger().timestamp();
        if now < invoice.maturity_date {
            return Err(FactBridgeError::MaturityNotReached);
        }

        invoice.status = InvoiceStatus::Settled;
        store_invoice(&env, &invoice);
        emit_invoice_settled(&env, &invoice);

        Ok(invoice)
    }

    pub fn default_invoice(
        env: Env,
        invoice_id: u64,
    ) -> Result<InvoiceToken, FactBridgeError> {
        let mut invoice = get_invoice(&env, invoice_id)?;

        if invoice.status == InvoiceStatus::Defaulted {
            return Err(FactBridgeError::InvoiceAlreadyDefaulted);
        }

        if invoice.status == InvoiceStatus::Settled {
            return Err(FactBridgeError::InvoiceAlreadySettled);
        }

        let now = env.ledger().timestamp();
        if now < invoice.maturity_date {
            return Err(FactBridgeError::MaturityNotReached);
        }

        invoice.status = InvoiceStatus::Defaulted;
        store_invoice(&env, &invoice);
        emit_invoice_defaulted(&env, &invoice);

        Ok(invoice)
    }

    pub fn get_invoice(
        env: Env,
        invoice_id: u64,
    ) -> Result<InvoiceToken, FactBridgeError> {
        get_invoice(&env, invoice_id)
    }
}