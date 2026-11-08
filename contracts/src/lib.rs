#![no_std]

mod errors;
mod events;
mod invoice;
mod storage;
mod validation;

#[cfg(test)]
mod tests;

use soroban_sdk::token::TokenClient;
use soroban_sdk::{contract, contractimpl, Address, Env, MuxedAddress, String};

use crate::errors::FactBridgeError;
use crate::events::*;
use crate::invoice::{InvoiceStatus, InvoiceToken, Position};
use crate::storage::*;
use crate::validation::*;

/// Buyers get 7 days after maturity before the invoice can be declared in
/// default. This gives them a window to settle before funders can act.
pub const DEFAULT_GRACE_PERIOD: u64 = 7 * 24 * 60 * 60;

/// Bounds the settlement distribution loop so a single transaction cannot run
/// out of budget. Additional funders are rejected at funding time.
pub const MAX_FUNDERS: u32 = 100;

#[contract]
pub struct FactBridge;

#[contractimpl]
impl FactBridge {
    /// Tokenize an invoice. The creator must authorize the call so nobody can
    /// mint an invoice against someone else's address.
    pub fn create_invoice(
        env: Env,
        creator: Address,
        buyer: Address,
        token: Address,
        amount: i128,
        denom: String,
        shares_total: u32,
        maturity_date: u64,
        metadata_uri: String,
        discount_bps: u32,
    ) -> Result<u64, FactBridgeError> {
        creator.require_auth();

        validate_positive_amount(amount)?;
        validate_metadata_uri(&env, &metadata_uri)?;
        validate_maturity_date(&env, maturity_date)?;
        validate_share_count(shares_total)?;
        validate_discount_bps(discount_bps)?;
        validate_distinct_parties(&creator, &buyer)?;

        let funding_target = funding_target(amount, discount_bps)?;
        let id = next_invoice_id(&env);
        let now = env.ledger().timestamp();

        let invoice = InvoiceToken {
            id,
            creator,
            buyer,
            token,
            amount,
            denom,
            discount_bps,
            status: InvoiceStatus::Created,
            funded_amount: 0,
            funding_target,
            shares_total,
            shares_sold: 0,
            created_at: now,
            maturity_date,
            metadata_uri,
        };

        store_invoice(&env, &invoice);
        append_invoice_id(&env, id);
        emit_invoice_created(&env, &invoice);
        bump_instance(&env);

        Ok(id)
    }

    /// Escrow `amount` of the invoice token from `funder` into the contract and
    /// allocate shares pro-rata to the contribution.
    pub fn fund_invoice(
        env: Env,
        funder: Address,
        invoice_id: u64,
        amount: i128,
    ) -> Result<InvoiceToken, FactBridgeError> {
        funder.require_auth();
        validate_positive_amount(amount)?;

        let mut invoice = get_invoice(&env, invoice_id)?;

        if invoice.status != InvoiceStatus::Created {
            return Err(FactBridgeError::InvoiceNotFundable);
        }

        let remaining = invoice
            .funding_target
            .checked_sub(invoice.funded_amount)
            .ok_or(FactBridgeError::Overflow)?;

        if amount > remaining {
            return Err(FactBridgeError::InvalidAmount);
        }

        // The final contribution takes all remaining shares so rounding dust
        // never leaves the invoice one share short of fully funded.
        let shares = if amount == remaining {
            invoice
                .shares_total
                .checked_sub(invoice.shares_sold)
                .ok_or(FactBridgeError::Overflow)?
        } else {
            proportional_shares(amount, invoice.funding_target, invoice.shares_total)?
        };

        credit_funding(&env, &mut invoice, &funder, amount, shares)?;
        store_invoice(&env, &invoice);
        emit_invoice_funded(&env, invoice.id, &funder, amount, shares);

        // Interaction last: transfer reverts the whole invocation on failure.
        // The SME receives working capital immediately; the contract only holds
        // funds during the buyer's settlement transaction.
        transfer_token(
            &env,
            &invoice.token,
            &funder,
            &invoice.creator,
            amount,
        );

        bump_instance(&env);
        Ok(invoice)
    }

