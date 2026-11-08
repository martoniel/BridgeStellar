use soroban_sdk::{contracttype, Address, String};

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Debug)]
#[contracttype]
pub enum InvoiceStatus {
    Created = 0,
    Funded = 1,
    Settled = 2,
    Defaulted = 3,
    Disputed = 4,
}

/// On-chain representation of a tokenized invoice.
///
/// `amount` is the face value the buyer owes at maturity. Liquidity providers
/// fund the invoice at a discount (`discount_bps`), so the principal they must
/// contribute is `funding_target`. The difference between `amount` and
/// `funding_target` is the yield distributed to funders on settlement.
#[derive(Clone)]
#[contracttype]
pub struct InvoiceToken {
    pub id: u64,
    pub creator: Address,
    pub buyer: Address,
    /// SEP-41 token contract (Stellar Asset Contract) used for funding and settlement.
    pub token: Address,
    /// Face value owed by the buyer at maturity.
    pub amount: i128,
    pub denom: String,
    /// Discount applied to the face value, in basis points (500 = 5%).
    pub discount_bps: u32,
    pub status: InvoiceStatus,
    /// Principal escrowed by liquidity providers.
    pub funded_amount: i128,
    /// Principal required to fully fund the invoice.
    pub funding_target: i128,
    pub shares_total: u32,
    pub shares_sold: u32,
    pub created_at: u64,
    pub maturity_date: u64,
    pub metadata_uri: String,
}

/// A liquidity provider's position in a single invoice.
#[derive(Clone)]
#[contracttype]
pub struct Position {
    /// Principal contributed, denominated in the invoice token.
    pub contributed: i128,
    /// Shares allocated for that contribution.
    pub shares: u32,
}