    /// Buy a specific number of shares. The buyer pays the proportional
    /// principal for those shares, which is escrowed exactly like funding.
    pub fn purchase_shares(
        env: Env,
        investor: Address,
        invoice_id: u64,
        share_count: u32,
    ) -> Result<InvoiceToken, FactBridgeError> {
        investor.require_auth();
        validate_share_count(share_count)?;

        let mut invoice = get_invoice(&env, invoice_id)?;

        if invoice.status != InvoiceStatus::Created {
            return Err(FactBridgeError::InvoiceNotFundable);
        }
        if invoice.creator == investor {
            return Err(FactBridgeError::NotBuyer);
        }

        let available = invoice
            .shares_total
            .checked_sub(invoice.shares_sold)
            .ok_or(FactBridgeError::Overflow)?;

        if share_count > available {
            return Err(FactBridgeError::SharesExhausted);
        }

        let remaining = invoice
            .funding_target
            .checked_sub(invoice.funded_amount)
            .ok_or(FactBridgeError::Overflow)?;

        let cost = if share_count == available {
            // Last buyer absorbs rounding so the target is hit exactly.
            remaining
        } else {
            proportional_cost(share_count, invoice.funding_target, invoice.shares_total)?
        };

        if cost <= 0 || cost > remaining {
            return Err(FactBridgeError::InvalidAmount);
        }

        credit_funding(&env, &mut invoice, &investor, cost, share_count)?;
        store_invoice(&env, &invoice);
        emit_shares_purchased(&env, invoice.id, &investor, share_count, cost);

        transfer_token(
            &env,
            &invoice.token,
            &investor,
            &invoice.creator,
            cost,
        );

        bump_instance(&env);
        Ok(invoice)
    }

    /// Buyer pays the invoice face value; the contract distributes the proceeds
    /// to funders pro-rata to their contribution.
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
        if invoice.status != InvoiceStatus::Funded {
            return Err(FactBridgeError::NotFullyFunded);
        }

        let now = env.ledger().timestamp();
        if now < invoice.maturity_date {
            return Err(FactBridgeError::MaturityNotReached);
        }

        // Mark settled before the external token calls (checks-effects-interactions).
        invoice.status = InvoiceStatus::Settled;
        store_invoice(&env, &invoice);

        let contract = env.current_contract_address();
        let funders = get_funders(&env, invoice_id);

        // Buyer pays the face value into escrow.
        transfer_token(&env, &invoice.token, &caller, &contract, invoice.amount);

        // Distribute face value pro-rata. The last funder receives the
        // remainder so the sum of payouts always equals the amount paid.
        let mut distributed: i128 = 0;
        let last_index = funders.len().saturating_sub(1) as usize;
        for (index, funder) in funders.iter().enumerate() {
            let position = get_position(&env, invoice_id, &funder);
            let payout = if index == last_index {
                invoice.amount - distributed
            } else {
                invoice
                    .amount
                    .checked_mul(position.contributed)
                    .ok_or(FactBridgeError::Overflow)?
                    / invoice.funded_amount
            };

            if payout > 0 {
                distributed = distributed
                    .checked_add(payout)
                    .ok_or(FactBridgeError::Overflow)?;
                transfer_token(&env, &invoice.token, &contract, &funder, payout);
                emit_distribution(&env, invoice_id, &funder, payout);
            }
        }

        emit_invoice_settled(&env, &invoice);
        bump_instance(&env);

        Ok(invoice)
    }

    /// Anyone may flag an invoice as defaulted once the grace period after
    /// maturity has elapsed. The caller must still authorize the invocation.
    pub fn default_invoice(
        env: Env,
        caller: Address,
        invoice_id: u64,
    ) -> Result<InvoiceToken, FactBridgeError> {
        caller.require_auth();

        let mut invoice = get_invoice(&env, invoice_id)?;

        if invoice.status == InvoiceStatus::Defaulted {
            return Err(FactBridgeError::InvoiceAlreadyDefaulted);
        }
        if invoice.status == InvoiceStatus::Settled {
            return Err(FactBridgeError::InvoiceAlreadySettled);
        }

        let now = env.ledger().timestamp();
        let deadline = invoice
            .maturity_date
            .checked_add(DEFAULT_GRACE_PERIOD)
            .ok_or(FactBridgeError::Overflow)?;
        if now < deadline {
            return Err(FactBridgeError::GracePeriodActive);
        }

        invoice.status = InvoiceStatus::Defaulted;
        store_invoice(&env, &invoice);
        emit_invoice_defaulted(&env, &invoice);
        bump_instance(&env);

        Ok(invoice)
    }

    pub fn get_invoice(
        env: Env,
        invoice_id: u64,
    ) -> Result<InvoiceToken, FactBridgeError> {
        get_invoice(&env, invoice_id)
    }

    pub fn get_position(env: Env, invoice_id: u64, funder: Address) -> Position {
        get_position(&env, invoice_id, &funder)
    }

    pub fn get_funders(env: Env, invoice_id: u64) -> soroban_sdk::Vec<Address> {
        get_funders(&env, invoice_id)
    }

    pub fn get_invoice_list(env: Env) -> soroban_sdk::Vec<u64> {
        get_invoice_list(&env)
    }

    pub fn get_invoice_count(env: Env) -> u64 {
        get_invoice_count(&env)
    }
}

/// Apply a funding contribution to the invoice and the funder's position.
fn credit_funding(
    env: &Env,
    invoice: &mut InvoiceToken,
    funder: &Address,
    amount: i128,
    shares: u32,
) -> Result<(), FactBridgeError> {
    let mut position = get_position(env, invoice.id, funder);
    let is_new_funder = position.contributed == 0;

    if is_new_funder && get_funders(env, invoice.id).len() >= MAX_FUNDERS {
        return Err(FactBridgeError::TooManyFunders);
    }

    position.contributed = position
        .contributed
        .checked_add(amount)
        .ok_or(FactBridgeError::Overflow)?;
    position.shares = position
        .shares
        .checked_add(shares)
        .ok_or(FactBridgeError::Overflow)?;

    invoice.funded_amount = invoice
        .funded_amount
        .checked_add(amount)
        .ok_or(FactBridgeError::Overflow)?;
    invoice.shares_sold = invoice
        .shares_sold
        .checked_add(shares)
        .ok_or(FactBridgeError::Overflow)?;

    if invoice.funded_amount == invoice.funding_target {
        invoice.status = InvoiceStatus::Funded;
    }

    if is_new_funder {
        append_funder(env, invoice.id, funder);
    }
    store_position(env, invoice.id, funder, &position);
    Ok(())
}

fn proportional_shares(
    amount: i128,
    funding_target: i128,
    shares_total: u32,
) -> Result<u32, FactBridgeError> {
    let shares = amount
        .checked_mul(i128::from(shares_total))
        .ok_or(FactBridgeError::Overflow)?
        / funding_target;
    if shares <= 0 {
        return Err(FactBridgeError::InvalidAmount);
    }
    u32::try_from(shares).map_err(|_| FactBridgeError::Overflow)
}

/// Cost of `share_count` shares, rounded up so the protocol never under-charges.
fn proportional_cost(
    share_count: u32,
    funding_target: i128,
    shares_total: u32,
) -> Result<i128, FactBridgeError> {
    let numerator = i128::from(share_count)
        .checked_mul(funding_target)
        .ok_or(FactBridgeError::Overflow)?;
    let denominator = i128::from(shares_total);
    Ok((numerator + denominator - 1) / denominator)
}

fn transfer_token(
    env: &Env,
    token_address: &Address,
    from: &Address,
    to: &Address,
    amount: i128,
) {
    let client = TokenClient::new(env, token_address);
    client.transfer(from, &MuxedAddress::from(to.clone()), &amount);
}
